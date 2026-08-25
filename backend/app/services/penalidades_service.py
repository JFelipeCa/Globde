"""Penalidades por inasistencia, cancelacion tardia u otros incumplimientos."""

from typing import Any

from app.core.exceptions import Conflicto, NoEncontrado
from app.db.database import execute, fetch_all, fetch_one, fetch_value, transaction
from app.services import notificaciones_service, puntos_service
from app.services.auditoria_service import Accion, registrar_auditoria

SQL_PENALIDAD = """
    SELECT p.id_penalidad, p.id_cliente, p.id_cita, p.tipo, p.descripcion,
           p.puntos_descontados, p.monto, p.estado, p.creado_en, p.aplicada_en, p.anulada_en,
           u.nombre AS cliente_nombre, u.id_usuario AS id_usuario_cliente,
           c.codigo_reserva
    FROM penalidades p
    JOIN clientes cl ON cl.id_cliente = p.id_cliente
    JOIN usuarios u ON u.id_usuario = cl.id_usuario
    LEFT JOIN citas c ON c.id_cita = p.id_cita
"""


def obtener(id_penalidad: int) -> dict:
    fila = fetch_one(f"{SQL_PENALIDAD} WHERE p.id_penalidad = %s", (id_penalidad,))
    if not fila:
        raise NoEncontrado("La penalidad no existe")
    return fila


def listar(
    id_cliente: int | None = None,
    estado: str | None = None,
    tipo: str | None = None,
    limite: int = 50,
    offset: int = 0,
) -> list[dict]:
    condiciones: list[str] = []
    params: list[Any] = []
    if id_cliente is not None:
        condiciones.append("p.id_cliente = %s")
        params.append(id_cliente)
    if estado:
        condiciones.append("p.estado = %s")
        params.append(estado)
    if tipo:
        condiciones.append("p.tipo = %s")
        params.append(tipo)
    where = f"WHERE {' AND '.join(condiciones)}" if condiciones else ""
    params.extend([limite, offset])
    return fetch_all(
        f"{SQL_PENALIDAD} {where} ORDER BY p.creado_en DESC, p.id_penalidad DESC LIMIT %s OFFSET %s", params
    )


def contar(id_cliente: int | None = None, estado: str | None = None) -> int:
    condiciones: list[str] = []
    params: list[Any] = []
    if id_cliente is not None:
        condiciones.append("id_cliente = %s")
        params.append(id_cliente)
    if estado:
        condiciones.append("estado = %s")
        params.append(estado)
    where = f"WHERE {' AND '.join(condiciones)}" if condiciones else ""
    return int(fetch_value(f"SELECT COUNT(*) FROM penalidades {where}", params, por_defecto=0) or 0)


def crear(datos: dict, actor: Any = None, contexto: dict | None = None) -> dict:
    """Registra una penalidad. Si descuenta puntos, se aplica el movimiento."""
    contexto = contexto or {}
    id_cliente = int(datos["id_cliente"])

    cliente = fetch_one(
        """SELECT c.id_cliente, c.id_usuario, u.nombre
           FROM clientes c JOIN usuarios u ON u.id_usuario = c.id_usuario
           WHERE c.id_cliente = %s""",
        (id_cliente,),
    )
    if not cliente:
        raise NoEncontrado("El cliente no existe")

    id_cita = datos.get("id_cita")
    if id_cita is not None:
        cita = fetch_one(
            "SELECT id_cliente FROM citas WHERE id_cita = %s", (int(id_cita),)
        )
        if not cita:
            raise NoEncontrado("La cita indicada no existe")
        if int(cita["id_cliente"]) != id_cliente:
            raise Conflicto("La cita no pertenece a ese cliente")

    puntos_descontados = int(datos.get("puntos_descontados") or 0)
    aplicar_ya = datos.get("estado", "aplicada") == "aplicada"

    with transaction() as cursor:
        cursor.execute(
            """INSERT INTO penalidades
                   (id_cliente, id_cita, tipo, descripcion, puntos_descontados, monto,
                    estado, aplicada_en)
               VALUES (%s, %s, %s, %s, %s, %s, %s, %s)""",
            (
                id_cliente, id_cita, datos.get("tipo") or "otro", datos["descripcion"],
                puntos_descontados, float(datos.get("monto") or 0),
                "aplicada" if aplicar_ya else "pendiente",
                None,
            ),
        )
        id_penalidad = cursor.lastrowid
        if aplicar_ya:
            cursor.execute(
                "UPDATE penalidades SET aplicada_en = NOW() WHERE id_penalidad = %s",
                (id_penalidad,),
            )
            if puntos_descontados > 0:
                puntos_service.aplicar_movimiento(
                    cursor, id_cliente, "penalizacion", -puntos_descontados,
                    datos["descripcion"], id_cita, getattr(actor, "id_usuario", None),
                )

    registrar_auditoria(
        Accion.PENALIDAD_CREADA, "penalidades", id_penalidad,
        getattr(actor, "id_usuario", None), contexto.get("ip"), contexto.get("user_agent"),
        {"id_cliente": id_cliente, "tipo": datos.get("tipo"), "puntos": puntos_descontados},
    )
    notificaciones_service.crear_notificacion(
        int(cliente["id_usuario"]), "Penalidad registrada",
        datos["descripcion"], "sistema",
    )
    return obtener(id_penalidad)


def aplicar(id_penalidad: int, actor: Any = None) -> dict:
    penalidad = obtener(id_penalidad)
    if penalidad["estado"] != "pendiente":
        raise Conflicto(f"La penalidad ya esta {penalidad['estado']}")

    puntos = int(penalidad.get("puntos_descontados") or 0)
    with transaction() as cursor:
        cursor.execute(
            "UPDATE penalidades SET estado = 'aplicada', aplicada_en = NOW() WHERE id_penalidad = %s",
            (id_penalidad,),
        )
        if puntos > 0:
            puntos_service.aplicar_movimiento(
                cursor, int(penalidad["id_cliente"]), "penalizacion", -puntos,
                penalidad["descripcion"], penalidad.get("id_cita"),
                getattr(actor, "id_usuario", None),
            )
    return obtener(id_penalidad)


def anular(id_penalidad: int, motivo: str | None = None, actor: Any = None) -> dict:
    penalidad = obtener(id_penalidad)
    if penalidad["estado"] == "anulada":
        raise Conflicto("La penalidad ya esta anulada")

    puntos = int(penalidad.get("puntos_descontados") or 0)
    devolver = penalidad["estado"] == "aplicada" and puntos > 0

    with transaction() as cursor:
        cursor.execute(
            """UPDATE penalidades
               SET estado = 'anulada', anulada_en = NOW(),
                   descripcion = CONCAT(descripcion, %s)
               WHERE id_penalidad = %s""",
            (f" | Anulada: {motivo}" if motivo else " | Anulada", id_penalidad),
        )
        if devolver:
            puntos_service.aplicar_movimiento(
                cursor, int(penalidad["id_cliente"]), "ajuste", puntos,
                f"Devolucion por anulacion de penalidad #{id_penalidad}",
                penalidad.get("id_cita"), getattr(actor, "id_usuario", None),
            )

    notificaciones_service.crear_notificacion(
        int(penalidad["id_usuario_cliente"]), "Penalidad anulada",
        motivo or "Se anulo una penalidad de tu cuenta.", "sistema",
    )
    return obtener(id_penalidad)


def eliminar(id_penalidad: int) -> None:
    obtener(id_penalidad)
    execute("DELETE FROM penalidades WHERE id_penalidad = %s", (id_penalidad,))


__all__ = ["obtener", "listar", "contar", "crear", "aplicar", "anular", "eliminar"]
