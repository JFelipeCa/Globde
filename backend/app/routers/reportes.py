"""Rutas de reportes y dashboards por rol."""

from datetime import date

from fastapi import APIRouter, Query

from app.core.dependencies import SoloAdmin, UsuarioAuth
from app.core.exceptions import Prohibido
from app.schemas.reportes import (
    DashboardAdminOut,
    DashboardBarberoOut,
    DashboardClienteOut,
    IngresoBarberoOut,
    OcupacionBarberoOut,
    ReporteCitasOut,
    ReporteFidelizacionOut,
    ReporteIngresosOut,
    ServicioPopularOut,
)
from app.services import reportes_service

router = APIRouter(prefix="/reportes", tags=["Reportes"])


@router.get("/dashboard", response_model=dict, summary="Dashboard segun mi rol")
def dashboard(usuario: UsuarioAuth):
    """Devuelve el tablero que corresponde al rol del usuario autenticado."""
    if usuario.es_admin:
        return {"rol": "administrador", "datos": reportes_service.dashboard_admin()}
    if usuario.es_barbero and usuario.id_barbero:
        return {"rol": "barbero", "datos": reportes_service.dashboard_barbero(usuario.id_barbero)}
    if usuario.es_cliente and usuario.id_cliente:
        return {"rol": "cliente", "datos": reportes_service.dashboard_cliente(usuario.id_cliente)}
    raise Prohibido("Tu usuario no tiene un tablero asociado")


@router.get("/dashboard/admin", response_model=DashboardAdminOut, summary="Tablero general")
def dashboard_admin(_: SoloAdmin):
    return reportes_service.dashboard_admin()


@router.get(
    "/dashboard/barbero/{id_barbero}",
    response_model=DashboardBarberoOut,
    summary="Tablero de un barbero",
)
def dashboard_barbero(id_barbero: int, usuario: UsuarioAuth):
    if not usuario.es_admin and usuario.id_barbero != id_barbero:
        raise Prohibido("Solo puedes consultar tu propio tablero")
    return reportes_service.dashboard_barbero(id_barbero)


@router.get(
    "/dashboard/cliente/{id_cliente}",
    response_model=DashboardClienteOut,
    summary="Tablero de un cliente",
)
def dashboard_cliente(id_cliente: int, usuario: UsuarioAuth):
    if not usuario.es_admin and usuario.id_cliente != id_cliente:
        raise Prohibido("Solo puedes consultar tu propio tablero")
    return reportes_service.dashboard_cliente(id_cliente)


@router.get("/ingresos", response_model=ReporteIngresosOut, summary="Ingresos por periodo")
def ingresos(
    _: SoloAdmin,
    desde: date | None = None,
    hasta: date | None = None,
    agrupar_por: str = Query(default="dia", pattern="^(dia|semana|mes)$"),
):
    return reportes_service.reporte_ingresos(desde, hasta, agrupar_por)


@router.get(
    "/ingresos/barberos", response_model=list[IngresoBarberoOut], summary="Ingresos por barbero"
)
def ingresos_barberos(_: SoloAdmin, desde: date | None = None, hasta: date | None = None):
    return reportes_service.ingresos_por_barbero(desde, hasta)


@router.get(
    "/servicios-populares", response_model=list[ServicioPopularOut], summary="Servicios top"
)
def servicios_populares(
    _: SoloAdmin,
    desde: date | None = None,
    hasta: date | None = None,
    limite: int = Query(default=10, ge=1, le=50),
):
    return reportes_service.servicios_populares(desde, hasta, limite)


@router.get("/citas", response_model=ReporteCitasOut, summary="Reporte de citas")
def citas(_: SoloAdmin, desde: date | None = None, hasta: date | None = None):
    return reportes_service.reporte_citas(desde, hasta)


@router.get(
    "/ocupacion", response_model=list[OcupacionBarberoOut], summary="Ocupacion de barberos"
)
def ocupacion(_: SoloAdmin, desde: date | None = None, hasta: date | None = None):
    return reportes_service.ocupacion_barberos(desde, hasta)


@router.get(
    "/fidelizacion", response_model=ReporteFidelizacionOut, summary="Reporte de fidelizacion"
)
def fidelizacion(_: SoloAdmin):
    return reportes_service.reporte_fidelizacion()
