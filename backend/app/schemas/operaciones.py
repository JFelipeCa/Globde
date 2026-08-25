"""Esquemas de servicios, citas, facturas, puntos, resenas y notificaciones."""

from datetime import date, time
from typing import Literal

from pydantic import Field, model_validator

from app.schemas.comunes import (
    CategoriaServicio,
    EstadoCita,
    EstadoPago,
    MetodoPago,
    ModeloBase,
    TipoMovimientoPuntos,
    TipoNotificacion,
    TipoPenalidad,
)


# ----------------------------------------------------------------------
# Servicios
# ----------------------------------------------------------------------

class ServicioOut(ModeloBase):
    id_servicio: int
    nombre: str
    categoria: CategoriaServicio
    descripcion: str | None = None
    precio: float
    duracion_minutos: int
    icono: str | None = None
    imagen_url: str | None = None
    puntos_otorga: int = 0
    popular: bool = False
    activo: bool = True


class ServicioCreate(ModeloBase):
    nombre: str = Field(min_length=3, max_length=120)
    categoria: CategoriaServicio = "Cortes"
    descripcion: str | None = None
    precio: float = Field(gt=0)
    duracion_minutos: int = Field(gt=0, le=600)
    icono: str | None = Field(default=None, max_length=80)
    imagen_url: str | None = Field(default=None, max_length=255)
    puntos_otorga: int = Field(default=0, ge=0)
    popular: bool = False


class ServicioUpdate(ModeloBase):
    nombre: str | None = Field(default=None, min_length=3, max_length=120)
    categoria: CategoriaServicio | None = None
    descripcion: str | None = None
    precio: float | None = Field(default=None, gt=0)
    duracion_minutos: int | None = Field(default=None, gt=0, le=600)
    icono: str | None = Field(default=None, max_length=80)
    imagen_url: str | None = Field(default=None, max_length=255)
    puntos_otorga: int | None = Field(default=None, ge=0)
    popular: bool | None = None
    activo: bool | None = None


# ----------------------------------------------------------------------
# Citas
# ----------------------------------------------------------------------

class CitaOut(ModeloBase):
    id_cita: int
    codigo_reserva: str
    fecha: str
    hora_inicio: str
    hora_fin: str
    estado: EstadoCita
    precio_total: float = 0
    descuento_aplicado: float = 0
    puntos_canjeados: int = 0
    observaciones: str | None = None
    motivo_cancelacion: str | None = None
    creado_en: str | None = None
    cancelado_en: str | None = None

    id_cliente: int
    cliente_nombre: str | None = None
    cliente_correo: str | None = None
    cliente_telefono: str | None = None

    id_barbero: int
    barbero_nombre: str | None = None

    id_servicio: int
    servicio_nombre: str | None = None
    servicio_categoria: str | None = None
    servicio_duracion_minutos: int | None = None

    id_factura: int | None = None
    numero_factura: str | None = None
    estado_pago: EstadoPago | None = None


class CitaCreate(ModeloBase):
    """Reserva de cita. hora_fin se calcula con la duracion del servicio."""

    id_cliente: int | None = Field(
        default=None,
        description="Opcional para clientes: se toma del token",
    )
    id_barbero: int
    id_servicio: int
    fecha: date
    hora_inicio: time
    hora_fin: time | None = Field(
        default=None,
        description="Si se omite se calcula con la duracion del servicio",
    )
    observaciones: str | None = None
    puntos_a_canjear: int = Field(default=0, ge=0)
    estado: EstadoCita | None = None

    @model_validator(mode="after")
    def _rango_valido(self):
        if self.hora_fin is not None and self.hora_fin <= self.hora_inicio:
            raise ValueError("hora_fin debe ser posterior a hora_inicio")
        return self


class CitaUpdate(ModeloBase):
    """Reprogramacion o ajuste de una cita existente."""

    id_barbero: int | None = None
    id_servicio: int | None = None
    fecha: date | None = None
    hora_inicio: time | None = None
    hora_fin: time | None = None
    observaciones: str | None = None


class CitaEstadoUpdate(ModeloBase):
    estado: EstadoCita
    motivo: str | None = Field(default=None, max_length=255)


class CitaCancelar(ModeloBase):
    motivo: str | None = Field(default=None, max_length=255)


class SlotDisponible(ModeloBase):
    hora_inicio: str
    hora_fin: str
    disponible: bool = True


class DisponibilidadOut(ModeloBase):
    id_barbero: int
    fecha: str
    id_servicio: int | None = None
    duracion_minutos: int | None = None
    slots: list[SlotDisponible] = Field(default_factory=list)


# ----------------------------------------------------------------------
# Facturacion
# ----------------------------------------------------------------------

class DetalleFacturaIn(ModeloBase):
    id_servicio: int | None = None
    descripcion: str = Field(min_length=1, max_length=180)
    cantidad: int = Field(default=1, gt=0)
    precio_unitario: float = Field(ge=0)
    descuento: float = Field(default=0, ge=0)


class DetalleFacturaOut(ModeloBase):
    id_detalle: int
    id_factura: int
    id_servicio: int | None = None
    descripcion: str
    cantidad: int
    precio_unitario: float
    descuento: float
    subtotal: float


class FacturaCreate(ModeloBase):
    id_cita: int
    metodo_pago: MetodoPago = "efectivo"
    estado_pago: EstadoPago = "pendiente"
    descuento: float = Field(default=0, ge=0)
    impuestos: float | None = Field(default=None, ge=0)
    observaciones: str | None = None
    detalles: list[DetalleFacturaIn] | None = None


class FacturaOut(ModeloBase):
    id_factura: int
    numero_factura: str
    id_cita: int
    id_cliente: int | None = None
    id_barbero: int | None = None
    codigo_reserva: str | None = None
    subtotal: float
    descuento: float
    impuestos: float
    total: float
    metodo_pago: MetodoPago
    estado_pago: EstadoPago
    observaciones: str | None = None
    fecha_emision: str | None = None
    pagado_en: str | None = None
    anulada_en: str | None = None
    cliente_nombre: str | None = None
    barbero_nombre: str | None = None
    servicio_nombre: str | None = None
    detalles: list[DetalleFacturaOut] = Field(default_factory=list)


class FacturaPagoUpdate(ModeloBase):
    """Registro de pago. Sin estado_pago se asume que la factura queda pagada."""

    estado_pago: EstadoPago = "pagada"
    metodo_pago: MetodoPago | None = None


# ----------------------------------------------------------------------
# Puntos / fidelizacion
# ----------------------------------------------------------------------

class MovimientoPuntosOut(ModeloBase):
    id_movimiento: int
    id_cliente: int
    id_cita: int | None = None
    tipo: TipoMovimientoPuntos
    puntos: int
    saldo_resultante: int | None = None
    descripcion: str | None = None
    creado_en: str | None = None


class SaldoPuntosOut(ModeloBase):
    id_cliente: int
    puntos_saldo: int
    nivel_fidelizacion: str
    valor_estimado_cop: float
    puntos_ganados: int = 0
    puntos_canjeados: int = 0
    proximo_nivel: str | None = None
    puntos_para_proximo_nivel: int | None = None


class AjustePuntosIn(ModeloBase):
    puntos: int = Field(description="Positivo suma, negativo descuenta. No puede ser 0")
    descripcion: str = Field(min_length=3, max_length=255)

    @model_validator(mode="after")
    def _no_cero(self):
        if self.puntos == 0:
            raise ValueError("Los puntos no pueden ser 0")
        return self


class CanjePuntosIn(ModeloBase):
    puntos: int = Field(gt=0)
    descripcion: str = Field(default="Canje de puntos", max_length=255)
    id_cita: int | None = None


# ----------------------------------------------------------------------
# Resenas
# ----------------------------------------------------------------------

class ResenaCreate(ModeloBase):
    id_cita: int
    calificacion: int = Field(ge=1, le=5)
    comentario: str | None = Field(default=None, max_length=1000)


class ResenaOut(ModeloBase):
    id_resena: int
    id_cita: int
    id_cliente: int
    id_barbero: int
    calificacion: int
    comentario: str | None = None
    visible: bool = True
    creado_en: str | None = None
    cliente_nombre: str | None = None
    barbero_nombre: str | None = None
    servicio_nombre: str | None = None


# ----------------------------------------------------------------------
# Notificaciones
# ----------------------------------------------------------------------

class NotificacionOut(ModeloBase):
    id_notificacion: int
    id_usuario: int
    tipo: TipoNotificacion
    titulo: str
    mensaje: str
    leida: bool
    leida_en: str | None = None
    url_accion: str | None = None
    creado_en: str | None = None


class NotificacionCreate(ModeloBase):
    id_usuario: int
    tipo: TipoNotificacion = "sistema"
    titulo: str = Field(min_length=3, max_length=160)
    mensaje: str = Field(min_length=3)
    url_accion: str | None = Field(default=None, max_length=255)


class NotificacionMasivaCreate(ModeloBase):
    """Envio masivo por rol (CU-22 / HU-022)."""

    id_rol: int | None = Field(default=None, description="1 admin, 2 barbero, 3 cliente")
    tipo: TipoNotificacion = "sistema"
    titulo: str = Field(min_length=3, max_length=160)
    mensaje: str = Field(min_length=3)
    url_accion: str | None = Field(default=None, max_length=255)
    enviar_correo: bool = False


# ----------------------------------------------------------------------
# Penalidades
# ----------------------------------------------------------------------

class PenalidadCreate(ModeloBase):
    id_cliente: int
    id_cita: int | None = None
    tipo: TipoPenalidad
    descripcion: str = Field(min_length=3, max_length=255)
    puntos_descontados: int = Field(default=0, ge=0)
    monto: float = Field(default=0, ge=0)
    estado: Literal["pendiente", "aplicada"] = Field(
        default="aplicada",
        description="Con 'pendiente' se registra sin descontar puntos hasta aplicarla",
    )


class PenalidadOut(ModeloBase):
    id_penalidad: int
    id_cliente: int
    id_cita: int | None = None
    tipo: TipoPenalidad
    descripcion: str
    puntos_descontados: int
    monto: float
    estado: str
    creado_en: str | None = None


__all__ = [
    "ServicioOut",
    "ServicioCreate",
    "ServicioUpdate",
    "CitaOut",
    "CitaCreate",
    "CitaUpdate",
    "CitaEstadoUpdate",
    "CitaCancelar",
    "SlotDisponible",
    "DisponibilidadOut",
    "DetalleFacturaIn",
    "DetalleFacturaOut",
    "FacturaCreate",
    "FacturaOut",
    "FacturaPagoUpdate",
    "MovimientoPuntosOut",
    "SaldoPuntosOut",
    "AjustePuntosIn",
    "CanjePuntosIn",
    "ResenaCreate",
    "ResenaOut",
    "NotificacionOut",
    "NotificacionCreate",
    "NotificacionMasivaCreate",
    "PenalidadCreate",
    "PenalidadOut",
]
