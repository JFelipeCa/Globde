from pydantic import AliasChoices, Field, field_validator

from app.core.security import validar_fortaleza_password
from app.schemas.comunes import Correo, ModeloBase, NivelFidelizacion


def _validar_password(valor: str) -> str:
    errores = validar_fortaleza_password(valor)
    if errores:
        raise ValueError("; ".join(errores))
    return valor


class LoginRequest(ModeloBase):
    
    correo: Correo = Field(validation_alias=AliasChoices("correo", "email"))
    contrasena: str = Field(
        min_length=1,
        max_length=128,
        validation_alias=AliasChoices("contrasena", "password"),
    )


class RegistroClienteRequest(ModeloBase):
    nombre: str = Field(min_length=3, max_length=120)
    correo: Correo
    telefono: str | None = Field(default=None, max_length=25)
    contrasena: str = Field(min_length=8, max_length=128)

    _v_pass = field_validator("contrasena")(_validar_password)

    @field_validator("telefono")
    @classmethod
    def _telefono_valido(cls, valor: str | None) -> str | None:
        if valor in (None, ""):
            return None
        limpio = "".join(c for c in valor if c.isdigit() or c == "+")
        if len(limpio) < 7:
            raise ValueError("El telefono debe tener al menos 7 digitos")
        return limpio


class UsuarioAutenticado(ModeloBase):
    

    id_usuario: int
    id_rol: int
    rol: str
    nombre: str
    correo: str
    telefono: str | None = None
    avatar_url: str | None = None
    activo: bool = True
    id_cliente: int | None = None
    id_barbero: int | None = None
    puntos_saldo: int | None = None
    nivel_fidelizacion: NivelFidelizacion | None = None
    ultimo_login_at: str | None = None


class TokenRespuesta(ModeloBase):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    usuario: UsuarioAutenticado


class RefreshRequest(ModeloBase):
    refresh_token: str = Field(min_length=10)


class PasswordForgotRequest(ModeloBase):
    correo: Correo = Field(validation_alias=AliasChoices("correo", "email"))


class PasswordResetRequest(ModeloBase):
    token: str = Field(min_length=10, max_length=200)
    nueva_contrasena: str = Field(min_length=8, max_length=128)

    _v_pass = field_validator("nueva_contrasena")(_validar_password)


class CambioPasswordRequest(ModeloBase):
    contrasena_actual: str = Field(min_length=1, max_length=128)
    nueva_contrasena: str = Field(min_length=8, max_length=128)

    _v_pass = field_validator("nueva_contrasena")(_validar_password)


class ValidarTokenRequest(ModeloBase):
    token: str = Field(min_length=10, max_length=200)


__all__ = [
    "LoginRequest",
    "RegistroClienteRequest",
    "UsuarioAutenticado",
    "TokenRespuesta",
    "RefreshRequest",
    "PasswordForgotRequest",
    "PasswordResetRequest",
    "CambioPasswordRequest",
    "ValidarTokenRequest",
]
