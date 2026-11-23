"""¿Qué? Contratos de configuración de agenda y cierres del negocio.
¿Para qué? Valida horarios semanales y fechas no laborables antes de persistirlos.
¿Impacto? La API y las interfaces comparten las mismas reglas de calendario.
"""

from datetime import date, time

from pydantic import Field, model_validator

from app.schemas.comunes import ModeloBase


class HorarioNegocioIn(ModeloBase):
    dia_semana: int = Field(ge=1, le=7, description="1=Lunes ... 7=Domingo")
    hora_inicio: time
    hora_fin: time
    activo: bool = True

    @model_validator(mode="after")
    def validar_rango(self):
        if self.hora_fin <= self.hora_inicio:
            raise ValueError("hora_fin debe ser posterior a hora_inicio")
        return self


class HorariosNegocioBulk(ModeloBase):
    horarios: list[HorarioNegocioIn]


class HorarioNegocioOut(ModeloBase):
    id_horario: int
    dia_semana: int
    hora_inicio: str
    hora_fin: str
    activo: bool


class CierreNegocioIn(ModeloBase):
    fecha: date
    motivo: str = Field(min_length=3, max_length=255)


class CitaAfectadaCierre(ModeloBase):
    id_cita: int
    codigo_reserva: str
    hora_inicio: str
    hora_fin: str
    estado: str
    cliente_nombre: str | None = None
    barbero_nombre: str | None = None


class CierreNegocioOut(ModeloBase):
    id_cierre: int
    fecha: date
    motivo: str
    creado_en: str | None = None
    citas_afectadas: list[CitaAfectadaCierre] = Field(default_factory=list)


__all__ = [
    "HorarioNegocioIn",
    "HorariosNegocioBulk",
    "HorarioNegocioOut",
    "CierreNegocioIn",
    "CitaAfectadaCierre",
    "CierreNegocioOut",
]
