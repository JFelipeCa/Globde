import hashlib
import hmac
import re
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any

import bcrypt
import jwt

from app.core.config import settings

# Si no hay JWT_SECRET en el entorno se usa uno efimero (solo desarrollo).
_SECRET_EFIMERO = secrets.token_urlsafe(64)


def _jwt_secret() -> str:
    return settings.JWT_SECRET or _SECRET_EFIMERO


# ----------------------------------------------------------------------
# Contrasenas
# ----------------------------------------------------------------------

def hash_password(password: str) -> str:
    """Genera el hash bcrypt de una contrasena en texto plano."""
    salt = bcrypt.gensalt(rounds=settings.BCRYPT_ROUNDS)
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")


def es_hash_bcrypt(valor: str | None) -> bool:
    if not valor:
        return False
    return valor.startswith(("$2a$", "$2b$", "$2y$"))


def verificar_password(password: str, hash_guardado: str | None) -> bool:
   
    if not hash_guardado or not es_hash_bcrypt(hash_guardado):
        
        return False
    try:
        return bcrypt.checkpw(password.encode("utf-8"), hash_guardado.encode("utf-8"))
    except (ValueError, TypeError):
        return False


PASSWORD_MIN_LONGITUD = 8


def validar_fortaleza_password(password: str) -> list[str]:
    
    errores: list[str] = []
    if len(password) < PASSWORD_MIN_LONGITUD:
        errores.append(f"Debe tener al menos {PASSWORD_MIN_LONGITUD} caracteres")
    if not re.search(r"[A-Za-z]", password):
        errores.append("Debe incluir al menos una letra")
    if not re.search(r"\d", password):
        errores.append("Debe incluir al menos un numero")
    return errores


# ----------------------------------------------------------------------
# Tokens JWT
# ----------------------------------------------------------------------

def _crear_token(datos: dict[str, Any], expira_en: timedelta, tipo: str) -> str:
    ahora = datetime.now(timezone.utc)
    payload = {
        **datos,
        "iat": int(ahora.timestamp()),
        "exp": int((ahora + expira_en).timestamp()),
        "type": tipo,
        "iss": "globde-api",
    }
    return jwt.encode(payload, _jwt_secret(), algorithm=settings.JWT_ALGORITHM)


def crear_access_token(
    id_usuario: int,
    id_rol: int,
    correo: str,
    extra: dict[str, Any] | None = None,
) -> str:
    datos = {
        "sub": str(id_usuario),
        "id_usuario": id_usuario,
        "id_rol": id_rol,
        "correo": correo,
    }
    if extra:
        datos.update(extra)
    return _crear_token(datos, timedelta(minutes=settings.ACCESS_TOKEN_MINUTES), "access")


def crear_refresh_token(id_usuario: int) -> str:
    return _crear_token(
        {"sub": str(id_usuario), "id_usuario": id_usuario},
        timedelta(days=settings.REFRESH_TOKEN_DAYS),
        "refresh",
    )


class TokenInvalido(Exception):
    pass

def decodificar_token(token: str, tipo_esperado: str = "access") -> dict[str, Any]:
    try:
        payload = jwt.decode(
            token,
            _jwt_secret(),
            algorithms=[settings.JWT_ALGORITHM],
            issuer="globde-api",
        )
    except jwt.ExpiredSignatureError as exc:
        raise TokenInvalido("El token expiro") from exc
    except jwt.InvalidTokenError as exc:
        raise TokenInvalido("Token invalido") from exc

    if payload.get("type") != tipo_esperado:
        raise TokenInvalido("Tipo de token incorrecto")
    return payload


# ----------------------------------------------------------------------
# Tokens de recuperacion de contrasena
# ----------------------------------------------------------------------

def generar_token_recuperacion() -> tuple[str, str]:
    
    token_plano = secrets.token_urlsafe(48)
    return token_plano, hash_token(token_plano)


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def comparar_seguro(a: str, b: str) -> bool:
    return hmac.compare_digest(a, b)


def generar_codigo_reserva(prefijo: str = "GB") -> str:
    """Codigo de reserva legible y unico para citas: GB-A1B2C3D4."""
    return f"{prefijo}-{secrets.token_hex(4).upper()}"


def generar_numero_factura(secuencia: int, anio: int | None = None) -> str:
    """Numero de factura tipo FAC-2026-000123."""
    anio = anio or datetime.now(timezone.utc).year
    return f"FAC-{anio}-{secuencia:06d}"


__all__ = [
    "hash_password",
    "verificar_password",
    "es_hash_bcrypt",
    "validar_fortaleza_password",
    "PASSWORD_MIN_LONGITUD",
    "crear_access_token",
    "crear_refresh_token",
    "decodificar_token",
    "TokenInvalido",
    "generar_token_recuperacion",
    "hash_token",
    "comparar_seguro",
    "generar_codigo_reserva",
    "generar_numero_factura",
]
