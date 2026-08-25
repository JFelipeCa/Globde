"""Barberos: perfil, servicios asignados, horarios, bloqueos y agenda."""

from datetime import date as Fecha
from typing import Any

from app.core.exceptions import Conflicto, DatosInvalidos, NoEncontrado
from app.db.database import execute, execute_rowcount, fetch_all, fetch_one, fetch_value, transaction
from app.db.serializers import hhmm

DIAS_SEMANA = {
    1: "Lunes",
    2: "Martes",
    3: "Miercoles",
    4: "Jueves",
    5: "Viernes",
    6: "Sabado",
    7: "Domingo",
}

SQL_BARBERO = """
    SELECT b.id_barbero, b.id_usuario, u.nombre, u.correo, u.telefono, u.activo,
           b.titulo, b.experiencia_anios, b.bio, b.foto_url, b.rating,
           b.total_resenas, b.citas_completadas, b.disponible, b.color
    FROM barberos b
    JOIN usuarios u ON u.id_usuario = b.id_usuario
"""


# ----------------------------------------------------------------------
# Consultas de barbero
# ----------------------------------------------------------------------

def obtener(id_barbero: int) -> dict:
    fila = fetch_one(f"{SQL_BARBERO} WHERE b.id_barbero = %s", (id_barbero,))
    if not fila:
        raise NoEncontrado("El barbero no existe")
    return fila


def obtener_por_usuario(id_usuario: int) -> dict | None:
    return fetch_one(f"{SQL_BARBERO} WHERE b.id_usuario = %s", (id_usuario,))


def listar(
    disponible: bool | None = None,
    activo: bool | None = True,
    buscar: str | None = None,
    id_servicio: int | None = None,
) -> list[dict]:
    condiciones: list[str] = []
    params: list[Any] = []
    if disponible is not None:
        condiciones.append("b.disponible = %s")
        params.append(1 if disponible else 0)
    if activo is not None:
        condiciones.append("u.activo = %s")
        params.append(1 if activo else 0)
    if buscar:
        condiciones.append("(u.nombre LIKE %s OR b.titulo LIKE %s)")
        patron = f"%{buscar}%"
        params.extend([patron, patron])

    join = ""
    if id_servicio is not None:
        join = "JOIN barbero_servicio bs ON bs.id_barbero = b.id_barbero AND bs.activo = 1"
        condiciones.append("bs.id_servicio = %s")
        params.append(id_servicio)

    where = f"WHERE {' AND '.join(condiciones)}" if condiciones else ""
    return fetch_all(
        f"""SELECT b.id_barbero, b.id_usuario, u.nombre, u.correo, u.telefono, u.activo,
                   b.titulo, b.experiencia_anios, b.bio, b.foto_url, b.rating,
                   b.total_resenas, b.citas_completadas, b.disponible, b.color
            FROM barberos b
            JOIN usuarios u ON u.id_usuario = b.id_usuario
            {join}
            {where}
            ORDER BY b.disponible DESC, b.rating DESC, u.nombre ASC""",
        params,
    )


def ranking() -> list[dict]:
    return fetch_all(
        """SELECT * FROM v_ranking_barberos
           ORDER BY rating_resenas DESC, citas_completadas_reales DESC, nombre ASC"""
    )


def perfil_completo(id_barbero: int) -> dict:
    barbero = obtener(id_barbero)
    barbero["servicios"] = servicios_asignados(id_barbero)
    barbero["horarios"] = listar_horarios(id_barbero)
    barbero["resenas_recientes"] = fetch_all(
        """SELECT r.id_resena, r.calificacion, r.comentario, r.creado_en,
                  u.nombre AS cliente_nombre, s.nombre AS servicio_nombre
           FROM resenas r
           JOIN clientes c ON c.id_cliente = r.id_cliente
           JOIN usuarios u ON u.id_usuario = c.id_usuario
           JOIN citas ci ON ci.id_cita = r.id_cita
           JOIN servicios s ON s.id_servicio = ci.id_servicio
           WHERE r.id_barbero = %s AND r.visible = 1
           ORDER BY r.creado_en DESC
           LIMIT 5""",
        (id_barbero,),
    )
    return barbero


# ----------------------------------------------------------------------
# Actualizacion del perfil
# ----------------------------------------------------------------------

CAMPOS_BARBERO = ("titulo", "experiencia_anios", "bio", "foto_url", "disponible", "color")


def actualizar(id_barbero: int, datos: dict) -> dict:
    obtener(id_barbero)
    campos: list[str] = []
    params: list[Any] = []
    for campo in CAMPOS_BARBERO:
        if campo in datos and datos[campo] is not None:
            valor = datos[campo]
            if campo == "disponible":
                valor = 1 if valor else 0
            campos.append(f"{campo} = %s")
            params.append(valor)

    if not campos:
        raise DatosInvalidos("No se enviaron campos para actualizar")

    params.append(id_barbero)
    execute(f"UPDATE barberos SET {', '.join(campos)} WHERE id_barbero = %s", params)
    return obtener(id_barbero)


def cambiar_disponibilidad(id_barbero: int, disponible: bool) -> dict:
    obtener(id_barbero)
    execute(
        "UPDATE barberos SET disponible = %s WHERE id_barbero = %s",
        (1 if disponible else 0, id_barbero),
    )
    return obtener(id_barbero)


# ----------------------------------------------------------------------
# Servicios asignados
# ----------------------------------------------------------------------

def servicios_asignados(id_barbero: int) -> list[dict]:
    return fetch_all(
        """SELECT s.id_servicio, s.nombre, s.categoria, s.duracion_minutos,
                  s.puntos_otorga, s.activo,
                  COALESCE(bs.precio_personalizado, s.precio) AS precio,
                  bs.precio_personalizado
           FROM barbero_servicio bs
           JOIN servicios s ON s.id_servicio = bs.id_servicio
           WHERE bs.id_barbero = %s AND bs.activo = 1
           ORDER BY s.categoria, s.nombre""",
        (id_barbero,),
    )


def asignar_servicios(id_barbero: int, ids_servicios: list[int]) -> list[dict]:
    """Reemplaza la lista de servicios que presta el barbero."""
    obtener(id_barbero)
    unicos = sorted(set(int(i) for i in ids_servicios))

    if unicos:
        marcadores = ", ".join(["%s"] * len(unicos))
        existentes = fetch_all(
            f"SELECT id_servicio FROM servicios WHERE id_servicio IN ({marcadores})", unicos
        )
        if len(existentes) != len(unicos):
            raise DatosInvalidos("Uno o mas servicios enviados no existen")

    with transaction() as cursor:
        cursor.execute("DELETE FROM barbero_servicio WHERE id_barbero = %s", (id_barbero,))
        for id_servicio in unicos:
            cursor.execute(
                """INSERT INTO barbero_servicio (id_barbero, id_servicio, activo)
                   VALUES (%s, %s, 1)""",
                (id_barbero, id_servicio),
            )
    return servicios_asignados(id_barbero)


def presta_servicio(id_barbero: int, id_servicio: int) -> bool:
    """True si el barbero presta el servicio (o si no tiene restricciones)."""
    total_asignados = int(
        fetch_value(
            "SELECT COUNT(*) FROM barbero_servicio WHERE id_barbero = %s AND activo = 1",
            (id_barbero,),
            por_defecto=0,
        ) or 0
    )
    if total_asignados == 0:
        # Sin asignaciones explicitas, el barbero puede prestar cualquier servicio.
        return True
    return int(
        fetch_value(
            """SELECT COUNT(*) FROM barbero_servicio
               WHERE id_barbero = %s AND id_servicio = %s AND activo = 1""",
            (id_barbero, id_servicio),
            por_defecto=0,
        ) or 0
    ) > 0


# ----------------------------------------------------------------------
# Horarios semanales
# ----------------------------------------------------------------------

def listar_horarios(id_barbero: int, solo_activos: bool = True) -> list[dict]:
    filtro = "AND activo = 1" if solo_activos else ""
    filas = fetch_all(
        f"""SELECT id_horario, id_barbero, dia_semana, hora_inicio, hora_fin, activo
            FROM horarios_barbero
            WHERE id_barbero = %s {filtro}
            ORDER BY dia_semana, hora_inicio""",
        (id_barbero,),
    )
    for fila in filas:
        fila["hora_inicio"] = hhmm(fila["hora_inicio"])
        fila["hora_fin"] = hhmm(fila["hora_fin"])
        fila["dia_nombre"] = DIAS_SEMANA.get(int(fila["dia_semana"]))
    return filas


def _valida_solapes_horarios(horarios: list[dict]) -> None:
    por_dia: dict[int, list[tuple[str, str]]] = {}
    for horario in horarios:
        dia = int(horario["dia_semana"])
        inicio, fin = str(horario["hora_inicio"]), str(horario["hora_fin"])
        for otro_inicio, otro_fin in por_dia.get(dia, []):
            if inicio < otro_fin and fin > otro_inicio:
                raise DatosInvalidos(
                    f"Los horarios del dia {DIAS_SEMANA.get(dia, dia)} se solapan"
                )
        por_dia.setdefault(dia, []).append((inicio, fin))


def reemplazar_horarios(id_barbero: int, horarios: list[dict]) -> list[dict]:
    """Sustituye toda la agenda semanal del barbero."""
    obtener(id_barbero)
    _valida_solapes_horarios(horarios)

    with transaction() as cursor:
        cursor.execute("DELETE FROM horarios_barbero WHERE id_barbero = %s", (id_barbero,))
        for horario in horarios:
            cursor.execute(
                """INSERT INTO horarios_barbero
                       (id_barbero, dia_semana, hora_inicio, hora_fin, activo)
                   VALUES (%s, %s, %s, %s, %s)""",
                (
                    id_barbero,
                    int(horario["dia_semana"]),
                    str(horario["hora_inicio"]),
                    str(horario["hora_fin"]),
                    1 if horario.get("activo", True) else 0,
                ),
            )
    return listar_horarios(id_barbero, solo_activos=False)


def agregar_horario(id_barbero: int, horario: dict) -> list[dict]:
    actuales = listar_horarios(id_barbero, solo_activos=False)
    _valida_solapes_horarios([*actuales, horario])
    execute(
        """INSERT INTO horarios_barbero (id_barbero, dia_semana, hora_inicio, hora_fin, activo)
           VALUES (%s, %s, %s, %s, %s)""",
        (
            id_barbero,
            int(horario["dia_semana"]),
            str(horario["hora_inicio"]),
            str(horario["hora_fin"]),
            1 if horario.get("activo", True) else 0,
        ),
    )
    return listar_horarios(id_barbero, solo_activos=False)


def eliminar_horario(id_barbero: int, id_horario: int) -> None:
    filas = execute_rowcount(
        "DELETE FROM horarios_barbero WHERE id_horario = %s AND id_barbero = %s",
        (id_horario, id_barbero),
    )
    if filas == 0:
        raise NoEncontrado("El horario no existe para este barbero")


def horarios_del_dia(id_barbero: int, fecha: Fecha) -> list[dict]:
    """Franjas laborales del barbero para una fecha (1=Lunes ... 7=Domingo)."""
    dia_semana = fecha.isoweekday()
    filas = fetch_all(
        """SELECT hora_inicio, hora_fin
           FROM horarios_barbero
           WHERE id_barbero = %s AND dia_semana = %s AND activo = 1
           ORDER BY hora_inicio""",
        (id_barbero, dia_semana),
    )
    return [
        {"hora_inicio": hhmm(f["hora_inicio"]), "hora_fin": hhmm(f["hora_fin"])} for f in filas
    ]


# ----------------------------------------------------------------------
# Bloqueos de agenda
# ----------------------------------------------------------------------

def listar_bloqueos(
    id_barbero: int, desde: str | None = None, hasta: str | None = None
) -> list[dict]:
    condiciones = ["id_barbero = %s"]
    params: list[Any] = [id_barbero]
    if desde:
        condiciones.append("fecha >= %s")
        params.append(desde)
    if hasta:
        condiciones.append("fecha <= %s")
        params.append(hasta)

    filas = fetch_all(
        f"""SELECT id_bloqueo, id_barbero, fecha, hora_inicio, hora_fin, motivo, creado_en
            FROM bloqueos_agenda
            WHERE {' AND '.join(condiciones)}
            ORDER BY fecha DESC, hora_inicio""",
        params,
    )
    for fila in filas:
        fila["hora_inicio"] = hhmm(fila["hora_inicio"])
        fila["hora_fin"] = hhmm(fila["hora_fin"])
    return filas


def crear_bloqueo(id_barbero: int, datos: dict) -> dict:
    obtener(id_barbero)

    citas_afectadas = fetch_all(
        """SELECT id_cita, codigo_reserva, hora_inicio, hora_fin
           FROM citas
           WHERE id_barbero = %s AND fecha = %s
             AND estado NOT IN ('cancelada', 'no_asistio', 'completada')
             AND hora_inicio < %s AND hora_fin > %s""",
        (id_barbero, str(datos["fecha"]), str(datos["hora_fin"]), str(datos["hora_inicio"])),
    )
    if citas_afectadas:
        codigos = ", ".join(c["codigo_reserva"] for c in citas_afectadas)
        raise Conflicto(
            f"No se puede bloquear: hay citas agendadas en ese rango ({codigos}). "
            "Cancelalas o reprogramalas primero."
        )

    id_bloqueo = execute(
        """INSERT INTO bloqueos_agenda (id_barbero, fecha, hora_inicio, hora_fin, motivo)
           VALUES (%s, %s, %s, %s, %s)""",
        (
            id_barbero,
            str(datos["fecha"]),
            str(datos["hora_inicio"]),
            str(datos["hora_fin"]),
            datos["motivo"],
        ),
    )
    fila = fetch_one(
        """SELECT id_bloqueo, id_barbero, fecha, hora_inicio, hora_fin, motivo, creado_en
           FROM bloqueos_agenda WHERE id_bloqueo = %s""",
        (id_bloqueo,),
    )
    if fila:
        fila["hora_inicio"] = hhmm(fila["hora_inicio"])
        fila["hora_fin"] = hhmm(fila["hora_fin"])
    return fila or {}


def eliminar_bloqueo(id_barbero: int, id_bloqueo: int) -> None:
    filas = execute_rowcount(
        "DELETE FROM bloqueos_agenda WHERE id_bloqueo = %s AND id_barbero = %s",
        (id_bloqueo, id_barbero),
    )
    if filas == 0:
        raise NoEncontrado("El bloqueo no existe para este barbero")


def bloqueos_del_dia(id_barbero: int, fecha: Fecha) -> list[dict]:
    filas = fetch_all(
        """SELECT hora_inicio, hora_fin, motivo
           FROM bloqueos_agenda
           WHERE id_barbero = %s AND fecha = %s
           ORDER BY hora_inicio""",
        (id_barbero, fecha.isoformat()),
    )
    for fila in filas:
        fila["hora_inicio"] = hhmm(fila["hora_inicio"])
        fila["hora_fin"] = hhmm(fila["hora_fin"])
    return filas


__all__ = [
    "DIAS_SEMANA",
    "obtener",
    "obtener_por_usuario",
    "listar",
    "ranking",
    "perfil_completo",
    "actualizar",
    "cambiar_disponibilidad",
    "servicios_asignados",
    "asignar_servicios",
    "presta_servicio",
    "listar_horarios",
    "reemplazar_horarios",
    "agregar_horario",
    "eliminar_horario",
    "horarios_del_dia",
    "listar_bloqueos",
    "crear_bloqueo",
    "eliminar_bloqueo",
    "bloqueos_del_dia",
]
