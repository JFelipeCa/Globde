"""Rutas del catalogo de servicios y del catalogo de cortes."""

from fastapi import APIRouter, Query, status

from app.core.dependencies import DatosPeticion, SoloAdmin
from app.core.exceptions import Conflicto
from app.schemas.comunes import CategoriaServicio, MensajeRespuesta
from app.schemas.operaciones import ServicioCreate, ServicioOut, ServicioUpdate
from app.services import servicios_service
from app.services.auditoria_service import Accion, registrar_auditoria

router = APIRouter(prefix="/servicios", tags=["Servicios"])


@router.get("", response_model=list[ServicioOut], summary="Listar servicios")
def listar(
    categoria: CategoriaServicio | None = Query(
        default=None, description="Cortes, Barba, Combos, Tratamientos, Infantil"
    ),
    activo: bool | None = True,
    popular: bool | None = None,
    buscar: str | None = None,
    id_barbero: int | None = Query(default=None, description="Solo los que presta ese barbero"),
):
    return servicios_service.listar(categoria, activo, popular, buscar, id_barbero)


@router.get("/categorias", response_model=list[dict], summary="Categorias con conteo")
def categorias():
    return servicios_service.listar_categorias()


@router.get("/catalogo-cortes", response_model=list[dict], summary="Catalogo de cortes")
def catalogo_cortes(categoria: str | None = None, solo_activos: bool = True):
    return servicios_service.listar_catalogo_cortes(categoria, solo_activos)


@router.get("/{id_servicio}", response_model=ServicioOut, summary="Detalle de un servicio")
def obtener(id_servicio: int):
    return servicios_service.obtener(id_servicio)


@router.get(
    "/{id_servicio}/barberos", response_model=list[dict], summary="Barberos que lo prestan"
)
def barberos(id_servicio: int):
    return servicios_service.barberos_del_servicio(id_servicio)


@router.post(
    "",
    response_model=ServicioOut,
    status_code=status.HTTP_201_CREATED,
    summary="Crear un servicio",
)
def crear(datos: ServicioCreate, admin: SoloAdmin, contexto: DatosPeticion):
    if servicios_service.existe_nombre(datos.nombre):
        raise Conflicto("Ya existe un servicio con ese nombre")

    servicio = servicios_service.crear(datos.model_dump())
    registrar_auditoria(
        Accion.SERVICIO_CREADO, "servicios", int(servicio["id_servicio"]), admin.id_usuario,
        contexto.get("ip"), contexto.get("user_agent"), {"nombre": datos.nombre},
    )
    return servicio


@router.put("/{id_servicio}", response_model=ServicioOut, summary="Actualizar un servicio")
def actualizar(
    id_servicio: int, datos: ServicioUpdate, admin: SoloAdmin, contexto: DatosPeticion
):
    payload = datos.model_dump(exclude_none=True)
    if payload.get("nombre") and servicios_service.existe_nombre(payload["nombre"], id_servicio):
        raise Conflicto("Ya existe otro servicio con ese nombre")

    servicio = servicios_service.actualizar(id_servicio, payload)
    registrar_auditoria(
        Accion.SERVICIO_ACTUALIZADO, "servicios", id_servicio, admin.id_usuario,
        contexto.get("ip"), contexto.get("user_agent"), payload,
    )
    return servicio


@router.patch(
    "/{id_servicio}/estado", response_model=ServicioOut, summary="Activar o desactivar"
)
def cambiar_estado(id_servicio: int, activo: bool, admin: SoloAdmin, contexto: DatosPeticion):
    servicio = servicios_service.cambiar_estado(id_servicio, activo)
    registrar_auditoria(
        Accion.SERVICIO_ACTUALIZADO if activo else Accion.SERVICIO_DESACTIVADO,
        "servicios", id_servicio, admin.id_usuario,
        contexto.get("ip"), contexto.get("user_agent"), {"activo": activo},
    )
    return servicio


@router.delete("/{id_servicio}", response_model=MensajeRespuesta, summary="Eliminar o desactivar")
def eliminar(id_servicio: int, admin: SoloAdmin, contexto: DatosPeticion):
    servicios_service.eliminar(id_servicio)
    registrar_auditoria(
        Accion.SERVICIO_DESACTIVADO, "servicios", id_servicio, admin.id_usuario,
        contexto.get("ip"), contexto.get("user_agent"),
    )
    return {"mensaje": "Servicio desactivado correctamente"}
