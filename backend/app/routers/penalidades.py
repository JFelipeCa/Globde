"""Rutas de penalidades aplicadas a clientes."""

from fastapi import APIRouter, Body, Query, status

from app.core.dependencies import AdminOBarbero, DatosPeticion, SoloAdmin, UsuarioAuth
from app.core.exceptions import Prohibido
from app.schemas.comunes import MensajeRespuesta, RespuestaPaginada, TipoPenalidad
from app.schemas.operaciones import PenalidadCreate, PenalidadOut
from app.services import penalidades_service
from app.utils.paginacion import offset_de, paginar

router = APIRouter(prefix="/penalidades", tags=["Penalidades"])


@router.get("", response_model=RespuestaPaginada[PenalidadOut], summary="Listar penalidades")
def listar(
    usuario: UsuarioAuth,
    id_cliente: int | None = None,
    estado: str | None = Query(default=None, description="pendiente, aplicada o anulada"),
    tipo: TipoPenalidad | None = None,
    pagina: int = Query(default=1, ge=1),
    por_pagina: int = Query(default=20, ge=1, le=100),
):
    if usuario.es_cliente:
        if id_cliente is not None and id_cliente != usuario.id_cliente:
            raise Prohibido("Solo puedes consultar tus propias penalidades")
        id_cliente = usuario.id_cliente

    offset = offset_de(pagina, por_pagina)
    items = penalidades_service.listar(id_cliente, estado, tipo, por_pagina, offset)
    total = penalidades_service.contar(id_cliente, estado)
    return paginar(items, total, pagina, por_pagina)


@router.get("/{id_penalidad}", response_model=PenalidadOut, summary="Detalle de una penalidad")
def obtener(id_penalidad: int, usuario: UsuarioAuth):
    penalidad = penalidades_service.obtener(id_penalidad)
    if usuario.es_cliente and int(penalidad["id_cliente"]) != int(usuario.id_cliente or -1):
        raise Prohibido("Esta penalidad no te pertenece")
    return penalidad


@router.post(
    "",
    response_model=PenalidadOut,
    status_code=status.HTTP_201_CREATED,
    summary="Registrar una penalidad",
)
def crear(datos: PenalidadCreate, actor: AdminOBarbero, contexto: DatosPeticion):
    return penalidades_service.crear(datos.model_dump(), actor, contexto)


@router.post("/{id_penalidad}/aplicar", response_model=PenalidadOut, summary="Aplicar penalidad")
def aplicar(id_penalidad: int, admin: SoloAdmin):
    return penalidades_service.aplicar(id_penalidad, admin)


@router.post("/{id_penalidad}/anular", response_model=PenalidadOut, summary="Anular penalidad")
def anular(
    id_penalidad: int,
    admin: SoloAdmin,
    motivo: str | None = Body(default=None, embed=True, max_length=255),
):
    return penalidades_service.anular(id_penalidad, motivo, admin)


@router.delete("/{id_penalidad}", response_model=MensajeRespuesta, summary="Eliminar penalidad")
def eliminar(id_penalidad: int, _: SoloAdmin):
    penalidades_service.eliminar(id_penalidad)
    return {"mensaje": "Penalidad eliminada correctamente"}
