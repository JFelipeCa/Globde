"""¿Qué? Define solicitudes persistentes de lista de espera y sus ofertas.
¿Para qué? Valida las preferencias de turno antes de persistirlas.
¿Impacto? La API entrega estados consistentes al cliente y al equipo."""

from datetime import date
from typing import Literal

from app.schemas.comunes import ModeloBase


class ListaEsperaCreate(ModeloBase):
    id_servicio: int
    id_barbero: int | None = None
    fecha_deseada: date
    franja_horaria: Literal["manana", "tarde", "cualquiera"] = "cualquiera"


class ListaEsperaOut(ModeloBase):
    id_espera: int
    id_cliente: int
    nombre_cliente: str
    telefono: str | None = None
    id_servicio: int
    servicio_nombre: str
    id_barbero: int | None = None
    barbero_nombre: str | None = None
    fecha_deseada: str
    franja_horaria: Literal["manana", "tarde", "cualquiera"]
    estado: Literal["en_espera", "ofrecida", "reservando", "convertida", "vencida", "cancelada"]
    oferta_hora_inicio: str | None = None
    oferta_hora_fin: str | None = None
    oferta_expira: str | None = None
    creado_en: str


__all__ = ["ListaEsperaCreate", "ListaEsperaOut"]
