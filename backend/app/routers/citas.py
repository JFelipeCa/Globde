"""Rutas de citas: agendamiento, consulta filtrada, cambios de estado y slots."""

from datetime import date

from fastapi import APIRouter, Query, status

from app.core.dependencies import AdminOBarbero, DatosPeticion, UsuarioAuth
from app.core.exceptions import Prohibido
from app.schemas.comunes import EstadoCita, RespuestaPaginada
from app.schemas.operaciones import (
    CitaCancelar,
    CitaCreate,
    CitaEstadoUpdate,
    CitaOut,
    CitaUpdate,
    DisponibilidadOut,
)
from app.services import citas_service
from app.utils.paginacion import offset_de, paginar

router = APIRouter(prefix="/citas", tags=["Citas"])


def _filtros_segun_rol(usuario, id_cliente: int | None, id_barbero: int | None) -> dict:
    """Fuerza el alcance de la consulta al ambito del rol que pregunta."""
    if usuario.es_cliente:
        if id_cliente is not None and id_cliente != usuario.id_cliente:
            raise Prohibido("Solo puedes consultar tus propias citas")
        return {"id_cliente": usuario.id_cliente}
    if usuario.es_barbero:
        if id_barbero is not None and id_barbero != usuario.id_barbero:
            raise Prohibido("Solo puedes consultar tu propia agenda")
        return {"id_barbero": usuario.id_barbero, "id_cliente": id_cliente}
    return {"id_cliente": id_cliente, "id_barbero": id_barbero}


@router.get("", response_model=RespuestaPaginada[CitaOut], summary="Listar citas")
def listar(
    usuario: UsuarioAuth,
    id_cliente: int | None = None,
    id_barbero: int | None = None,
    id_servicio: int | None = None,
    estado: EstadoCita | None = None,
    fecha: date | None = Query(default=None, description="Fecha exacta YYYY-MM-DD"),
    desde: date | None = Query(default=None, description="Desde YYYY-MM-DD"),
    hasta: date | None = Query(default=None, description="Hasta YYYY-MM-DD"),
    buscar: str | None = Query(default=None, description="Codigo de reserva, cliente o correo"),
    orden: str = Query(default="desc", pattern="^(asc|desc)$"),
    pagina: int = Query(default=1, ge=1),
    por_pagina: int = Query(default=20, ge=1, le=100),
):
    filtros = _filtros_segun_rol(usuario, id_cliente, id_barbero)
    filtros.update(
        id_servicio=id_servicio, estado=estado, fecha=fecha,
        desde=desde, hasta=hasta, buscar=buscar,
    )
    filtros = {k: v for k, v in filtros.items() if v is not None}

    offset = offset_de(pagina, por_pagina)
    items = citas_service.listar(limite=por_pagina, offset=offset, orden=orden, **filtros)
    total = citas_service.contar(**filtros)
    return paginar(items, total, pagina, por_pagina)


@router.get("/mias", response_model=list[CitaOut], summary="Mis proximas citas")
def mias(usuario: UsuarioAuth, limite: int = Query(default=5, ge=1, le=50)):
    if usuario.es_cliente and usuario.id_cliente:
        return citas_service.proximas_del_cliente(usuario.id_cliente, limite)
    if usuario.es_barbero and usuario.id_barbero:
        return citas_service.listar(
            limite=limite, offset=0, orden="asc",
            id_barbero=usuario.id_barbero, estado="confirmada",
        )
    return citas_service.listar(limite=limite, offset=0, orden="asc")


@router.get(
    "/disponibilidad", response_model=DisponibilidadOut, summary="Slots libres de un barbero"
)
def disponibilidad(
    id_barbero: int,
    fecha: date = Query(description="Fecha YYYY-MM-DD"),
    id_servicio: int | None = None,
    paso: int | None = Query(default=None, ge=5, le=120),
):
    return citas_service.calcular_disponibilidad(id_barbero, fecha, id_servicio, paso)


@router.get("/codigo/{codigo}", response_model=CitaOut, summary="Buscar por codigo de reserva")
def por_codigo(codigo: str, usuario: UsuarioAuth):
    cita = citas_service.obtener_por_codigo(codigo)
    _verificar_lectura(cita, usuario)
    return cita


@router.get("/{id_cita}", response_model=CitaOut, summary="Detalle de una cita")
def obtener(id_cita: int, usuario: UsuarioAuth):
    cita = citas_service.obtener(id_cita)
    _verificar_lectura(cita, usuario)
    return cita


def _verificar_lectura(cita: dict, usuario) -> None:
    if usuario.es_admin:
        return
    if usuario.es_cliente and int(cita["id_cliente"]) != int(usuario.id_cliente or -1):
        raise Prohibido("Esta cita no te pertenece")
    if usuario.es_barbero and int(cita["id_barbero"]) != int(usuario.id_barbero or -1):
        raise Prohibido("Esta cita no esta asignada a ti")


@router.post(
    "", response_model=CitaOut, status_code=status.HTTP_201_CREATED, summary="Agendar una cita"
)
def crear(datos: CitaCreate, usuario: UsuarioAuth, contexto: DatosPeticion):
    return citas_service.crear(datos.model_dump(mode="json", exclude_none=True), usuario, contexto)


@router.put("/{id_cita}", response_model=CitaOut, summary="Reprogramar o editar una cita")
def actualizar(
    id_cita: int, datos: CitaUpdate, usuario: UsuarioAuth, contexto: DatosPeticion
):
    payload = datos.model_dump(mode="json", exclude_none=True)
    return citas_service.actualizar(id_cita, payload, usuario, contexto)


@router.patch("/{id_cita}/estado", response_model=CitaOut, summary="Cambiar el estado")
def cambiar_estado(
    id_cita: int, datos: CitaEstadoUpdate, usuario: UsuarioAuth, contexto: DatosPeticion
):
    return citas_service.cambiar_estado(id_cita, datos.estado, datos.motivo, usuario, contexto)


@router.post("/{id_cita}/cancelar", response_model=CitaOut, summary="Cancelar una cita")
def cancelar(
    id_cita: int, datos: CitaCancelar, usuario: UsuarioAuth, contexto: DatosPeticion
):
    return citas_service.cancelar(id_cita, datos.motivo, usuario, contexto)


@router.post("/{id_cita}/confirmar", response_model=CitaOut, summary="Confirmar una cita")
def confirmar(id_cita: int, actor: AdminOBarbero, contexto: DatosPeticion):
    return citas_service.cambiar_estado(id_cita, "confirmada", None, actor, contexto)


@router.post("/{id_cita}/completar", response_model=CitaOut, summary="Marcar como completada")
def completar(id_cita: int, actor: AdminOBarbero, contexto: DatosPeticion):
    return citas_service.cambiar_estado(id_cita, "completada", None, actor, contexto)
