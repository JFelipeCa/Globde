"""Autenticacion: login, registro, refresh y recuperacion de contrasena."""

import logging
import secrets
from datetime import datetime, timedelta, timezone

from app.core.config import settings
from app.core.exceptions import (
    Conflicto,
    DatosInvalidos,
    DemasiadosIntentos,
    NoAutorizado,
    Prohibido,
)
from app.core.security import (
    TokenInvalido,
    crear_access_token,
    crear_refresh_token,
    decodificar_token,
    generar_token_recuperacion,
    hash_password,
    hash_token,
    validar_fortaleza_password,
    verificar_password,
)
from app.db.database import execute, fetch_one, transaction
from app.services import email_service, usuarios_service
from app.services.auditoria_service import (
    Accion,
    contar_intentos_fallidos,
    registrar_auditoria,
    registrar_intento_login,
)

logger = logging.getLogger("globde.auth")


# ----------------------------------------------------------------------
# Armado de la respuesta de sesion
# ----------------------------------------------------------------------

def _usuario_publico(fila: dict) -> dict:
    return {
        "id_usuario": int(fila["id_usuario"]),
        "id_rol": int(fila["id_rol"]),
        "rol": fila.get("rol") or "",
        "nombre": fila["nombre"],
        "correo": fila["correo"],
        "telefono": fila.get("telefono"),
        "avatar_url": fila.get("avatar_url"),
        "activo": bool(fila.get("activo", True)),
        "id_cliente": int(fila["id_cliente"]) if fila.get("id_cliente") is not None else None,
        "id_barbero": int(fila["id_barbero"]) if fila.get("id_barbero") is not None else None,
        "puntos_saldo": int(fila["puntos_saldo"]) if fila.get("puntos_saldo") is not None else None,
        "nivel_fidelizacion": fila.get("nivel_fidelizacion"),
        "ultimo_login_at": fila.get("ultimo_login_at"),
    }


def construir_sesion(fila: dict) -> dict:
    usuario = _usuario_publico(fila)
    extra = {}
    if usuario["id_cliente"] is not None:
        extra["id_cliente"] = usuario["id_cliente"]
    if usuario["id_barbero"] is not None:
        extra["id_barbero"] = usuario["id_barbero"]

    return {
        "access_token": crear_access_token(
            usuario["id_usuario"], usuario["id_rol"], usuario["correo"], extra
        ),
        "refresh_token": crear_refresh_token(usuario["id_usuario"]),
        "token_type": "bearer",
        "expires_in": settings.ACCESS_TOKEN_MINUTES * 60,
        "usuario": usuario,
    }


# ----------------------------------------------------------------------
# Login
# ----------------------------------------------------------------------

def login(correo: str, contrasena: str, contexto: dict | None = None) -> dict:
    contexto = contexto or {}
    correo = correo.strip().lower()
    ip = contexto.get("ip")
    user_agent = contexto.get("user_agent")

    if contar_intentos_fallidos(correo, settings.LOGIN_VENTANA_MINUTOS) >= settings.LOGIN_MAX_INTENTOS:
        registrar_intento_login(correo, False, None, "bloqueado_por_intentos", ip, user_agent)
        raise DemasiadosIntentos(
            f"Demasiados intentos fallidos. Espera {settings.LOGIN_VENTANA_MINUTOS} "
            "minutos antes de volver a intentarlo."
        )

    fila = usuarios_service.obtener_por_correo(correo)
    if not fila:
        registrar_intento_login(correo, False, None, "correo_inexistente", ip, user_agent)
        # Mensaje generico: no se revela si el correo existe (OWASP)
        raise NoAutorizado("Correo o contrasena incorrectos")

    id_usuario = int(fila["id_usuario"])

    credenciales = fetch_one(
        "SELECT contrasena_hash FROM usuarios WHERE id_usuario = %s", (id_usuario,)
    )
    if not verificar_password(contrasena, (credenciales or {}).get("contrasena_hash")):
        registrar_intento_login(correo, False, id_usuario, "password_incorrecta", ip, user_agent)
        raise NoAutorizado("Correo o contrasena incorrectos")

    if not fila.get("activo"):
        registrar_intento_login(correo, False, id_usuario, "cuenta_inactiva", ip, user_agent)
        raise Prohibido("Tu cuenta esta desactivada. Contacta al administrador.")

    execute("UPDATE usuarios SET ultimo_login_at = NOW() WHERE id_usuario = %s", (id_usuario,))
    registrar_intento_login(correo, True, id_usuario, None, ip, user_agent)
    registrar_auditoria(
        Accion.LOGIN_EXITOSO, "usuarios", id_usuario, id_usuario, ip, user_agent,
        {"correo": correo},
    )

    fila["ultimo_login_at"] = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")
    return construir_sesion(fila)


# ----------------------------------------------------------------------
# Registro publico (clientes)
# ----------------------------------------------------------------------

def registrar_cliente(datos: dict, contexto: dict | None = None) -> dict:
    contexto = contexto or {}
    correo = datos["correo"].strip().lower()

    if usuarios_service.existe_correo(correo):
        raise Conflicto("Ya existe una cuenta registrada con ese correo")

    errores = validar_fortaleza_password(datos["contrasena"])
    if errores:
        raise DatosInvalidos("; ".join(errores))

    with transaction() as cursor:
        cursor.execute(
            """INSERT INTO usuarios (id_rol, nombre, correo, telefono, contrasena_hash)
               VALUES (%s, %s, %s, %s, %s)""",
            (
                settings.ROL_CLIENTE,
                datos["nombre"],
                correo,
                datos.get("telefono"),
                hash_password(datos["contrasena"]),
            ),
        )
        id_usuario = cursor.lastrowid
        cursor.execute("INSERT INTO clientes (id_usuario) VALUES (%s)", (id_usuario,))

    registrar_auditoria(
        Accion.REGISTRO_USUARIO, "usuarios", id_usuario, id_usuario,
        contexto.get("ip"), contexto.get("user_agent"), {"correo": correo},
    )

    fila = usuarios_service.obtener(id_usuario)
    return construir_sesion(fila)


# ----------------------------------------------------------------------
# Refresh
# ----------------------------------------------------------------------

def refrescar(refresh_token: str) -> dict:
    try:
        payload = decodificar_token(refresh_token, "refresh")
    except TokenInvalido as exc:
        raise NoAutorizado(str(exc)) from exc

    id_usuario = payload.get("id_usuario")
    if id_usuario is None:
        raise NoAutorizado("Token de refresco invalido")

    fila = usuarios_service.obtener(int(id_usuario))
    if not fila.get("activo"):
        raise Prohibido("La cuenta esta desactivada")
    return construir_sesion(fila)


# ----------------------------------------------------------------------
# Recuperacion de contrasena
# ----------------------------------------------------------------------

MENSAJE_RECUPERACION = (
    "Si el correo esta registrado, enviaremos un enlace para restablecer la contrasena."
)


def solicitar_recuperacion(correo: str, contexto: dict | None = None) -> dict:
    """Genera un token de recuperacion y envia el correo.

    Siempre responde lo mismo para no revelar que correos existen.
    """
    contexto = contexto or {}
    correo = correo.strip().lower()
    fila = usuarios_service.obtener_por_correo(correo)

    respuesta = {"mensaje": MENSAJE_RECUPERACION}

    if not fila or not fila.get("activo"):
        logger.info("Recuperacion solicitada para correo inexistente/inactivo: %s", correo)
        return respuesta

    id_usuario = int(fila["id_usuario"])
    token_plano, token_sha = generar_token_recuperacion()
    expira = datetime.now(timezone.utc) + timedelta(minutes=settings.RESET_TOKEN_MINUTES)

    # Se invalidan los tokens previos sin usar
    execute(
        """UPDATE password_reset_tokens
           SET used_at = NOW()
           WHERE id_usuario = %s AND used_at IS NULL AND expires_at > NOW()""",
        (id_usuario,),
    )
    execute(
        """INSERT INTO password_reset_tokens
               (id_usuario, token_hash, expires_at, request_ip, user_agent)
           VALUES (%s, %s, %s, %s, %s)""",
        (
            id_usuario,
            token_sha,
            expira.strftime("%Y-%m-%d %H:%M:%S"),
            contexto.get("ip"),
            contexto.get("user_agent"),
        ),
    )

    enviado = email_service.enviar_recuperacion_password(
        fila["correo"], fila["nombre"], token_plano, id_usuario
    )
    registrar_auditoria(
        Accion.PASSWORD_RECUPERACION_SOLICITADA, "usuarios", id_usuario, id_usuario,
        contexto.get("ip"), contexto.get("user_agent"), {"correo_enviado": enviado},
    )

    if settings.DEBUG and not enviado:
        # En desarrollo, sin SMTP configurado, se devuelve el token para poder probar.
        respuesta["detalle"] = {
            "token_debug": token_plano,
            "aviso": "Token expuesto solo porque DEBUG=true y el correo no pudo enviarse",
        }
    return respuesta


def _buscar_token_valido(token: str) -> dict:
    fila = fetch_one(
        """SELECT t.id_token, t.id_usuario, t.expires_at, t.used_at,
                  u.correo, u.nombre, u.activo
           FROM password_reset_tokens t
           JOIN usuarios u ON u.id_usuario = t.id_usuario
           WHERE t.token_hash = %s""",
        (hash_token(token),),
    )
    if not fila:
        raise DatosInvalidos("El enlace de recuperacion no es valido")
    if fila.get("used_at"):
        raise DatosInvalidos("Este enlace ya fue utilizado. Solicita uno nuevo.")

    expira = datetime.strptime(str(fila["expires_at"]), "%Y-%m-%d %H:%M:%S")
    if expira < datetime.now(timezone.utc).replace(tzinfo=None):
        raise DatosInvalidos("El enlace de recuperacion expiro. Solicita uno nuevo.")
    if not fila.get("activo"):
        raise Prohibido("La cuenta esta desactivada")
    return fila


def validar_token_recuperacion(token: str) -> dict:
    fila = _buscar_token_valido(token)
    return {"valido": True, "correo": fila["correo"], "nombre": fila["nombre"]}


def restablecer_password(token: str, nueva: str, contexto: dict | None = None) -> dict:
    contexto = contexto or {}
    fila = _buscar_token_valido(token)

    errores = validar_fortaleza_password(nueva)
    if errores:
        raise DatosInvalidos("; ".join(errores))

    id_usuario = int(fila["id_usuario"])
    with transaction() as cursor:
        cursor.execute(
            "UPDATE usuarios SET contrasena_hash = %s WHERE id_usuario = %s",
            (hash_password(nueva), id_usuario),
        )
        cursor.execute(
            "UPDATE password_reset_tokens SET used_at = NOW() WHERE id_token = %s",
            (fila["id_token"],),
        )

    registrar_auditoria(
        Accion.PASSWORD_CAMBIADA, "usuarios", id_usuario, id_usuario,
        contexto.get("ip"), contexto.get("user_agent"), {"via": "token_recuperacion"},
    )
    return {"mensaje": "Contrasena actualizada correctamente"}


def generar_password_temporal() -> str:
    """Contrasena temporal legible que cumple la politica de fortaleza."""
    return f"Globde{secrets.randbelow(9000) + 1000}{secrets.token_hex(2)}"


__all__ = [
    "login",
    "registrar_cliente",
    "refrescar",
    "construir_sesion",
    "solicitar_recuperacion",
    "validar_token_recuperacion",
    "restablecer_password",
    "generar_password_temporal",
    "MENSAJE_RECUPERACION",
]
