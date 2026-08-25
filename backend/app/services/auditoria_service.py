import json
import logging
from typing import Any

from app.db.database import MySQLError, execute, fetch_all, fetch_value

logger = logging.getLogger("globde.auditoria")


# ----------------------------------------------------------------------
# Acciones estandar (evita strings sueltos por todo el codigo)
# ----------------------------------------------------------------------

class Accion:
    LOGIN_EXITOSO = "login_exitoso"
    LOGIN_FALLIDO = "login_fallido"
    LOGOUT = "logout"
    REGISTRO_USUARIO = "registro_usuario"
    USUARIO_CREADO = "usuario_creado"
    USUARIO_ACTUALIZADO = "usuario_actualizado"
    USUARIO_DESACTIVADO = "usuario_desactivado"
    USUARIO_REACTIVADO = "usuario_reactivado"
    PASSWORD_RECUPERACION_SOLICITADA = "password_recuperacion_solicitada"
    PASSWORD_CAMBIADA = "password_cambiada"
    CLIENTE_CREADO = "cliente_creado"
    CLIENTE_ACTUALIZADO = "cliente_actualizado"
    BARBERO_ACTUALIZADO = "barbero_actualizado"
    HORARIO_ACTUALIZADO = "horario_actualizado"
    BLOQUEO_CREADO = "bloqueo_creado"
    BLOQUEO_ELIMINADO = "bloqueo_eliminado"
    SERVICIO_CREADO = "servicio_creado"
    SERVICIO_ACTUALIZADO = "servicio_actualizado"
    SERVICIO_DESACTIVADO = "servicio_desactivado"
    CITA_CREADA = "cita_creada"
    CITA_ACTUALIZADA = "cita_actualizada"
    CITA_ESTADO_CAMBIADO = "cita_estado_cambiado"
    CITA_CANCELADA = "cita_cancelada"
    FACTURA_EMITIDA = "factura_emitida"
    FACTURA_PAGADA = "factura_pagada"
    FACTURA_ANULADA = "factura_anulada"
    PUNTOS_AJUSTADOS = "puntos_ajustados"
    PUNTOS_CANJEADOS = "puntos_canjeados"
    RESENA_CREADA = "resena_creada"
    RESENA_ACTUALIZADA = "resena_actualizada"
    RESENA_OCULTADA = "resena_ocultada"
    RESENA_ELIMINADA = "resena_eliminada"
    PENALIDAD_CREADA = "penalidad_creada"
    PENALIDAD_APLICADA = "penalidad_aplicada"
    PENALIDAD_ANULADA = "penalidad_anulada"
    NOTIFICACION_MASIVA = "notificacion_masiva"


def registrar_auditoria(
    accion: str,
    entidad: str,
    entidad_id: int | None = None,
    id_usuario: int | None = None,
    ip: str | None = None,
    user_agent: str | None = None,
    detalles: dict[str, Any] | None = None,
) -> None:
    
    try:
        execute(
            """INSERT INTO audit_logs
                   (id_usuario, accion, entidad, entidad_id, ip, user_agent, detalles)
               VALUES (%s, %s, %s, %s, %s, %s, %s)""",
            (
                id_usuario,
                accion,
                entidad,
                entidad_id,
                ip,
                (user_agent or None) and user_agent[:255],
                json.dumps(detalles, ensure_ascii=False, default=str) if detalles else None,
            ),
        )
    except MySQLError as exc:  # pragma: no cover - no debe romper el flujo
        logger.warning("No se pudo registrar auditoria '%s': %s", accion, exc)


def registrar_intento_login(
    correo: str,
    exitoso: bool,
    id_usuario: int | None = None,
    motivo: str | None = None,
    ip: str | None = None,
    user_agent: str | None = None,
) -> None:
    
    try:
        execute(
            """INSERT INTO login_attempts
                   (id_usuario, correo_intentado, exitoso, motivo, ip, user_agent)
               VALUES (%s, %s, %s, %s, %s, %s)""",
            (
                id_usuario,
                correo[:180],
                1 if exitoso else 0,
                (motivo or None) and motivo[:120],
                ip,
                (user_agent or None) and user_agent[:255],
            ),
        )
    except MySQLError as exc: 
        logger.warning("No se pudo registrar intento de login: %s", exc)


def contar_intentos_fallidos(correo: str, ventana_minutos: int) -> int:
    
    try:
        return int(
            fetch_value(
                """SELECT COUNT(*) AS total
                   FROM login_attempts
                   WHERE correo_intentado = %s
                     AND exitoso = 0
                     AND creado_en >= DATE_SUB(NOW(), INTERVAL %s MINUTE)""",
                (correo, ventana_minutos),
                por_defecto=0,
            )
            or 0
        )
    except MySQLError:  
        return 0


def listar_auditoria(
    limite: int = 100,
    offset: int = 0,
    accion: str | None = None,
    entidad: str | None = None,
    id_usuario: int | None = None,
) -> list[dict]:
    condiciones: list[str] = []
    params: list[Any] = []
    if accion:
        condiciones.append("a.accion = %s")
        params.append(accion)
    if entidad:
        condiciones.append("a.entidad = %s")
        params.append(entidad)
    if id_usuario:
        condiciones.append("a.id_usuario = %s")
        params.append(id_usuario)

    where = f"WHERE {' AND '.join(condiciones)}" if condiciones else ""
    params.extend([limite, offset])

    return fetch_all(
        f"""SELECT a.id_audit, a.id_usuario, u.nombre AS usuario_nombre,
                   a.accion, a.entidad, a.entidad_id, a.ip, a.detalles, a.creado_en
            FROM audit_logs a
            LEFT JOIN usuarios u ON u.id_usuario = a.id_usuario
            {where}
            ORDER BY a.creado_en DESC, a.id_audit DESC
            LIMIT %s OFFSET %s""",
        params,
    )


def listar_intentos_login(limite: int = 100, solo_fallidos: bool = False) -> list[dict]:
    where = "WHERE exitoso = 0" if solo_fallidos else ""
    filas = fetch_all(
        f"""SELECT id_attempt, id_usuario, correo_intentado, exitoso, motivo, ip, creado_en
            FROM login_attempts
            {where}
            ORDER BY creado_en DESC
            LIMIT %s""",
        (limite,),
    )
    for fila in filas:
        # TINYINT(1) -> booleano real y alias estable para el frontend.
        fila["exitoso"] = bool(fila["exitoso"])
        fila["correo"] = fila["correo_intentado"]
    return filas


__all__ = [
    "Accion",
    "registrar_auditoria",
    "registrar_intento_login",
    "contar_intentos_fallidos",
    "listar_auditoria",
    "listar_intentos_login",
]
