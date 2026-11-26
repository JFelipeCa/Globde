"""Persistencia y ofrecimiento secuencial de turnos liberados."""

import logging
from datetime import date, datetime
from typing import Any

from app.core.exceptions import Conflicto, DatosInvalidos, NoEncontrado, Prohibido
from app.db.database import execute, execute_rowcount, fetch_all, fetch_one, transaction
from app.db.serializers import hhmm
from app.services import email_service, notificaciones_service, servicios_service
from app.services import agenda_service

logger = logging.getLogger("globde.lista_espera")


def _validar_fecha_solicitada(fecha: date | str, franja: str) -> None:
    dia = date.fromisoformat(fecha) if isinstance(fecha, str) else fecha
    hoy = date.today()
    if dia < hoy:
        raise DatosInvalidos("La fecha de la lista de espera no puede estar en el pasado")
    if agenda_service.hay_cierre_negocio(dia):
        raise DatosInvalidos("El negocio está cerrado en la fecha seleccionada")

    limite_inicio, limite_fin = {
        "manana": (0, 13 * 60),
        "tarde": (13 * 60, 24 * 60),
        "cualquiera": (0, 24 * 60),
    }[franja]
    minuto_actual = datetime.now().hour * 60 + datetime.now().minute
    for horario in agenda_service.horarios_negocio_del_dia(dia):
        inicio_hora, inicio_minuto = map(int, horario["hora_inicio"].split(":"))
        fin_hora, fin_minuto = map(int, horario["hora_fin"].split(":"))
        inicio = max(inicio_hora * 60 + inicio_minuto, limite_inicio)
        fin = min(fin_hora * 60 + fin_minuto, limite_fin)
        if fin > inicio and (dia != hoy or fin > minuto_actual):
            return
    raise DatosInvalidos("No hay atención disponible en esa fecha y franja")

_SELECT_LISTA_ESPERA = """
    SELECT le.id_espera, le.id_cliente, cliente.nombre AS nombre_cliente,
           cliente.telefono, le.id_servicio, s.nombre AS servicio_nombre,
           le.id_barbero, barbero.nombre AS barbero_nombre, le.fecha_deseada,
           le.franja_horaria, le.estado, le.oferta_hora_inicio, le.oferta_hora_fin,
           le.oferta_expira, le.creado_en, cliente.correo
    FROM lista_espera le
    JOIN clientes cl ON cl.id_cliente = le.id_cliente
    JOIN usuarios cliente ON cliente.id_usuario = cl.id_usuario
    JOIN servicios s ON s.id_servicio = le.id_servicio
    LEFT JOIN barberos b ON b.id_barbero = le.id_barbero
    LEFT JOIN usuarios barbero ON barbero.id_usuario = b.id_usuario
"""


def _formatear(fila: dict) -> dict:
    if fila.get("oferta_hora_inicio") is not None:
        fila["oferta_hora_inicio"] = hhmm(fila["oferta_hora_inicio"])
    if fila.get("oferta_hora_fin") is not None:
        fila["oferta_hora_fin"] = hhmm(fila["oferta_hora_fin"])
    fila.pop("correo", None)
    return fila


def obtener(id_espera: int) -> dict:
    fila = fetch_one(
        f"{_SELECT_LISTA_ESPERA} WHERE le.id_espera = %s",
        (id_espera,),
    )
    if not fila:
        raise NoEncontrado("La solicitud de lista de espera no existe")
    return _formatear(fila)


def crear(datos: dict, usuario: Any = None, id_cliente_invitado: int | None = None) -> dict:
    id_cliente = id_cliente_invitado
    if id_cliente is None:
        id_cliente = getattr(usuario, "id_cliente", None)
        if not getattr(usuario, "es_cliente", False) or not id_cliente:
            raise Prohibido("Solo los clientes pueden crear solicitudes de espera")

    servicio = servicios_service.obtener_activo(int(datos["id_servicio"]))
    id_barbero = datos.get("id_barbero")
    if id_barbero is not None:
        from app.services import barberos_service

        barberos_service.obtener(int(id_barbero))
        if not barberos_service.presta_servicio(int(id_barbero), int(servicio["id_servicio"])):
            raise DatosInvalidos("El barbero seleccionado no presta ese servicio")

    fecha = datos["fecha_deseada"]
    _validar_fecha_solicitada(fecha, datos["franja_horaria"])
    existente = fetch_one(
        """SELECT id_espera FROM lista_espera
           WHERE id_cliente = %s AND id_servicio = %s AND fecha_deseada = %s
             AND estado IN ('en_espera', 'ofrecida', 'reservando')
           LIMIT 1""",
        (id_cliente, servicio["id_servicio"], fecha),
    )
    if existente:
        raise Conflicto("Ya tienes una solicitud activa para ese servicio y fecha")

    id_espera = execute(
        """INSERT INTO lista_espera
               (id_cliente, id_servicio, id_barbero, fecha_deseada, franja_horaria)
           VALUES (%s, %s, %s, %s, %s)""",
        (id_cliente, servicio["id_servicio"], id_barbero, fecha, datos["franja_horaria"]),
    )
    return obtener(int(id_espera))


def listar_cliente(id_cliente: int) -> list[dict]:
    filas = fetch_all(
        f"{_SELECT_LISTA_ESPERA} WHERE le.id_cliente = %s ORDER BY le.creado_en DESC",
        (id_cliente,),
    )
    return [_formatear(fila) for fila in filas]


def listar_todas() -> list[dict]:
    filas = fetch_all(f"{_SELECT_LISTA_ESPERA} ORDER BY le.creado_en DESC")
    return [_formatear(fila) for fila in filas]


def cancelar(id_espera: int, usuario: Any) -> None:
    with transaction() as cursor:
        cursor.execute(
            """SELECT id_cliente, estado FROM lista_espera
               WHERE id_espera = %s FOR UPDATE""",
            (id_espera,),
        )
        solicitud = cursor.fetchone()
        if not solicitud:
            raise NoEncontrado("La solicitud de lista de espera no existe")
        if not getattr(usuario, "es_admin", False):
            if not getattr(usuario, "es_cliente", False) or int(
                solicitud["id_cliente"]
            ) != int(getattr(usuario, "id_cliente", -1) or -1):
                raise Prohibido("No tienes permiso para cancelar esta solicitud")
        if solicitud["estado"] in ("convertida", "cancelada", "vencida", "reservando"):
            raise Conflicto("La solicitud ya no está activa")
        cursor.execute(
            """UPDATE lista_espera
               SET estado = 'cancelada', oferta_expira = NULL
               WHERE id_espera = %s AND estado = %s""",
            (id_espera, solicitud["estado"]),
        )


def _franja_coincide(franja: str, hora_inicio: str) -> bool:
    hora = int(hhmm(hora_inicio).split(":")[0])
    return franja == "cualquiera" or (franja == "manana" and hora < 13) or (
        franja == "tarde" and hora >= 13
    )


def ofrecer_siguiente(
    fecha: str, hora_inicio: str, hora_fin: str, id_barbero: int, id_servicio: int
) -> bool:
    existente = fetch_one(
        """SELECT id_espera FROM lista_espera
           WHERE estado = 'ofrecida' AND fecha_deseada = %s
             AND id_barbero = %s AND oferta_hora_inicio = %s
             AND oferta_hora_fin = %s AND oferta_expira > NOW()
           LIMIT 1""",
        (fecha, id_barbero, hora_inicio, hora_fin),
    )
    if existente:
        return False

    candidatos = fetch_all(
        """SELECT le.id_espera, le.franja_horaria, cliente.nombre, cliente.correo,
                  cliente.id_usuario
           FROM lista_espera le
           JOIN clientes cl ON cl.id_cliente = le.id_cliente
           JOIN usuarios cliente ON cliente.id_usuario = cl.id_usuario
           WHERE le.estado = 'en_espera' AND le.fecha_deseada = %s
             AND le.id_servicio = %s
             AND (le.id_barbero IS NULL OR le.id_barbero = %s)
           ORDER BY le.creado_en ASC, le.id_espera ASC""",
        (fecha, id_servicio, id_barbero),
    )
    for candidato in candidatos:
        if not _franja_coincide(str(candidato["franja_horaria"]), hora_inicio):
            continue
        reclamado = execute_rowcount(
            """UPDATE lista_espera
               SET estado = 'ofrecida', id_barbero = %s,
                   oferta_hora_inicio = %s, oferta_hora_fin = %s,
                   oferta_expira = DATE_ADD(NOW(), INTERVAL 30 MINUTE)
               WHERE id_espera = %s AND estado = 'en_espera'""",
            (id_barbero, hora_inicio, hora_fin, candidato["id_espera"]),
        )
        if not reclamado:
            continue

        titulo = "Se liberó un turno para ti"
        mensaje = (
            f"Hay un espacio disponible el {fecha} de {hhmm(hora_inicio)} a "
            f"{hhmm(hora_fin)}. Tienes 30 minutos para aceptarlo."
        )
        notificaciones_service.crear_notificacion(
            int(candidato["id_usuario"]), titulo, mensaje, "cita", "/panel-cliente"
        )
        email_service.enviar_notificacion_generica(
            str(candidato["correo"]), str(candidato["nombre"]), titulo, mensaje,
            int(candidato["id_usuario"]),
        )
        return True
    return False


def procesar_ofertas() -> int:
    expiradas = fetch_all(
        """SELECT id_espera, fecha_deseada, oferta_hora_inicio, oferta_hora_fin,
                  id_barbero, id_servicio
           FROM lista_espera
           WHERE estado = 'ofrecida' AND oferta_expira <= NOW()"""
    )
    for oferta in expiradas:
        execute_rowcount(
            """UPDATE lista_espera
               SET estado = 'vencida', oferta_expira = NULL
               WHERE id_espera = %s AND estado = 'ofrecida'
                 AND oferta_expira <= NOW()""",
            (oferta["id_espera"],),
        )

    espacios = fetch_all(
        """SELECT DISTINCT c.fecha, c.hora_inicio, c.hora_fin,
                  c.id_barbero, c.id_servicio
           FROM citas c
           WHERE c.estado = 'cancelada'
             AND TIMESTAMP(c.fecha, c.hora_inicio) > NOW()
             AND NOT EXISTS (
               SELECT 1 FROM citas activa
               WHERE activa.id_barbero = c.id_barbero
                 AND activa.fecha = c.fecha
                 AND activa.estado NOT IN ('cancelada', 'no_asistio')
                 AND activa.hora_inicio < c.hora_fin
                 AND activa.hora_fin > c.hora_inicio
             )"""
    )
    ofrecidas = 0
    for espacio in espacios:
        ofrecidas += int(
            ofrecer_siguiente(
                str(espacio["fecha"]),
                str(hhmm(espacio["hora_inicio"])),
                str(hhmm(espacio["hora_fin"])),
                int(espacio["id_barbero"]),
                int(espacio["id_servicio"]),
            )
        )
    return ofrecidas


def aceptar(id_espera: int, usuario: Any) -> dict:
    with transaction() as cursor:
        cursor.execute(
            """SELECT id_cliente, id_servicio, id_barbero, fecha_deseada,
                      oferta_hora_inicio, oferta_hora_fin, estado,
                      oferta_expira > NOW() AS oferta_vigente
               FROM lista_espera WHERE id_espera = %s FOR UPDATE""",
            (id_espera,),
        )
        oferta = cursor.fetchone()
        if not oferta:
            raise NoEncontrado("La oferta ya no existe")
        if not getattr(usuario, "es_cliente", False) or int(oferta["id_cliente"]) != int(
            getattr(usuario, "id_cliente", -1) or -1
        ):
            raise Prohibido("Esta oferta no te pertenece")
        if oferta["estado"] != "ofrecida" or not oferta["oferta_vigente"]:
            raise Conflicto("La oferta venció o ya no está disponible")
        cursor.execute(
            """UPDATE lista_espera SET estado = 'reservando'
               WHERE id_espera = %s AND estado = 'ofrecida'""",
            (id_espera,),
        )

    from app.services import citas_service

    try:
        cita = citas_service.crear(
            {
                "id_cliente": int(oferta["id_cliente"]),
                "id_barbero": int(oferta["id_barbero"]),
                "id_servicio": int(oferta["id_servicio"]),
                "fecha": oferta["fecha_deseada"],
                "hora_inicio": hhmm(oferta["oferta_hora_inicio"]),
                "hora_fin": hhmm(oferta["oferta_hora_fin"]),
                "estado": "confirmada",
                "observaciones": "Cita aceptada desde la lista de espera",
            },
            usuario,
        )
    except Exception:
        execute(
            """UPDATE lista_espera SET estado = 'ofrecida'
               WHERE id_espera = %s AND estado = 'reservando'""",
            (id_espera,),
        )
        raise

    execute(
        """UPDATE lista_espera SET estado = 'convertida', oferta_expira = NULL
           WHERE id_espera = %s AND estado = 'reservando'""",
        (id_espera,),
    )
    return cita


__all__ = [
    "crear",
    "listar_cliente",
    "listar_todas",
    "cancelar",
    "ofrecer_siguiente",
    "procesar_ofertas",
    "aceptar",
    "obtener",
]
