"""Tipos y esquemas compartidos por toda la API."""

from datetime import date, time
from typing import Any, Generic, Literal, TypeVar

from pydantic import BaseModel, ConfigDict, Field
from pydantic.functional_validators import AfterValidator
from typing_extensions import Annotated

from app.core.config import settings

T = TypeVar("T")


def _validar_correo(valor: str) -> str:
    """Valida un correo permitiendo dominios de prueba (.test, .local) en desarrollo."""
    from email_validator import EmailNotValidError, validate_email

    try:
        info = validate_email(
            valor,
            check_deliverability=False,
            test_environment=settings.APP_ENV != "production",
        )
    except EmailNotValidError as exc:  # pragma: no cover - mensaje de pydantic
        raise ValueError(str(exc)) from exc
    return info.normalized


Correo = Annotated[str, AfterValidator(_validar_correo)]
"""Correo electronico validado. En produccion exige un dominio real."""

EstadoCita = Literal[
    "pendiente",
    "confirmada",
    "en_atencion",
    "completada",
    "cancelada",
    "no_asistio",
]

CategoriaServicio = Literal["Cortes", "Barba", "Combos", "Tratamientos", "Infantil"]

NivelFidelizacion = Literal["Bronce", "Plata", "Oro", "Diamante"]

MetodoPago = Literal["efectivo", "tarjeta", "transferencia", "nequi", "daviplata", "otro"]

EstadoPago = Literal["pendiente", "pagada", "anulada", "reembolsada"]

TipoMovimientoPuntos = Literal["ganancia", "canje", "ajuste", "penalizacion", "expiracion"]

TipoNotificacion = Literal["cita", "pago", "puntos", "resena", "seguridad", "sistema"]

TipoPenalidad = Literal["no_asistencia", "cancelacion_tardia", "incumplimiento", "otro"]


class ModeloBase(BaseModel):
    """Base con configuracion comun (ignora campos extra y limpia strings)."""

    model_config = ConfigDict(
        extra="ignore",
        str_strip_whitespace=True,
        populate_by_name=True,
    )


class MensajeRespuesta(ModeloBase):
    mensaje: str
    detalle: dict[str, Any] | None = None


class RespuestaPaginada(ModeloBase, Generic[T]):
    items: list[T]
    total: int
    pagina: int
    por_pagina: int
    total_paginas: int


class ParametrosPaginacion(ModeloBase):
    pagina: int = Field(default=1, ge=1, description="Numero de pagina (desde 1)")
    por_pagina: int = Field(default=20, ge=1, le=100, description="Registros por pagina")

    @property
    def offset(self) -> int:
        return (self.pagina - 1) * self.por_pagina


class RangoFechas(ModeloBase):
    desde: date | None = None
    hasta: date | None = None


class RangoHorario(ModeloBase):
    hora_inicio: time
    hora_fin: time


__all__ = [
    "Correo",
    "ModeloBase",
    "MensajeRespuesta",
    "RespuestaPaginada",
    "ParametrosPaginacion",
    "RangoFechas",
    "RangoHorario",
    "EstadoCita",
    "CategoriaServicio",
    "NivelFidelizacion",
    "MetodoPago",
    "EstadoPago",
    "TipoMovimientoPuntos",
    "TipoNotificacion",
    "TipoPenalidad",
]
