"""Esquemas de reportes, dashboards y estadisticas."""

from pydantic import Field

from app.schemas.comunes import ModeloBase


class DashboardAdminOut(ModeloBase):
    """KPIs globales (vista v_dashboard_admin) + metricas del periodo."""

    total_usuarios_activos: int = 0
    total_clientes: int = 0
    total_barberos_disponibles: int = 0
    total_servicios_activos: int = 0
    total_citas: int = 0
    citas_pendientes: int = 0
    citas_confirmadas: int = 0
    citas_completadas: int = 0
    citas_canceladas: int = 0
    citas_no_asistio: int = 0
    ingresos_pagados: float = 0
    correos_fallidos: int = 0
    generado_en: str | None = None

    citas_hoy: int = 0
    citas_semana: int = 0
    ingresos_mes: float = 0
    clientes_nuevos_mes: int = 0
    resenas_promedio: float = 0
    tasa_cancelacion: float = Field(default=0, description="Porcentaje de citas canceladas")
    tasa_no_asistencia: float = Field(default=0, description="Porcentaje de inasistencias")


class DashboardBarberoOut(ModeloBase):
    id_barbero: int
    nombre: str | None = None
    citas_hoy: int = 0
    citas_pendientes: int = 0
    citas_semana: int = 0
    citas_completadas: int = 0
    ingresos_mes: float = 0
    rating: float = 0
    total_resenas: int = 0
    proximas_citas: list[dict] = Field(default_factory=list)


class DashboardClienteOut(ModeloBase):
    id_cliente: int
    nombre: str | None = None
    puntos_saldo: int = 0
    nivel_fidelizacion: str = "Bronce"
    total_citas: int = 0
    citas_completadas: int = 0
    citas_canceladas: int = 0
    total_pagado: float = 0
    proxima_cita: dict | None = None
    ultima_fecha_cita: str | None = None


class IngresoPeriodoOut(ModeloBase):
    periodo: str = Field(description="Fecha, semana o mes segun el agrupamiento")
    total_citas: int = 0
    total_facturado: float = 0
    total_pagado: float = 0
    descuentos: float = 0


class ReporteIngresosOut(ModeloBase):
    desde: str | None = None
    hasta: str | None = None
    agrupar_por: str = "dia"
    total_facturado: float = 0
    total_pagado: float = 0
    total_pendiente: float = 0
    total_citas: int = 0
    ticket_promedio: float = 0
    periodos: list[IngresoPeriodoOut] = Field(default_factory=list)


class IngresoBarberoOut(ModeloBase):
    id_barbero: int
    nombre: str
    citas_completadas: int = 0
    total_facturado: float = 0
    total_pagado: float = 0
    rating: float = 0
    total_resenas: int = 0


class ServicioPopularOut(ModeloBase):
    id_servicio: int
    nombre: str
    categoria: str | None = None
    total_citas: int = 0
    total_ingresos: float = 0
    precio: float = 0


class OcupacionBarberoOut(ModeloBase):
    id_barbero: int
    nombre: str
    minutos_disponibles: int = 0
    minutos_ocupados: int = 0
    porcentaje_ocupacion: float = 0
    citas: int = 0


class ReporteCitasOut(ModeloBase):
    desde: str | None = None
    hasta: str | None = None
    total: int = 0
    por_estado: dict[str, int] = Field(default_factory=dict)
    por_dia: list[dict] = Field(default_factory=list)
    por_barbero: list[dict] = Field(default_factory=list)
    por_servicio: list[dict] = Field(default_factory=list)


class ReporteFidelizacionOut(ModeloBase):
    total_clientes: int = 0
    puntos_en_circulacion: int = 0
    puntos_otorgados: int = 0
    puntos_canjeados: int = 0
    por_nivel: list[dict] = Field(default_factory=list)
    top_clientes: list[dict] = Field(default_factory=list)


__all__ = [
    "DashboardAdminOut",
    "DashboardBarberoOut",
    "DashboardClienteOut",
    "IngresoPeriodoOut",
    "ReporteIngresosOut",
    "IngresoBarberoOut",
    "ServicioPopularOut",
    "OcupacionBarberoOut",
    "ReporteCitasOut",
    "ReporteFidelizacionOut",
]
