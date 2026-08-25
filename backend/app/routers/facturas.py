"""Rutas de facturacion: emision, pago, anulacion y consulta."""

from datetime import date

from fastapi import APIRouter, Body, Query, status

from app.core.dependencies import AdminOBarbero, DatosPeticion, SoloAdmin, UsuarioAuth
from app.core.exceptions import Prohibido
from app.schemas.comunes import EstadoPago, MetodoPago, RespuestaPaginada
from app.schemas.operaciones import (
    DetalleFacturaOut,
    FacturaCreate,
    FacturaOut,
    FacturaPagoUpdate,
)
from app.services import facturas_service
from app.utils.paginacion import offset_de, paginar

router = APIRouter(prefix="/facturas", tags=["Facturacion"])


def _filtros_segun_rol(usuario, id_cliente: int | None, id_barbero: int | None) -> dict:
    if usuario.es_cliente:
        if id_cliente is not None and id_cliente != usuario.id_cliente:
            raise Prohibido("Solo puedes consultar tus propias facturas")
        return {"id_cliente": usuario.id_cliente}
    if usuario.es_barbero:
        if id_barbero is not None and id_barbero != usuario.id_barbero:
            raise Prohibido("Solo puedes consultar tus propias facturas")
        return {"id_barbero": usuario.id_barbero, "id_cliente": id_cliente}
    return {"id_cliente": id_cliente, "id_barbero": id_barbero}


@router.get("", response_model=RespuestaPaginada[FacturaOut], summary="Listar facturas")
def listar(
    usuario: UsuarioAuth,
    id_cliente: int | None = None,
    id_barbero: int | None = None,
    estado_pago: EstadoPago | None = None,
    metodo_pago: MetodoPago | None = None,
    desde: date | None = None,
    hasta: date | None = None,
    buscar: str | None = Query(default=None, description="Numero de factura o cliente"),
    pagina: int = Query(default=1, ge=1),
    por_pagina: int = Query(default=20, ge=1, le=100),
):
    filtros = _filtros_segun_rol(usuario, id_cliente, id_barbero)
    filtros.update(
        estado_pago=estado_pago, metodo_pago=metodo_pago,
        desde=desde, hasta=hasta, buscar=buscar,
    )
    filtros = {k: v for k, v in filtros.items() if v is not None}

    offset = offset_de(pagina, por_pagina)
    items = facturas_service.listar(limite=por_pagina, offset=offset, **filtros)
    total = facturas_service.contar(**filtros)
    return paginar(items, total, pagina, por_pagina)


@router.get("/cita/{id_cita}", response_model=FacturaOut, summary="Factura de una cita")
def por_cita(id_cita: int, usuario: UsuarioAuth):
    factura = facturas_service.obtener_por_cita(id_cita)
    facturas_service.verificar_acceso(factura, usuario)
    return factura


@router.get("/{id_factura}", response_model=FacturaOut, summary="Detalle de una factura")
def obtener(id_factura: int, usuario: UsuarioAuth):
    factura = facturas_service.obtener(id_factura)
    facturas_service.verificar_acceso(factura, usuario)
    return factura


@router.get(
    "/{id_factura}/detalle", response_model=list[DetalleFacturaOut], summary="Lineas de detalle"
)
def detalle(id_factura: int, usuario: UsuarioAuth):
    factura = facturas_service.obtener(id_factura, con_detalle=False)
    facturas_service.verificar_acceso(factura, usuario)
    return facturas_service.listar_detalle(id_factura)


@router.post(
    "",
    response_model=FacturaOut,
    status_code=status.HTTP_201_CREATED,
    summary="Emitir una factura",
)
def emitir(datos: FacturaCreate, actor: AdminOBarbero, contexto: DatosPeticion):
    return facturas_service.emitir(datos.model_dump(mode="json"), actor, contexto)


@router.patch("/{id_factura}/pago", response_model=FacturaOut, summary="Registrar el pago")
def registrar_pago(
    id_factura: int, datos: FacturaPagoUpdate, actor: AdminOBarbero, contexto: DatosPeticion
):
    factura = facturas_service.obtener(id_factura, con_detalle=False)
    metodo = datos.metodo_pago or factura["metodo_pago"]

    if datos.estado_pago == "anulada":
        if not actor.es_admin:
            raise Prohibido("Solo un administrador puede anular una factura")
        return facturas_service.anular(
            id_factura, "Anulada desde el modulo de pagos", actor, contexto
        )
    return facturas_service.registrar_pago(id_factura, metodo, actor, contexto)


@router.post("/{id_factura}/anular", response_model=FacturaOut, summary="Anular una factura")
def anular(
    id_factura: int,
    admin: SoloAdmin,
    contexto: DatosPeticion,
    motivo: str = Body(embed=True, min_length=3, max_length=255),
):
    return facturas_service.anular(id_factura, motivo, admin, contexto)
