"""Rutas de resenas: publicacion, moderacion y resumen por barbero."""

from fastapi import APIRouter, Query, status

from app.core.dependencies import DatosPeticion, SoloAdmin, UsuarioAuth, UsuarioOpcional
from app.core.exceptions import Prohibido
from app.schemas.comunes import MensajeRespuesta, RespuestaPaginada
from app.schemas.operaciones import ResenaCreate, ResenaOut
from app.services import resenas_service
from app.services.auditoria_service import Accion, registrar_auditoria
from app.utils.paginacion import offset_de, paginar

router = APIRouter(prefix="/resenas", tags=["Resenas"])


@router.get("", response_model=RespuestaPaginada[ResenaOut], summary="Listar resenas")
def listar(
    usuario: UsuarioOpcional,
    id_barbero: int | None = None,
    id_cliente: int | None = None,
    calificacion: int | None = Query(default=None, ge=1, le=5),
    visible: bool | None = Query(default=None, description="Solo admin puede pedir ocultas"),
    pagina: int = Query(default=1, ge=1),
    por_pagina: int = Query(default=20, ge=1, le=100),
):
    es_admin = usuario is not None and usuario.es_admin
    filtros: dict = {
        "id_barbero": id_barbero,
        "id_cliente": id_cliente,
        "calificacion": calificacion,
        "visible": visible if es_admin else True,
    }
    filtros = {k: v for k, v in filtros.items() if v is not None}

    offset = offset_de(pagina, por_pagina)
    items = resenas_service.listar(limite=por_pagina, offset=offset, **filtros)
    total = resenas_service.contar(**filtros)
    return paginar(items, total, pagina, por_pagina)


@router.get("/pendientes", response_model=list[dict], summary="Citas que puedo resenar")
def pendientes(usuario: UsuarioAuth):
    if usuario.id_cliente is None:
        raise Prohibido("Solo los clientes tienen resenas pendientes")
    return resenas_service.citas_pendientes_de_resena(usuario.id_cliente)


@router.get("/barbero/{id_barbero}/resumen", response_model=dict, summary="Resumen de un barbero")
def resumen(id_barbero: int):
    return resenas_service.resumen_barbero(id_barbero)


@router.get("/cita/{id_cita}", response_model=ResenaOut, summary="Resena de una cita")
def por_cita(id_cita: int):
    return resenas_service.obtener_por_cita(id_cita)


@router.get("/{id_resena}", response_model=ResenaOut, summary="Detalle de una resena")
def obtener(id_resena: int):
    return resenas_service.obtener(id_resena)


@router.post(
    "", response_model=ResenaOut, status_code=status.HTTP_201_CREATED, summary="Publicar resena"
)
def crear(datos: ResenaCreate, usuario: UsuarioAuth, contexto: DatosPeticion):
    if usuario.id_cliente is None:
        raise Prohibido("Solo un cliente puede publicar resenas")
    return resenas_service.crear(datos.model_dump(), usuario, contexto)


@router.put("/{id_resena}", response_model=ResenaOut, summary="Editar mi resena")
def actualizar(
    id_resena: int, datos: ResenaCreate, usuario: UsuarioAuth, contexto: DatosPeticion
):
    payload = datos.model_dump(exclude={"id_cita"})
    resena = resenas_service.actualizar(id_resena, payload, usuario)
    registrar_auditoria(
        Accion.RESENA_ACTUALIZADA, "resenas", id_resena, usuario.id_usuario,
        contexto.get("ip"), contexto.get("user_agent"),
    )
    return resena


@router.patch(
    "/{id_resena}/visibilidad", response_model=ResenaOut, summary="Mostrar u ocultar (moderacion)"
)
def visibilidad(id_resena: int, visible: bool, admin: SoloAdmin, contexto: DatosPeticion):
    resena = resenas_service.cambiar_visibilidad(id_resena, visible, admin)
    registrar_auditoria(
        Accion.RESENA_OCULTADA, "resenas", id_resena, admin.id_usuario,
        contexto.get("ip"), contexto.get("user_agent"), {"visible": visible},
    )
    return resena


@router.delete("/{id_resena}", response_model=MensajeRespuesta, summary="Eliminar una resena")
def eliminar(id_resena: int, admin: SoloAdmin, contexto: DatosPeticion):
    resenas_service.eliminar(id_resena)
    registrar_auditoria(
        Accion.RESENA_ELIMINADA, "resenas", id_resena, admin.id_usuario,
        contexto.get("ip"), contexto.get("user_agent"),
    )
    return {"mensaje": "Resena eliminada correctamente"}
