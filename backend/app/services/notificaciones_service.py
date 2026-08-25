"""Notificaciones internas de la aplicacion (campanita del frontend)."""

import logging
from typing import Any

from app.core.exceptions import NoEncontrado, Prohibido
from app.db.database import MySQLError, execute, execute_rowcount, fetch_all, fetch_one, fetch_value

logger = logging.getLogger("globde.notificaciones")


def crear_notificacion(
    id_usuario: int,
    titulo: str,
    mensaje: str,
    tipo: str = "sistema",
    url_accion: str | None = None,
    silencioso: bool = True,
) -> int | None:
    """Crea una notificacion. Con silencioso=True nunca propaga errores."""
    try:
        return execute(
            """INSERT INTO notificaciones (id_usuario, tipo, titulo, mensaje, url_accion)
               VALUES (%s, %s, %s, %s, %s)""",
            (id_usuario, tipo, titulo[:160], mensaje, url_accion),
        )
    except MySQLError as exc:
        if not silencioso:
            raise
        logger.warning("No se pudo crear la notificacion para %s: %s", id_usuario, exc)
        return None


def notificar_a_rol(
    id_rol: int | None, titulo: str, mensaje: str, tipo: str = "sistema",
    url_accion: str | None = None,
) -> list[dict]:
    """Crea la misma notificacion para todos los usuarios activos de un rol."""
    if id_rol is None:
        destinatarios = fetch_all(
            "SELECT id_usuario, nombre, correo FROM usuarios WHERE activo = 1"
        )
    else:
        destinatarios = fetch_all(
            "SELECT id_usuario, nombre, correo FROM usuarios WHERE activo = 1 AND id_rol = %s",
            (id_rol,),
        )
    for destinatario in destinatarios:
        crear_notificacion(
            int(destinatario["id_usuario"]), titulo, mensaje, tipo, url_accion
        )
    return destinatarios


def listar(
    id_usuario: int, solo_no_leidas: bool = False, limite: int = 50, offset: int = 0
) -> list[dict]:
    condiciones = ["id_usuario = %s"]
    params: list[Any] = [id_usuario]
    if solo_no_leidas:
        condiciones.append("leida = 0")
    params.extend([limite, offset])
    return fetch_all(
        f"""SELECT id_notificacion, id_usuario, tipo, titulo, mensaje, leida,
                   leida_en, url_accion, creado_en
            FROM notificaciones
            WHERE {' AND '.join(condiciones)}
            ORDER BY creado_en DESC, id_notificacion DESC
            LIMIT %s OFFSET %s""",
        params,
    )


def contar(id_usuario: int, solo_no_leidas: bool = False) -> int:
    """Total de notificaciones del usuario (para paginar)."""
    sql = "SELECT COUNT(*) FROM notificaciones WHERE id_usuario = %s"
    if solo_no_leidas:
        sql += " AND leida = 0"
    return int(fetch_value(sql, (id_usuario,), por_defecto=0) or 0)


def contar_no_leidas(id_usuario: int) -> int:
    return int(
        fetch_value(
            "SELECT COUNT(*) FROM notificaciones WHERE id_usuario = %s AND leida = 0",
            (id_usuario,),
            por_defecto=0,
        ) or 0
    )


def marcar_leida(id_notificacion: int, id_usuario: int) -> dict:
    fila = fetch_one(
        "SELECT id_notificacion, id_usuario FROM notificaciones WHERE id_notificacion = %s",
        (id_notificacion,),
    )
    if not fila:
        raise NoEncontrado("La notificacion no existe")
    if int(fila["id_usuario"]) != id_usuario:
        raise Prohibido("Esta notificacion no te pertenece")

    execute(
        """UPDATE notificaciones
           SET leida = 1, leida_en = COALESCE(leida_en, NOW())
           WHERE id_notificacion = %s""",
        (id_notificacion,),
    )
    return obtener(id_notificacion)


def marcar_todas_leidas(id_usuario: int) -> int:
    return execute_rowcount(
        """UPDATE notificaciones
           SET leida = 1, leida_en = NOW()
           WHERE id_usuario = %s AND leida = 0""",
        (id_usuario,),
    )


def obtener(id_notificacion: int) -> dict:
    fila = fetch_one(
        """SELECT id_notificacion, id_usuario, tipo, titulo, mensaje, leida,
                  leida_en, url_accion, creado_en
           FROM notificaciones WHERE id_notificacion = %s""",
        (id_notificacion,),
    )
    if not fila:
        raise NoEncontrado("La notificacion no existe")
    return fila


def eliminar(id_notificacion: int, id_usuario: int) -> None:
    fila = fetch_one(
        "SELECT id_usuario FROM notificaciones WHERE id_notificacion = %s",
        (id_notificacion,),
    )
    if not fila:
        raise NoEncontrado("La notificacion no existe")
    if int(fila["id_usuario"]) != id_usuario:
        raise Prohibido("Esta notificacion no te pertenece")
    execute("DELETE FROM notificaciones WHERE id_notificacion = %s", (id_notificacion,))


__all__ = [
    "crear_notificacion",
    "notificar_a_rol",
    "listar",
    "contar",
    "contar_no_leidas",
    "marcar_leida",
    "marcar_todas_leidas",
    "obtener",
    "eliminar",
]
