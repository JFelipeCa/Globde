"""
¿Qué? Verifica el correo y administra perfiles provisionales para invitados.
¿Para qué? Permite reservar sin cuenta y conserva las solicitudes en el historial del cliente.
¿Impacto? Evita registros anónimos sin verificación y permite reclamar el historial al registrarse.
"""

import hashlib
import hmac
import json
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any, Literal

from app.core.config import settings
from app.core.exceptions import (
    Conflicto,
    DatosInvalidos,
    DemasiadosIntentos,
    NoAutorizado,
    Prohibido,
    ServicioNoDisponible,
)
from app.core.security import hash_password
from app.db.database import execute, execute_rowcount, fetch_value, transaction
from app.services import citas_service, email_service, lista_espera_service

TipoInvitado = Literal["cita", "lista_espera"]
_CLAVE_OTP = settings.JWT_SECRET.encode("utf-8") if settings.JWT_SECRET else secrets.token_bytes(32)
_MINUTOS_EXPIRACION = 10
_MAX_INTENTOS = 5


def _hash_codigo(codigo: str) -> str:
    return hmac.new(_CLAVE_OTP, codigo.encode("utf-8"), hashlib.sha256).hexdigest()


def solicitar_verificacion(
    tipo: TipoInvitado, payload: dict[str, Any], contexto: dict[str, Any] | None = None
) -> dict:
    contexto = contexto or {}
    correo = str(payload["correo"]).strip().lower()
    ip = contexto.get("ip")
    if not settings.EMAIL_ENABLED or not settings.smtp_configurado:
        raise ServicioNoDisponible(
            "La reserva como invitado requiere que el envío de correos esté configurado."
        )
    if tipo == "cita":
        extras = citas_service._validar_extras(payload.get("extras", []))
        minutos_extra = citas_service._minutos_de_extras(extras)
        disponibilidad = citas_service.calcular_disponibilidad(
            int(payload["id_barbero"]),
            str(payload["fecha"]),
            int(payload["id_servicio"]),
            duracion_adicional_minutos=minutos_extra,
        )
        inicio = str(payload["hora_inicio"])[:5]
        if not any(
            slot["hora_inicio"] == inicio and slot["disponible"]
            for slot in disponibilidad["slots"]
        ):
            raise Conflicto("Ese horario ya no está disponible. Elige otra franja.")
    else:
        lista_espera_service._validar_fecha_solicitada(
            str(payload["fecha_deseada"]), str(payload["franja_horaria"])
        )

    por_correo = int(
        fetch_value(
            """SELECT COUNT(*) FROM verificaciones_invitado
               WHERE correo = %s AND creado_en >= UTC_TIMESTAMP() - INTERVAL 1 HOUR""",
            (correo,),
            0,
        )
        or 0
    )
    por_ip = int(
        fetch_value(
            """SELECT COUNT(*) FROM verificaciones_invitado
               WHERE request_ip = %s AND creado_en >= UTC_TIMESTAMP() - INTERVAL 1 HOUR""",
            (ip,),
            0,
        )
        or 0
    ) if ip else 0
    if por_correo >= 3 or por_ip >= 8:
        raise DemasiadosIntentos("Solicitaste varios códigos. Espera una hora e intenta de nuevo.")

    execute_rowcount(
        "DELETE FROM verificaciones_invitado WHERE expira_en < UTC_TIMESTAMP() - INTERVAL 1 DAY"
    )
    codigo = f"{secrets.randbelow(1_000_000):06d}"
    solicitud_id = execute(
        """INSERT INTO verificaciones_invitado
               (tipo, correo, payload, codigo_hash, expira_en, request_ip)
           VALUES (%s, %s, %s, %s, %s, %s)""",
        (
            tipo,
            correo,
            json.dumps(payload, ensure_ascii=False),
            _hash_codigo(codigo),
            (datetime.now(timezone.utc) + timedelta(minutes=_MINUTOS_EXPIRACION))
            .replace(tzinfo=None)
            .strftime("%Y-%m-%d %H:%M:%S"),
            ip,
        ),
    )
    if not email_service.enviar_codigo_verificacion_invitado(
        correo, str(payload["nombre"]), codigo
    ):
        execute_rowcount(
            "DELETE FROM verificaciones_invitado WHERE id_solicitud = %s",
            (solicitud_id,),
        )
        raise ServicioNoDisponible(
            "No pudimos enviar el código. Revisa la configuración del correo e intenta de nuevo."
        )

    return {
        "id_solicitud": int(solicitud_id),
        "mensaje": "Enviamos un código de seis dígitos a tu correo. Vence en 10 minutos.",
    }


def verificar_codigo(
    id_solicitud: int, codigo: str, tipo: TipoInvitado
) -> tuple[dict[str, Any], int]:
    error: Exception | None = None
    payload: dict[str, Any] | None = None
    id_cliente: int | None = None
    with transaction() as cursor:
        cursor.execute(
            """SELECT tipo, correo, payload, codigo_hash, intentos, expira_en, consumido_en
               FROM verificaciones_invitado
               WHERE id_solicitud = %s
               FOR UPDATE""",
            (id_solicitud,),
        )
        fila = cursor.fetchone()
        if not fila or fila["tipo"] != tipo:
            error = DatosInvalidos("El código no es válido. Solicita uno nuevo.")
        elif fila["consumido_en"] is not None:
            error = Conflicto("Este código ya fue utilizado. Solicita uno nuevo.")
        elif fila["expira_en"] <= datetime.now(timezone.utc).replace(tzinfo=None):
            cursor.execute(
                "UPDATE verificaciones_invitado SET consumido_en = UTC_TIMESTAMP() WHERE id_solicitud = %s",
                (id_solicitud,),
            )
            error = DatosInvalidos("El código venció. Solicita uno nuevo.")
        elif int(fila["intentos"]) >= _MAX_INTENTOS:
            error = DemasiadosIntentos("Se agotaron los intentos. Solicita un código nuevo.")
        elif not hmac.compare_digest(str(fila["codigo_hash"]), _hash_codigo(codigo)):
            cursor.execute(
                "UPDATE verificaciones_invitado SET intentos = intentos + 1 WHERE id_solicitud = %s",
                (id_solicitud,),
            )
            error = NoAutorizado("El código es incorrecto.")
        else:
            payload = fila["payload"]
            if isinstance(payload, str):
                payload = json.loads(payload)
            id_cliente = _obtener_o_crear_cliente(cursor, payload)
            cursor.execute(
                "UPDATE verificaciones_invitado SET consumido_en = UTC_TIMESTAMP() WHERE id_solicitud = %s",
                (id_solicitud,),
            )

    if error:
        raise error
    if payload is None:
        raise DatosInvalidos("No se pudo recuperar la solicitud verificada.")
    if id_cliente is None:
        raise DatosInvalidos("No se pudo asociar la solicitud a un perfil de cliente.")
    return payload, id_cliente


def _obtener_o_crear_cliente(cursor: Any, payload: dict[str, Any]) -> int:
    from app.core.config import settings as app_settings

    correo = str(payload["correo"]).strip().lower()
    cursor.execute(
        """SELECT u.id_usuario, u.id_rol, u.nombre, u.correo, u.telefono,
                  u.activo, u.es_invitado, c.id_cliente
           FROM usuarios u
           LEFT JOIN clientes c ON c.id_usuario = u.id_usuario
           WHERE u.correo = %s
           FOR UPDATE""",
        (correo,),
    )
    usuario = cursor.fetchone()
    if usuario:
        if int(usuario["id_rol"]) != app_settings.ROL_CLIENTE or not usuario["id_cliente"]:
            raise Prohibido("Usa el correo asociado a tu perfil de cliente.")
        if not usuario["activo"]:
            raise Prohibido("La cuenta asociada a este correo está desactivada.")
        if usuario["es_invitado"]:
            cursor.execute(
                """UPDATE usuarios
                   SET nombre = %s, telefono = %s, email_verificado_at = UTC_TIMESTAMP()
                   WHERE id_usuario = %s""",
                (payload["nombre"], payload["telefono"], usuario["id_usuario"]),
            )
        else:
            cursor.execute(
                """UPDATE usuarios SET email_verificado_at = COALESCE(
                       email_verificado_at, UTC_TIMESTAMP())
                   WHERE id_usuario = %s""",
                (usuario["id_usuario"],),
            )
        return int(usuario["id_cliente"])

    cursor.execute(
        """INSERT INTO usuarios
               (id_rol, nombre, correo, telefono, contrasena_hash,
                es_invitado, email_verificado_at)
           VALUES (%s, %s, %s, %s, %s, 1, UTC_TIMESTAMP())""",
        (
            app_settings.ROL_CLIENTE,
            payload["nombre"],
            correo,
            payload["telefono"],
            hash_password(secrets.token_urlsafe(48)),
        ),
    )
    id_usuario = cursor.lastrowid
    cursor.execute("INSERT INTO clientes (id_usuario) VALUES (%s)", (id_usuario,))
    return int(cursor.lastrowid)


__all__ = ["solicitar_verificacion", "verificar_codigo", "TipoInvitado"]
