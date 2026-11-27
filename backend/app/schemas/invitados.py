"""
¿Qué? Define solicitudes de reserva y lista de espera para invitados.
¿Para qué? Valida identidad de contacto y códigos antes de crear registros públicos.
¿Impacto? Mantiene los flujos de invitado tipados y limita datos no confiables.
"""

from datetime import date, time

from pydantic import Field, field_validator

from app.schemas.comunes import Correo, ModeloBase


class ContactoInvitado(ModeloBase):
    nombre: str = Field(min_length=3, max_length=120)
    correo: Correo
    telefono: str = Field(min_length=7, max_length=25)

    @field_validator("telefono")
    @classmethod
    def validar_telefono(cls, valor: str) -> str:
        limpio = "".join(caracter for caracter in valor if caracter.isdigit() or caracter == "+")
        if len(limpio) < 7:
            raise ValueError("El teléfono debe tener al menos 7 dígitos")
        return limpio


class CitaInvitadoSolicitar(ContactoInvitado):
    id_barbero: int = Field(gt=0)
    id_servicio: int = Field(gt=0)
    fecha: date
    hora_inicio: time
    observaciones: str | None = Field(default=None, max_length=2000)
    extras: list[str] = Field(default_factory=list, max_length=4)


class ListaEsperaInvitadoSolicitar(ContactoInvitado):
    id_servicio: int = Field(gt=0)
    id_barbero: int | None = Field(default=None, gt=0)
    fecha_deseada: date
    franja_horaria: str = "cualquiera"

    @field_validator("franja_horaria")
    @classmethod
    def validar_franja(cls, valor: str) -> str:
        if valor not in {"manana", "tarde", "cualquiera"}:
            raise ValueError("La franja horaria no es válida")
        return valor


class VerificarInvitadoRequest(ModeloBase):
    id_solicitud: int = Field(gt=0)
    codigo: str = Field(pattern=r"^[0-9]{6}$")


class VerificacionInvitadoOut(ModeloBase):
    id_solicitud: int
    mensaje: str


__all__ = [
    "CitaInvitadoSolicitar",
    "ListaEsperaInvitadoSolicitar",
    "VerificarInvitadoRequest",
    "VerificacionInvitadoOut",
]
