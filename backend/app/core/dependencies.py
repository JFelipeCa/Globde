from typing import Annotated, Callable

from fastapi import Depends, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.config import settings
from app.core.exceptions import NoAutorizado, Prohibido
from app.core.security import TokenInvalido, decodificar_token
from app.db.database import fetch_one

bearer_scheme = HTTPBearer(auto_error=False, description="Token JWT de acceso")


class UsuarioActual:
    

    def __init__(self, fila: dict):
        self.id_usuario: int = int(fila["id_usuario"])
        self.id_rol: int = int(fila["id_rol"])
        self.nombre: str = fila["nombre"]
        self.correo: str = fila["correo"]
        self.telefono: str | None = fila.get("telefono")
        self.activo: bool = bool(fila.get("activo", True))
        self.id_cliente: int | None = (
            int(fila["id_cliente"]) if fila.get("id_cliente") is not None else None
        )
        self.id_barbero: int | None = (
            int(fila["id_barbero"]) if fila.get("id_barbero") is not None else None
        )

    
    @property
    def es_admin(self) -> bool:
        return self.id_rol == settings.ROL_ADMINISTRADOR

    @property
    def es_barbero(self) -> bool:
        return self.id_rol == settings.ROL_BARBERO

    @property
    def es_cliente(self) -> bool:
        return self.id_rol == settings.ROL_CLIENTE

    def to_dict(self) -> dict:
        return {
            "id_usuario": self.id_usuario,
            "id_rol": self.id_rol,
            "nombre": self.nombre,
            "correo": self.correo,
            "telefono": self.telefono,
            "id_cliente": self.id_cliente,
            "id_barbero": self.id_barbero,
        }


SQL_USUARIO_CONTEXTO = """
    SELECT
        u.id_usuario,
        u.id_rol,
        u.nombre,
        u.correo,
        u.telefono,
        u.activo,
        c.id_cliente,
        b.id_barbero
    FROM usuarios u
    LEFT JOIN clientes c ON c.id_usuario = u.id_usuario
    LEFT JOIN barberos b ON b.id_usuario = u.id_usuario
    WHERE u.id_usuario = %s
"""


def obtener_usuario_actual(
    credenciales: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
) -> UsuarioActual:
    
    if credenciales is None or not credenciales.credentials:
        raise NoAutorizado("Debes iniciar sesion para acceder a este recurso")

    try:
        payload = decodificar_token(credenciales.credentials, "access")
    except TokenInvalido as exc:
        raise NoAutorizado(str(exc)) from exc

    id_usuario = payload.get("id_usuario")
    if id_usuario is None:
        raise NoAutorizado("Token sin identificador de usuario")

    fila = fetch_one(SQL_USUARIO_CONTEXTO, (id_usuario,))
    if not fila:
        raise NoAutorizado("El usuario del token ya no existe")
    if not fila.get("activo"):
        raise Prohibido("La cuenta esta desactivada")

    return UsuarioActual(fila)


def obtener_usuario_opcional(
    credenciales: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
) -> UsuarioActual | None:
    
    if credenciales is None or not credenciales.credentials:
        return None
    try:
        return obtener_usuario_actual(credenciales)
    except (NoAutorizado, Prohibido):
        return None


def requiere_roles(*roles: int) -> Callable[..., UsuarioActual]:
    

    def _verificar(
        usuario: Annotated[UsuarioActual, Depends(obtener_usuario_actual)],
    ) -> UsuarioActual:
        if usuario.id_rol not in roles:
            raise Prohibido("Tu rol no tiene permisos para esta operacion")
        return usuario

    return _verificar


# Atajos de uso comun
UsuarioAuth = Annotated[UsuarioActual, Depends(obtener_usuario_actual)]
UsuarioOpcional = Annotated[UsuarioActual | None, Depends(obtener_usuario_opcional)]
SoloAdmin = Annotated[UsuarioActual, Depends(requiere_roles(settings.ROL_ADMINISTRADOR))]
SoloBarbero = Annotated[UsuarioActual, Depends(requiere_roles(settings.ROL_BARBERO))]
SoloCliente = Annotated[UsuarioActual, Depends(requiere_roles(settings.ROL_CLIENTE))]
AdminOBarbero = Annotated[
    UsuarioActual,
    Depends(requiere_roles(settings.ROL_ADMINISTRADOR, settings.ROL_BARBERO)),
]


def datos_peticion(request: Request) -> dict:
    """Extrae IP y user-agent para auditoria y logs de seguridad."""
    ip = request.headers.get("x-forwarded-for", "").split(",")[0].strip()
    if not ip and request.client:
        ip = request.client.host
    return {
        "ip": (ip or None),
        "user_agent": (request.headers.get("user-agent") or "")[:255] or None,
    }


DatosPeticion = Annotated[dict, Depends(datos_peticion)]


__all__ = [
    "UsuarioActual",
    "UsuarioAuth",
    "UsuarioOpcional",
    "SoloAdmin",
    "SoloBarbero",
    "SoloCliente",
    "AdminOBarbero",
    "requiere_roles",
    "obtener_usuario_actual",
    "DatosPeticion",
    "datos_peticion",
]
