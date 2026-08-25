"""Rutas de puntos y fidelizacion."""

from fastapi import APIRouter, Query

from app.core.dependencies import AdminOBarbero, DatosPeticion, SoloAdmin, UsuarioAuth
from app.core.exceptions import Prohibido
from app.schemas.comunes import RespuestaPaginada, TipoMovimientoPuntos
from app.schemas.operaciones import (
    AjustePuntosIn,
    CanjePuntosIn,
    MovimientoPuntosOut,
    SaldoPuntosOut,
)
from app.services import puntos_service
from app.services.auditoria_service import Accion, registrar_auditoria
from app.utils.paginacion import offset_de, paginar

router = APIRouter(prefix="/puntos", tags=["Puntos y fidelizacion"])


def _resolver_cliente(id_cliente: int | None, usuario) -> int:
    """Un cliente siempre opera sobre su propio saldo."""
    if usuario.es_cliente:
        if usuario.id_cliente is None:
            raise Prohibido("Tu usuario no tiene un perfil de cliente asociado")
        if id_cliente is not None and id_cliente != usuario.id_cliente:
            raise Prohibido("Solo puedes consultar tus propios puntos")
        return usuario.id_cliente
    if id_cliente is None:
        raise Prohibido("Debes indicar el cliente")
    return id_cliente


@router.get("/saldo", response_model=SaldoPuntosOut, summary="Saldo de puntos")
def saldo(usuario: UsuarioAuth, id_cliente: int | None = None):
    return puntos_service.obtener_saldo(_resolver_cliente(id_cliente, usuario))


@router.get(
    "/movimientos",
    response_model=RespuestaPaginada[MovimientoPuntosOut],
    summary="Historial de movimientos",
)
def movimientos(
    usuario: UsuarioAuth,
    id_cliente: int | None = None,
    tipo: TipoMovimientoPuntos | None = None,
    pagina: int = Query(default=1, ge=1),
    por_pagina: int = Query(default=20, ge=1, le=100),
):
    cliente = _resolver_cliente(id_cliente, usuario)
    offset = offset_de(pagina, por_pagina)
    items = puntos_service.listar_movimientos(cliente, por_pagina, offset, tipo)
    total = puntos_service.contar_movimientos(cliente, tipo)
    return paginar(items, total, pagina, por_pagina)


@router.post("/canjear", response_model=SaldoPuntosOut, summary="Canjear puntos")
def canjear(
    datos: CanjePuntosIn,
    usuario: UsuarioAuth,
    contexto: DatosPeticion,
    id_cliente: int | None = Query(default=None, description="Solo para personal"),
):
    cliente = _resolver_cliente(id_cliente, usuario)
    puntos_service.canjear_puntos(
        cliente, datos.puntos, datos.descripcion, datos.id_cita, usuario.id_usuario
    )
    registrar_auditoria(
        Accion.PUNTOS_CANJEADOS, "puntos_movimientos", cliente, usuario.id_usuario,
        contexto.get("ip"), contexto.get("user_agent"), {"puntos": datos.puntos},
    )
    return puntos_service.obtener_saldo(cliente)


@router.post(
    "/clientes/{id_cliente}/ajuste", response_model=SaldoPuntosOut, summary="Ajuste manual"
)
def ajustar(
    id_cliente: int, datos: AjustePuntosIn, admin: SoloAdmin, contexto: DatosPeticion
):
    puntos_service.ajustar_puntos(
        id_cliente, datos.puntos, datos.descripcion, admin.id_usuario
    )
    registrar_auditoria(
        Accion.PUNTOS_AJUSTADOS, "puntos_movimientos", id_cliente, admin.id_usuario,
        contexto.get("ip"), contexto.get("user_agent"),
        {"puntos": datos.puntos, "descripcion": datos.descripcion},
    )
    return puntos_service.obtener_saldo(id_cliente)


@router.get(
    "/clientes/{id_cliente}/saldo", response_model=SaldoPuntosOut, summary="Saldo de un cliente"
)
def saldo_cliente(id_cliente: int, _: AdminOBarbero):
    return puntos_service.obtener_saldo(id_cliente)


@router.get("/equivalencia", response_model=dict, summary="Equivalencia puntos <-> pesos")
def equivalencia(
    puntos: int | None = Query(default=None, ge=0),
    pesos: float | None = Query(default=None, ge=0),
):
    return {
        "puntos": puntos,
        "pesos": pesos,
        "valor_en_pesos": puntos_service.valor_en_pesos(puntos) if puntos is not None else None,
        "puntos_equivalentes": (
            puntos_service.puntos_desde_pesos(pesos) if pesos is not None else None
        ),
    }
