"""Resenas de citas completadas y recalculo del rating del barbero."""

from typing import Any

from app.core.exceptions import Conflicto, DatosInvalidos, NoEncontrado, Prohibido
from app.db.database import execute, fetch_all, fetch_one, fetch_value, transaction
from app.services import notificaciones_service
from app.services.auditoria_service import Accion, registrar_auditoria

SQL_RESENA = """
    SELECT r.id_resena, r.id_cita, r.id_cliente, r.id_barbero, r.calificacion,
           r.comentario, r.visible, r.creado_en,
           uc.nombre AS cliente_nombre,
           ub.nombre AS barbero_nombre,
           c.codigo_reserva, c.fecha AS fecha_cita,
           s.nombre AS servicio_nombre
    FROM resenas r
    JOIN clientes cl ON cl.id_cliente = r.id_cliente
    JOIN usuarios uc ON uc.id_usuario = cl.id_usuario
    JOIN barberos b ON b.id_barbero = r.id_barbero
    JOIN usuarios ub ON ub.id_usuario = b.id_usuario
    JOIN citas c ON c.id_cita = r.id_cita
    JOIN servicios s ON s.id_servicio = c.id_servicio
"""


# ----------------------------------------------------------------------
# Consultas
# ----------------------------------------------------------------------

def obtener(id_resena: int) -> dict:
    fila = fetch_one(f"{SQL_RESENA} WHERE r.id_resena = %s", (id_resena,))
    if not fila:
        raise NoEncontrado("La resena no existe")
    return fila


def obtener_por_cita(id_cita: int) -> dict | None:
    return fetch_one(f"{SQL_RESENA} WHERE r.id_cita = %s", (id_cita,))


def _filtros(
    id_barbero: int | None = None,
    id_cliente: int | None = None,
    calificacion: int | None = None,
    visible: bool | None = True,
) -> tuple[str, list[Any]]:
    condiciones: list[str] = []
    params: list[Any] = []
    if id_barbero is not None:
        condiciones.append("r.id_barbero = %s")
        params.append(id_barbero)
    if id_cliente is not None:
        condiciones.append("r.id_cliente = %s")
        params.append(id_cliente)
    if calificacion is not None:
        condiciones.append("r.calificacion = %s")
        params.append(calificacion)
    if visible is not None:
        condiciones.append("r.visible = %s")
        params.append(1 if visible else 0)
    where = f"WHERE {' AND '.join(condiciones)}" if condiciones else ""
    return where, params


def listar(limite: int = 50, offset: int = 0, **filtros) -> list[dict]:
    where, params = _filtros(**filtros)
    params = [*params, limite, offset]
    return fetch_all(
        f"{SQL_RESENA} {where} ORDER BY r.creado_en DESC, r.id_resena DESC LIMIT %s OFFSET %s", params
    )


def contar(**filtros) -> int:
    where, params = _filtros(**filtros)
    return int(
        fetch_value(f"SELECT COUNT(*) FROM resenas r {where}", params, por_defecto=0) or 0
    )


def resumen_barbero(id_barbero: int) -> dict:
    resumen = fetch_one(
        """SELECT COUNT(*) AS total,
                  ROUND(AVG(calificacion), 2) AS promedio,
                  SUM(calificacion = 5) AS cinco,
                  SUM(calificacion = 4) AS cuatro,
                  SUM(calificacion = 3) AS tres,
                  SUM(calificacion = 2) AS dos,
                  SUM(calificacion = 1) AS uno
           FROM resenas
           WHERE id_barbero = %s AND visible = 1""",
        (id_barbero,),
    ) or {}
    return {
        "id_barbero": id_barbero,
        "total": int(resumen.get("total") or 0),
        "promedio": float(resumen.get("promedio") or 0),
        "distribucion": {
            "5": int(resumen.get("cinco") or 0),
            "4": int(resumen.get("cuatro") or 0),
            "3": int(resumen.get("tres") or 0),
            "2": int(resumen.get("dos") or 0),
            "1": int(resumen.get("uno") or 0),
        },
    }


# ----------------------------------------------------------------------
# Creacion y moderacion
# ----------------------------------------------------------------------

def _recalcular_rating(cursor: Any, id_barbero: int) -> None:
    cursor.execute(
        """SELECT COUNT(*) AS total, COALESCE(AVG(calificacion), 0) AS promedio
           FROM resenas WHERE id_barbero = %s AND visible = 1""",
        (id_barbero,),
    )
    fila = cursor.fetchone() or {}
    total = int(fila.get("total") or 0)
    promedio = round(float(fila.get("promedio") or 0), 2)
    cursor.execute(
        "UPDATE barberos SET rating = %s, total_resenas = %s WHERE id_barbero = %s",
        (promedio, total, id_barbero),
    )


def crear(datos: dict, actor: Any = None, contexto: dict | None = None) -> dict:
    contexto = contexto or {}
    id_cita = int(datos["id_cita"])

    cita = fetch_one(
        """SELECT c.id_cita, c.codigo_reserva, c.estado, c.id_cliente, c.id_barbero,
                  b.id_usuario AS id_usuario_barbero
           FROM citas c
           JOIN barberos b ON b.id_barbero = c.id_barbero
           WHERE c.id_cita = %s""",
        (id_cita,),
    )
    if not cita:
        raise NoEncontrado("La cita no existe")
    if cita["estado"] != "completada":
        raise Conflicto("Solo se pueden resenar citas completadas")

    if actor is not None and getattr(actor, "es_cliente", False):
        if int(cita["id_cliente"]) != int(getattr(actor, "id_cliente", -1) or -1):
            raise Prohibido("Solo puedes resenar tus propias citas")

    if obtener_por_cita(id_cita):
        raise Conflicto("Esta cita ya tiene una resena")

    calificacion = int(datos["calificacion"])
    if not 1 <= calificacion <= 5:
        raise DatosInvalidos("La calificacion debe estar entre 1 y 5")

    with transaction() as cursor:
        cursor.execute(
            """INSERT INTO resenas (id_cita, id_cliente, id_barbero, calificacion, comentario)
               VALUES (%s, %s, %s, %s, %s)""",
            (
                id_cita, cita["id_cliente"], cita["id_barbero"], calificacion,
                datos.get("comentario"),
            ),
        )
        id_resena = cursor.lastrowid
        _recalcular_rating(cursor, int(cita["id_barbero"]))

    registrar_auditoria(
        Accion.RESENA_CREADA, "resenas", id_resena, getattr(actor, "id_usuario", None),
        contexto.get("ip"), contexto.get("user_agent"),
        {"id_cita": id_cita, "calificacion": calificacion},
    )
    notificaciones_service.crear_notificacion(
        int(cita["id_usuario_barbero"]), "Nueva resena",
        f"Recibiste una resena de {calificacion} estrellas por la cita "
        f"{cita['codigo_reserva']}.",
        "resena",
    )
    return obtener(id_resena)


def actualizar(id_resena: int, datos: dict, actor: Any = None) -> dict:
    resena = obtener(id_resena)

    if actor is not None and not getattr(actor, "es_admin", False):
        if int(resena["id_cliente"]) != int(getattr(actor, "id_cliente", -1) or -1):
            raise Prohibido("Esta resena no te pertenece")

    campos: list[str] = []
    params: list[Any] = []
    if datos.get("calificacion") is not None:
        calificacion = int(datos["calificacion"])
        if not 1 <= calificacion <= 5:
            raise DatosInvalidos("La calificacion debe estar entre 1 y 5")
        campos.append("calificacion = %s")
        params.append(calificacion)
    if "comentario" in datos and datos["comentario"] is not None:
        campos.append("comentario = %s")
        params.append(datos["comentario"])

    if not campos:
        raise DatosInvalidos("No se enviaron campos para actualizar")

    params.append(id_resena)
    with transaction() as cursor:
        cursor.execute(f"UPDATE resenas SET {', '.join(campos)} WHERE id_resena = %s", params)
        _recalcular_rating(cursor, int(resena["id_barbero"]))
    return obtener(id_resena)


def cambiar_visibilidad(id_resena: int, visible: bool, actor: Any = None) -> dict:
    """Moderacion: oculta o vuelve a publicar una resena y recalcula el rating."""
    if actor is not None and not getattr(actor, "es_admin", False):
        raise Prohibido("Solo un administrador puede moderar resenas")

    resena = obtener(id_resena)
    with transaction() as cursor:
        cursor.execute(
            "UPDATE resenas SET visible = %s WHERE id_resena = %s",
            (1 if visible else 0, id_resena),
        )
        _recalcular_rating(cursor, int(resena["id_barbero"]))
    return obtener(id_resena)


def eliminar(id_resena: int) -> None:
    resena = obtener(id_resena)
    with transaction() as cursor:
        cursor.execute("DELETE FROM resenas WHERE id_resena = %s", (id_resena,))
        _recalcular_rating(cursor, int(resena["id_barbero"]))


def citas_pendientes_de_resena(id_cliente: int) -> list[dict]:
    return fetch_all(
        """SELECT c.id_cita, c.codigo_reserva, c.fecha, c.hora_inicio,
                  s.nombre AS servicio_nombre, u.nombre AS barbero_nombre
           FROM citas c
           JOIN servicios s ON s.id_servicio = c.id_servicio
           JOIN barberos b ON b.id_barbero = c.id_barbero
           JOIN usuarios u ON u.id_usuario = b.id_usuario
           LEFT JOIN resenas r ON r.id_cita = c.id_cita
           WHERE c.id_cliente = %s AND c.estado = 'completada' AND r.id_resena IS NULL
           ORDER BY c.fecha DESC
           LIMIT 20""",
        (id_cliente,),
    )


__all__ = [
    "obtener",
    "obtener_por_cita",
    "listar",
    "contar",
    "resumen_barbero",
    "crear",
    "actualizar",
    "cambiar_visibilidad",
    "eliminar",
    "citas_pendientes_de_resena",
]
