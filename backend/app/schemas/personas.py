from datetime import time

from pydantic import Field, field_validator, model_validator

from app.schemas.comunes import Correo, ModeloBase, NivelFidelizacion


# ----------------------------------------------------------------------
# Usuarios
# ----------------------------------------------------------------------

class UsuarioOut(ModeloBase):
    id_usuario: int
    id_rol: int
    rol: str | None = None
    nombre: str
    correo: str
    telefono: str | None = None
    avatar_url: str | None = None
    activo: bool
    email_verificado_at: str | None = None
    ultimo_login_at: str | None = None
    creado_en: str | None = None


class UsuarioInternoCreate(ModeloBase):
    

    nombre: str = Field(min_length=3, max_length=120)
    correo: Correo
    telefono: str | None = Field(default=None, max_length=25)
    contrasena: str = Field(min_length=8, max_length=128)
    id_rol: int = Field(description="1 = administrador, 2 = barbero")

    # Datos opcionales del perfil de barbero
    titulo: str | None = Field(default=None, max_length=80)
    experiencia_anios: int = Field(default=0, ge=0, le=80)
    bio: str | None = None
    foto_url: str | None = Field(default=None, max_length=255)
    color: str | None = Field(default=None, max_length=20)

    @field_validator("id_rol")
    @classmethod
    def _rol_permitido(cls, valor: int) -> int:
        if valor not in (1, 2):
            raise ValueError("Solo se permite crear administradores (1) o barberos (2)")
        return valor


class PerfilUpdate(ModeloBase):
    nombre: str | None = Field(default=None, min_length=3, max_length=120)
    correo: Correo | None = None
    telefono: str | None = Field(default=None, max_length=25)
    avatar_url: str | None = Field(default=None, max_length=255)


# ----------------------------------------------------------------------
# Clientes
# ----------------------------------------------------------------------

class ClienteOut(ModeloBase):
    id_cliente: int
    id_usuario: int
    nombre: str
    correo: str
    telefono: str | None = None
    activo: bool | None = None
    puntos_saldo: int = 0
    nivel_fidelizacion: NivelFidelizacion = "Bronce"
    fecha_registro: str | None = None


class ClienteResumenOut(ClienteOut):
    
    total_citas: int = 0
    citas_completadas: int = 0
    citas_canceladas: int = 0
    citas_no_asistio: int = 0
    total_pagado: float = 0
    ultima_fecha_cita: str | None = None


class ClienteCreate(ModeloBase):
    
    nombre: str = Field(min_length=3, max_length=120)
    correo: Correo
    telefono: str | None = Field(default=None, max_length=25)
    contrasena: str | None = Field(
        default=None,
        min_length=8,
        max_length=128,
        description="Si se omite, se genera una temporal y el cliente la recupera por correo",
    )


class ClienteUpdate(ModeloBase):
    nombre: str | None = Field(default=None, min_length=3, max_length=120)
    correo: Correo | None = None
    telefono: str | None = Field(default=None, max_length=25)
    nivel_fidelizacion: NivelFidelizacion | None = None


# ----------------------------------------------------------------------
# Barberos
# ----------------------------------------------------------------------

class BarberoOut(ModeloBase):
    id_barbero: int
    id_usuario: int
    nombre: str
    correo: str | None = None
    telefono: str | None = None
    titulo: str = "Barbero"
    experiencia_anios: int = 0
    bio: str | None = None
    foto_url: str | None = None
    rating: float = 0
    total_resenas: int = 0
    citas_completadas: int = 0
    disponible: bool = True
    color: str | None = None
    activo: bool | None = None


class BarberoPerfilOut(BarberoOut):
    
    servicios: list[dict] = Field(default_factory=list)
    horarios: list[dict] = Field(default_factory=list)
    resenas_recientes: list[dict] = Field(default_factory=list)


class BarberoUpdate(ModeloBase):
    titulo: str | None = Field(default=None, max_length=80)
    experiencia_anios: int | None = Field(default=None, ge=0, le=80)
    bio: str | None = None
    foto_url: str | None = Field(default=None, max_length=255)
    disponible: bool | None = None
    color: str | None = Field(default=None, max_length=20)


class HorarioBarberoIn(ModeloBase):
    dia_semana: int = Field(ge=1, le=7, description="1=Lunes ... 7=Domingo")
    hora_inicio: time
    hora_fin: time
    activo: bool = True

    @model_validator(mode="after")
    def _rango_valido(self):
        if self.hora_fin <= self.hora_inicio:
            raise ValueError("hora_fin debe ser posterior a hora_inicio")
        return self


class HorarioBarberoOut(ModeloBase):
    id_horario: int
    id_barbero: int
    dia_semana: int
    hora_inicio: str
    hora_fin: str
    activo: bool


class HorariosBarberoBulk(ModeloBase):
    
    horarios: list[HorarioBarberoIn]


class BloqueoAgendaIn(ModeloBase):
    fecha: str
    hora_inicio: time
    hora_fin: time
    motivo: str = Field(min_length=3, max_length=255)

    @model_validator(mode="after")
    def _rango_valido(self):
        if self.hora_fin <= self.hora_inicio:
            raise ValueError("hora_fin debe ser posterior a hora_inicio")
        return self


class BloqueoAgendaOut(ModeloBase):
    id_bloqueo: int
    id_barbero: int
    fecha: str
    hora_inicio: str
    hora_fin: str
    motivo: str
    creado_en: str | None = None


class AsignarServiciosBarbero(ModeloBase):
    servicios: list[int] = Field(description="IDs de servicios que presta el barbero")


__all__ = [
    "UsuarioOut",
    "UsuarioInternoCreate",
    "PerfilUpdate",
    "ClienteOut",
    "ClienteResumenOut",
    "ClienteCreate",
    "ClienteUpdate",
    "BarberoOut",
    "BarberoPerfilOut",
    "BarberoUpdate",
    "HorarioBarberoIn",
    "HorarioBarberoOut",
    "HorariosBarberoBulk",
    "BloqueoAgendaIn",
    "BloqueoAgendaOut",
    "AsignarServiciosBarbero",
]
