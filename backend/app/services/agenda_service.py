"""Reglas de negocio para horarios generales y cierres especiales."""

from datetime import date, datetime, time
from typing import Any

from app.core.exceptions import Conflicto, DatosInvalidos, NoEncontrado
from app.db.database import execute, execute_rowcount, fetch_all, fetch_one, fetch_value, transaction
from app.db.serializers import hhmm

ESTADOS_CITA_ACTIVOS = ("pendiente", "confirmada", "en_atencion")


def _hora_texto(valor: Any) -> str:
    if isinstance(valor, time):
        return valor.strftime("%H:%M")
    return str(hhmm(valor))


def _validar_solapes(horarios: list[dict[str, Any]]) -> None:
    por_dia: dict[int, list[tuple[str, str]]] = {}
    for horario in horarios:
        if not horario.get("activo", True):
            continue
        dia = int(horario["dia_semana"])
        inicio = _hora_texto(horario["hora_inicio"])
        fin = _hora_texto(horario["hora_fin"])
        if fin <= inicio:
            raise DatosInvalidos("La hora de cierre debe ser posterior a la de apertura")
        if any(inicio < otra_fin and fin > otro_inicio
               for otro_inicio, otra_fin in por_dia.get(dia, [])):
            raise DatosInvalidos(f"Los horarios del día {dia} se solapan")
        por_dia.setdefault(dia, []).append((inicio, fin))


def listar_horarios_negocio() -> list[dict]:
    filas = fetch_all(
        """SELECT id_horario, dia_semana, hora_inicio, hora_fin, activo
           FROM horarios_negocio
           ORDER BY dia_semana, hora_inicio"""
    )
    for fila in filas:
        fila["hora_inicio"] = hhmm(fila["hora_inicio"])
        fila["hora_fin"] = hhmm(fila["hora_fin"])
    return filas


def horarios_negocio_del_dia(fecha: date) -> list[dict]:
    filas = fetch_all(
        """SELECT hora_inicio, hora_fin
           FROM horarios_negocio
           WHERE dia_semana = %s AND activo = 1
           ORDER BY hora_inicio""",
        (fecha.isoweekday(),),
    )
    return [
        {"hora_inicio": hhmm(fila["hora_inicio"]), "hora_fin": hhmm(fila["hora_fin"])}
        for fila in filas
    ]


def hay_cierre_negocio(fecha: date) -> bool:
    return bool(
        fetch_value("SELECT COUNT(*) FROM cierres_negocio WHERE fecha = %s", (fecha,), 0)
    )


def validar_horario_negocio(fecha: date, inicio: time, fin: time) -> None:
    if hay_cierre_negocio(fecha):
        raise Conflicto("El negocio está cerrado en la fecha seleccionada")
    franjas = horarios_negocio_del_dia(fecha)
    if not franjas:
        raise Conflicto("El negocio no tiene horario de atención para ese día")
    inicio_txt, fin_txt = _hora_texto(inicio), _hora_texto(fin)
    if any(
        franja["hora_inicio"] <= inicio_txt and fin_txt <= franja["hora_fin"]
        for franja in franjas
    ):
        return
    disponibles = ", ".join(
        f"{franja['hora_inicio']}-{franja['hora_fin']}" for franja in franjas
    )
    raise Conflicto(
        f"El horario solicitado está fuera de la jornada del negocio. Atiende: {disponibles}"
    )


def _citas_fuera_de_horario(horarios: list[dict[str, Any]]) -> list[dict]:
    citas = fetch_all(
        """SELECT id_cita, codigo_reserva, fecha, hora_inicio, hora_fin
           FROM citas
           WHERE fecha >= CURDATE() AND estado IN (%s, %s, %s)
           ORDER BY fecha, hora_inicio""",
        ESTADOS_CITA_ACTIVOS,
    )
    activas_por_dia: dict[int, list[tuple[str, str]]] = {}
    for horario in horarios:
        if horario.get("activo", True):
            activas_por_dia.setdefault(int(horario["dia_semana"]), []).append(
                (_hora_texto(horario["hora_inicio"]), _hora_texto(horario["hora_fin"]))
            )

    afectadas: list[dict] = []
    for cita in citas:
        fecha = cita["fecha"]
        if isinstance(fecha, str):
            fecha = datetime.strptime(fecha[:10], "%Y-%m-%d").date()
        inicio = _hora_texto(cita["hora_inicio"])
        fin = _hora_texto(cita["hora_fin"])
        if not any(
            apertura <= inicio and fin <= cierre
            for apertura, cierre in activas_por_dia.get(fecha.isoweekday(), [])
        ):
            afectadas.append(cita)
    return afectadas


def reemplazar_horarios_negocio(horarios: list[dict[str, Any]]) -> list[dict]:
    _validar_solapes(horarios)
    afectadas = _citas_fuera_de_horario(horarios)
    if afectadas:
        codigos = ", ".join(cita["codigo_reserva"] for cita in afectadas[:5])
        raise Conflicto(
            f"El cambio dejaría {len(afectadas)} cita(s) activa(s) fuera del horario "
            f"del negocio ({codigos}). Reprograma esas citas primero."
        )

    with transaction() as cursor:
        cursor.execute("DELETE FROM horarios_negocio")
        for horario in horarios:
            cursor.execute(
                """INSERT INTO horarios_negocio
                       (dia_semana, hora_inicio, hora_fin, activo)
                   VALUES (%s, %s, %s, %s)""",
                (
                    int(horario["dia_semana"]),
                    _hora_texto(horario["hora_inicio"]),
                    _hora_texto(horario["hora_fin"]),
                    1 if horario.get("activo", True) else 0,
                ),
            )
    return listar_horarios_negocio()


def listar_cierres(desde: date | None = None, hasta: date | None = None) -> list[dict]:
    condiciones: list[str] = []
    parametros: list[Any] = []
    if desde:
        condiciones.append("fecha >= %s")
        parametros.append(desde)
    if hasta:
        condiciones.append("fecha <= %s")
        parametros.append(hasta)
    where = f"WHERE {' AND '.join(condiciones)}" if condiciones else ""
    return fetch_all(
        f"""SELECT id_cierre, fecha, motivo, creado_en
            FROM cierres_negocio {where}
            ORDER BY fecha""",
        parametros,
    )


def crear_cierre(fecha: date, motivo: str) -> dict:
    if fecha < date.today():
        raise DatosInvalidos("No se puede registrar un cierre en una fecha pasada")
    if fetch_one("SELECT id_cierre FROM cierres_negocio WHERE fecha = %s", (fecha,)):
        raise Conflicto("Ya existe un cierre registrado para esa fecha")

    citas_afectadas = fetch_all(
        """SELECT id_cita, codigo_reserva, hora_inicio, hora_fin, estado,
                  cliente_nombre, barbero_nombre
           FROM v_citas_detalle
           WHERE fecha = %s AND estado IN (%s, %s, %s)
           ORDER BY hora_inicio""",
        (fecha, *ESTADOS_CITA_ACTIVOS),
    )
    id_cierre = execute(
        """INSERT INTO cierres_negocio (fecha, motivo)
           VALUES (%s, %s)""",
        (fecha, motivo.strip()),
    )
    cierre = fetch_one(
        """SELECT id_cierre, fecha, motivo, creado_en
           FROM cierres_negocio WHERE id_cierre = %s""",
        (id_cierre,),
    )
    if cierre is None:
        raise NoEncontrado("No se pudo recuperar el cierre recién creado")
    cierre["citas_afectadas"] = citas_afectadas
    return cierre


def eliminar_cierre(id_cierre: int) -> None:
    filas = execute_rowcount(
        "DELETE FROM cierres_negocio WHERE id_cierre = %s",
        (id_cierre,),
    )
    if filas == 0:
        raise NoEncontrado("El cierre no existe")


__all__ = [
    "listar_horarios_negocio",
    "horarios_negocio_del_dia",
    "hay_cierre_negocio",
    "validar_horario_negocio",
    "reemplazar_horarios_negocio",
    "listar_cierres",
    "crear_cierre",
    "eliminar_cierre",
]
