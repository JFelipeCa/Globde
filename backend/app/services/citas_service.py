"""Citas: reserva, reprogramacion, estados, cancelacion y disponibilidad.

Reglas clave (contrato database/docs/cambios_backend_requeridos.md):
- Las citas se guardan con rango horario (hora_inicio, hora_fin).
- No puede haber solape para el mismo barbero:
    hora_inicio < nueva_hora_fin AND hora_fin > nueva_hora_inicio
  ignorando las citas en estado 'cancelada' o 'no_asistio'.
- Al completar una cita el cliente gana los puntos del servicio.
"""

import logging
from datetime import date as Fecha
from datetime import datetime, time, timedelta
from typing import Any

from app.core.config import settings
from app.core.exceptions import Conflicto, DatosInvalidos, NoEncontrado, Prohibido
from app.core.security import generar_codigo_reserva
from app.db.database import execute, fetch_all, fetch_one, fetch_value, transaction
from app.db.serializers import hhmm
from app.services import barberos_service, email_service, notificaciones_service, puntos_service
from app.services.auditoria_service import Accion, registrar_auditoria

logger = logging.getLogger("globde.citas")

ESTADOS_ACTIVOS = ("pendiente", "confirmada", "en_atencion")
ESTADOS_CERRADOS = ("completada", "cancelada", "no_asistio")

# Transiciones permitidas del ciclo de vida de una cita
TRANSICIONES: dict[str, tuple[str, ...]] = {
    "pendiente": ("confirmada", "cancelada", "no_asistio", "en_atencion"),
    "confirmada": ("en_atencion", "completada", "cancelada", "no_asistio"),
    "en_atencion": ("completada", "cancelada"),
    "completada": (),
    "cancelada": (),
    "no_asistio": (),
}


# ----------------------------------------------------------------------
# Utilidades de tiempo
# ----------------------------------------------------------------------

def _a_time(valor: Any) -> time:
    if isinstance(valor, time):
        return valor
    if isinstance(valor, timedelta):
        total = int(valor.total_seconds())
        return time(total // 3600 % 24, total % 3600 // 60)
    texto = str(valor)
    partes = texto.split(":")
    return time(int(partes[0]), int(partes[1]) if len(partes) > 1 else 0)


def _a_fecha(valor: Any) -> Fecha:
    if isinstance(valor, Fecha) and not isinstance(valor, datetime):
        return valor
    if isinstance(valor, datetime):
        return valor.date()
    return datetime.strptime(str(valor)[:10], "%Y-%m-%d").date()


def _sumar_minutos(hora: time, minutos: int) -> time:
    base = datetime(2000, 1, 1, hora.hour, hora.minute) + timedelta(minutes=minutos)
    return base.time()


def _minutos(hora: time) -> int:
    return hora.hour * 60 + hora.minute


# ----------------------------------------------------------------------
# Consultas
# ----------------------------------------------------------------------

def _formatear(fila: dict) -> dict:
    fila["hora_inicio"] = hhmm(fila.get("hora_inicio"))
    fila["hora_fin"] = hhmm(fila.get("hora_fin"))
    return fila


def obtener(id_cita: int) -> dict:
    fila = fetch_one("SELECT * FROM v_citas_detalle WHERE id_cita = %s", (id_cita,))
    if not fila:
        raise NoEncontrado("La cita no existe")
    return _formatear(fila)


def obtener_por_codigo(codigo: str) -> dict:
    fila = fetch_one("SELECT * FROM v_citas_detalle WHERE codigo_reserva = %s", (codigo,))
    if not fila:
        raise NoEncontrado("No existe una cita con ese codigo de reserva")
    return _formatear(fila)


def _construir_filtros(
    id_cliente: int | None = None,
    id_barbero: int | None = None,
    id_servicio: int | None = None,
    estado: str | None = None,
    fecha: str | None = None,
    desde: str | None = None,
    hasta: str | None = None,
    buscar: str | None = None,
) -> tuple[str, list[Any]]:
    condiciones: list[str] = []
    params: list[Any] = []
    if id_cliente is not None:
        condiciones.append("id_cliente = %s")
        params.append(id_cliente)
    if id_barbero is not None:
        condiciones.append("id_barbero = %s")
        params.append(id_barbero)
    if id_servicio is not None:
        condiciones.append("id_servicio = %s")
        params.append(id_servicio)
    if estado:
        condiciones.append("estado = %s")
        params.append(estado)
    if fecha:
        condiciones.append("fecha = %s")
        params.append(fecha)
    if desde:
        condiciones.append("fecha >= %s")
        params.append(desde)
    if hasta:
        condiciones.append("fecha <= %s")
        params.append(hasta)
    if buscar:
        condiciones.append(
            "(codigo_reserva LIKE %s OR cliente_nombre LIKE %s OR barbero_nombre LIKE %s "
            "OR servicio_nombre LIKE %s)"
        )
        patron = f"%{buscar}%"
        params.extend([patron, patron, patron, patron])
    where = f"WHERE {' AND '.join(condiciones)}" if condiciones else ""
    return where, params


def listar(limite: int = 100, offset: int = 0, orden: str = "desc", **filtros) -> list[dict]:
    where, params = _construir_filtros(**filtros)
    direccion = "DESC" if str(orden).lower() == "desc" else "ASC"
    params = [*params, limite, offset]
    filas = fetch_all(
        f"""SELECT * FROM v_citas_detalle
            {where}
            ORDER BY fecha {direccion}, hora_inicio {direccion}, id_cita {direccion}
            LIMIT %s OFFSET %s""",
        params,
    )
    return [_formatear(f) for f in filas]


def contar(**filtros) -> int:
    where, params = _construir_filtros(**filtros)
    return int(
        fetch_value(f"SELECT COUNT(*) FROM v_citas_detalle {where}", params, por_defecto=0) or 0
    )


def agenda_barbero(id_barbero: int, fecha: str) -> list[dict]:
    filas = fetch_all(
        """SELECT * FROM v_citas_detalle
           WHERE id_barbero = %s AND fecha = %s
           ORDER BY hora_inicio""",
        (id_barbero, fecha),
    )
    return [_formatear(f) for f in filas]


def proximas_del_cliente(id_cliente: int, limite: int = 5) -> list[dict]:
    filas = fetch_all(
        """SELECT * FROM v_citas_detalle
           WHERE id_cliente = %s AND estado IN ('pendiente', 'confirmada', 'en_atencion')
             AND CONCAT(fecha, ' ', hora_inicio) >= NOW()
           ORDER BY fecha ASC, hora_inicio ASC
           LIMIT %s""",
        (id_cliente, limite),
    )
    return [_formatear(f) for f in filas]


# ----------------------------------------------------------------------
# Validaciones
# ----------------------------------------------------------------------

def hay_solapamiento(
    id_barbero: int, fecha: str, hora_inicio: str, hora_fin: str, excluir_cita: int | None = None
) -> dict | None:
    """Devuelve la cita en conflicto o None. Regla del contrato DB v2."""
    sql = """
        SELECT id_cita, codigo_reserva, hora_inicio, hora_fin, estado
        FROM citas
        WHERE id_barbero = %s
          AND fecha = %s
          AND estado NOT IN ('cancelada', 'no_asistio')
          AND hora_inicio < %s
          AND hora_fin > %s
    """
    params: list[Any] = [id_barbero, fecha, hora_fin, hora_inicio]
    if excluir_cita:
        sql += " AND id_cita <> %s"
        params.append(excluir_cita)
    sql += " LIMIT 1"

    fila = fetch_one(sql, params)
    return _formatear(fila) if fila else None


def _validar_bloqueos(id_barbero: int, fecha: Fecha, inicio: time, fin: time) -> None:
    for bloqueo in barberos_service.bloqueos_del_dia(id_barbero, fecha):
        b_inicio = _a_time(bloqueo["hora_inicio"])
        b_fin = _a_time(bloqueo["hora_fin"])
        if inicio < b_fin and fin > b_inicio:
            raise Conflicto(
                f"El barbero tiene la agenda bloqueada de {hhmm(bloqueo['hora_inicio'])} "
                f"a {hhmm(bloqueo['hora_fin'])} ({bloqueo['motivo']})"
            )


def _validar_horario_laboral(id_barbero: int, fecha: Fecha, inicio: time, fin: time) -> None:
    franjas = barberos_service.horarios_del_dia(id_barbero, fecha)
    if not franjas:
        dia = barberos_service.DIAS_SEMANA.get(fecha.isoweekday(), fecha.isoweekday())
        raise Conflicto(f"El barbero no atiende los dias {dia}")

    for franja in franjas:
        if _a_time(franja["hora_inicio"]) <= inicio and fin <= _a_time(franja["hora_fin"]):
            return

    disponibles = ", ".join(f"{f['hora_inicio']}-{f['hora_fin']}" for f in franjas)
    raise Conflicto(
        f"El horario solicitado esta fuera de la jornada del barbero. Atiende: {disponibles}"
    )


def _validar_fecha_futura(fecha: Fecha, inicio: time) -> None:
    inicio_cita = datetime.combine(fecha, inicio)
    if inicio_cita < datetime.now():
        raise DatosInvalidos("No se pueden agendar citas en el pasado")


def _obtener_servicio(id_servicio: int) -> dict:
    servicio = fetch_one(
        """SELECT id_servicio, nombre, precio, duracion_minutos, puntos_otorga, activo
           FROM servicios WHERE id_servicio = %s""",
        (id_servicio,),
    )
    if not servicio:
        raise NoEncontrado("El servicio no existe")
    if not servicio.get("activo"):
        raise DatosInvalidos("El servicio no esta disponible actualmente")
    return servicio


def _precio_para(id_barbero: int, servicio: dict) -> float:
    personalizado = fetch_value(
        """SELECT precio_personalizado FROM barbero_servicio
           WHERE id_barbero = %s AND id_servicio = %s AND activo = 1""",
        (id_barbero, servicio["id_servicio"]),
    )
    return float(personalizado if personalizado is not None else servicio["precio"])


def _generar_codigo_unico() -> str:
    for _ in range(10):
        codigo = generar_codigo_reserva()
        existe = fetch_value(
            "SELECT COUNT(*) FROM citas WHERE codigo_reserva = %s", (codigo,), por_defecto=0
        )
        if not int(existe or 0):
            return codigo
    raise Conflicto("No se pudo generar un codigo de reserva unico, intenta de nuevo")


# ----------------------------------------------------------------------
# Creacion
# ----------------------------------------------------------------------

def crear(datos: dict, actor: Any = None, contexto: dict | None = None) -> dict:
    contexto = contexto or {}

    id_cliente = datos.get("id_cliente")
    if id_cliente is None and actor is not None:
        id_cliente = getattr(actor, "id_cliente", None)
    if id_cliente is None:
        raise DatosInvalidos("Debes indicar el cliente de la cita")

    cliente = fetch_one(
        """SELECT c.id_cliente, c.id_usuario, c.puntos_saldo, u.nombre, u.correo, u.activo
           FROM clientes c JOIN usuarios u ON u.id_usuario = c.id_usuario
           WHERE c.id_cliente = %s""",
        (id_cliente,),
    )
    if not cliente:
        raise NoEncontrado("El cliente no existe")
    if not cliente.get("activo"):
        raise Prohibido("La cuenta del cliente esta desactivada")

    # Un cliente solo puede agendar para si mismo
    if actor is not None and getattr(actor, "es_cliente", False):
        if int(id_cliente) != int(getattr(actor, "id_cliente", -1) or -1):
            raise Prohibido("Solo puedes agendar citas para tu propia cuenta")

    id_barbero = int(datos["id_barbero"])
    barbero = barberos_service.obtener(id_barbero)
    if not barbero.get("activo"):
        raise DatosInvalidos("El barbero no esta activo")
    if not barbero.get("disponible"):
        raise Conflicto("El barbero no esta recibiendo citas en este momento")

    servicio = _obtener_servicio(int(datos["id_servicio"]))
    if not barberos_service.presta_servicio(id_barbero, int(servicio["id_servicio"])):
        raise DatosInvalidos("El barbero seleccionado no presta ese servicio")

    fecha = _a_fecha(datos["fecha"])
    inicio = _a_time(datos["hora_inicio"])
    fin = (
        _a_time(datos["hora_fin"])
        if datos.get("hora_fin")
        else _sumar_minutos(inicio, int(servicio["duracion_minutos"]))
    )
    if fin <= inicio:
        raise DatosInvalidos("La hora de fin debe ser posterior a la de inicio")

    _validar_fecha_futura(fecha, inicio)
    _validar_horario_laboral(id_barbero, fecha, inicio, fin)
    _validar_bloqueos(id_barbero, fecha, inicio, fin)

    fecha_txt, inicio_txt, fin_txt = fecha.isoformat(), inicio.strftime("%H:%M:%S"), fin.strftime("%H:%M:%S")
    conflicto = hay_solapamiento(id_barbero, fecha_txt, inicio_txt, fin_txt)
    if conflicto:
        raise Conflicto(
            f"El barbero ya tiene una cita de {conflicto['hora_inicio']} a "
            f"{conflicto['hora_fin']} ese dia. Elige otro horario."
        )

    # El cliente no puede tener dos citas activas a la misma hora
    choque_cliente = fetch_one(
        """SELECT codigo_reserva FROM citas
           WHERE id_cliente = %s AND fecha = %s
             AND estado NOT IN ('cancelada', 'no_asistio')
             AND hora_inicio < %s AND hora_fin > %s
           LIMIT 1""",
        (id_cliente, fecha_txt, fin_txt, inicio_txt),
    )
    if choque_cliente:
        raise Conflicto(
            f"Ya tienes una cita agendada en ese horario ({choque_cliente['codigo_reserva']})"
        )

    precio = _precio_para(id_barbero, servicio)
    puntos_a_canjear = int(datos.get("puntos_a_canjear") or 0)
    descuento = 0.0
    if puntos_a_canjear:
        if puntos_a_canjear > int(cliente["puntos_saldo"]):
            raise Conflicto(
                f"Puntos insuficientes: tienes {cliente['puntos_saldo']} y quieres canjear "
                f"{puntos_a_canjear}"
            )
        descuento = min(puntos_service.valor_en_pesos(puntos_a_canjear), precio)

    estado = datos.get("estado") or "pendiente"
    if estado not in ("pendiente", "confirmada"):
        raise DatosInvalidos("Una cita solo puede crearse como 'pendiente' o 'confirmada'")

    codigo = _generar_codigo_unico()

    with transaction() as cursor:
        cursor.execute(
            """INSERT INTO citas
                   (codigo_reserva, id_cliente, id_barbero, id_servicio, fecha,
                    hora_inicio, hora_fin, estado, precio_total, descuento_aplicado,
                    puntos_canjeados, observaciones)
               VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)""",
            (
                codigo, id_cliente, id_barbero, servicio["id_servicio"], fecha_txt,
                inicio_txt, fin_txt, estado, precio, descuento, puntos_a_canjear,
                datos.get("observaciones"),
            ),
        )
        id_cita = cursor.lastrowid

        if puntos_a_canjear:
            puntos_service.aplicar_movimiento(
                cursor, int(id_cliente), "canje", -puntos_a_canjear,
                f"Canje en la cita {codigo}", id_cita,
                getattr(actor, "id_usuario", None),
            )

    cita = obtener(id_cita)

    registrar_auditoria(
        Accion.CITA_CREADA, "citas", id_cita, getattr(actor, "id_usuario", None),
        contexto.get("ip"), contexto.get("user_agent"),
        {"codigo": codigo, "fecha": fecha_txt, "hora": inicio_txt},
    )
    _notificar_cita_creada(cita, cliente, barbero)
    return cita


def _notificar_cita_creada(cita: dict, cliente: dict, barbero: dict) -> None:
    notificaciones_service.crear_notificacion(
        int(cliente["id_usuario"]),
        "Cita agendada",
        f"Tu cita {cita['codigo_reserva']} quedo registrada para el {cita['fecha']} "
        f"a las {cita['hora_inicio']}.",
        "cita",
        f"/citas/{cita['id_cita']}",
    )
    notificaciones_service.crear_notificacion(
        int(barbero["id_usuario"]),
        "Nueva cita asignada",
        f"{cita.get('cliente_nombre', 'Un cliente')} agendo {cita.get('servicio_nombre', '')} "
        f"el {cita['fecha']} a las {cita['hora_inicio']}.",
        "cita",
        f"/citas/{cita['id_cita']}",
    )
    email_service.enviar_confirmacion_cita(
        cliente["correo"], cliente["nombre"], cita, int(cliente["id_usuario"])
    )


# ----------------------------------------------------------------------
# Actualizacion / reprogramacion
# ----------------------------------------------------------------------

def actualizar(id_cita: int, datos: dict, actor: Any = None, contexto: dict | None = None) -> dict:
    contexto = contexto or {}
    cita = obtener(id_cita)
    _verificar_acceso(cita, actor, escritura=True)

    if cita["estado"] in ESTADOS_CERRADOS:
        raise Conflicto(f"No se puede modificar una cita en estado '{cita['estado']}'")

    id_barbero = int(datos.get("id_barbero") or cita["id_barbero"])
    id_servicio = int(datos.get("id_servicio") or cita["id_servicio"])
    servicio = _obtener_servicio(id_servicio)

    fecha = _a_fecha(datos.get("fecha") or cita["fecha"])
    inicio = _a_time(datos.get("hora_inicio") or cita["hora_inicio"])
    if datos.get("hora_fin"):
        fin = _a_time(datos["hora_fin"])
    elif datos.get("hora_inicio") or datos.get("id_servicio"):
        fin = _sumar_minutos(inicio, int(servicio["duracion_minutos"]))
    else:
        fin = _a_time(cita["hora_fin"])

    if fin <= inicio:
        raise DatosInvalidos("La hora de fin debe ser posterior a la de inicio")

    cambia_agenda = (
        id_barbero != int(cita["id_barbero"])
        or fecha.isoformat() != str(cita["fecha"])
        or inicio.strftime("%H:%M") != hhmm(cita["hora_inicio"])
        or fin.strftime("%H:%M") != hhmm(cita["hora_fin"])
    )

    if cambia_agenda:
        barberos_service.obtener(id_barbero)
        if not barberos_service.presta_servicio(id_barbero, id_servicio):
            raise DatosInvalidos("El barbero seleccionado no presta ese servicio")
        _validar_fecha_futura(fecha, inicio)
        _validar_horario_laboral(id_barbero, fecha, inicio, fin)
        _validar_bloqueos(id_barbero, fecha, inicio, fin)
        conflicto = hay_solapamiento(
            id_barbero, fecha.isoformat(), inicio.strftime("%H:%M:%S"),
            fin.strftime("%H:%M:%S"), excluir_cita=id_cita,
        )
        if conflicto:
            raise Conflicto(
                f"El barbero ya tiene la cita {conflicto['codigo_reserva']} de "
                f"{conflicto['hora_inicio']} a {conflicto['hora_fin']}"
            )

    precio = (
        _precio_para(id_barbero, servicio)
        if id_servicio != int(cita["id_servicio"]) or id_barbero != int(cita["id_barbero"])
        else float(cita["precio_total"])
    )

    execute(
        """UPDATE citas
           SET id_barbero = %s, id_servicio = %s, fecha = %s, hora_inicio = %s,
               hora_fin = %s, precio_total = %s, observaciones = %s
           WHERE id_cita = %s""",
        (
            id_barbero, id_servicio, fecha.isoformat(), inicio.strftime("%H:%M:%S"),
            fin.strftime("%H:%M:%S"), precio,
            datos.get("observaciones", cita.get("observaciones")), id_cita,
        ),
    )

    actualizada = obtener(id_cita)
    registrar_auditoria(
        Accion.CITA_ACTUALIZADA, "citas", id_cita, getattr(actor, "id_usuario", None),
        contexto.get("ip"), contexto.get("user_agent"),
        {"reprogramada": cambia_agenda, "fecha": actualizada["fecha"]},
    )
    if cambia_agenda:
        notificaciones_service.crear_notificacion(
            int(actualizada["id_usuario_cliente"]),
            "Cita reprogramada",
            f"Tu cita {actualizada['codigo_reserva']} quedo para el {actualizada['fecha']} "
            f"a las {actualizada['hora_inicio']}.",
            "cita",
            f"/citas/{id_cita}",
        )
    return actualizada


# ----------------------------------------------------------------------
# Cambios de estado
# ----------------------------------------------------------------------

def cambiar_estado(
    id_cita: int, nuevo_estado: str, motivo: str | None = None,
    actor: Any = None, contexto: dict | None = None,
) -> dict:
    contexto = contexto or {}
    cita = obtener(id_cita)
    _verificar_acceso(cita, actor, escritura=True)

    estado_actual = str(cita["estado"])
    if nuevo_estado == estado_actual:
        return cita
    if nuevo_estado not in TRANSICIONES.get(estado_actual, ()):
        raise Conflicto(
            f"No se puede pasar de '{estado_actual}' a '{nuevo_estado}'"
        )

    # Los clientes solo pueden cancelar
    if actor is not None and getattr(actor, "es_cliente", False) and nuevo_estado != "cancelada":
        raise Prohibido("Como cliente solo puedes cancelar tus citas")

    if nuevo_estado == "cancelada":
        return cancelar(id_cita, motivo, actor, contexto)

    with transaction() as cursor:
        cursor.execute(
            "UPDATE citas SET estado = %s WHERE id_cita = %s", (nuevo_estado, id_cita)
        )

        if nuevo_estado == "completada":
            cursor.execute(
                """UPDATE barberos SET citas_completadas = citas_completadas + 1
                   WHERE id_barbero = %s""",
                (cita["id_barbero"],),
            )
            puntos = int(cita.get("servicio_puntos_otorga") or 0)
            if puntos > 0:
                puntos_service.aplicar_movimiento(
                    cursor, int(cita["id_cliente"]), "ganancia", puntos,
                    f"Puntos por la cita {cita['codigo_reserva']}", id_cita,
                    getattr(actor, "id_usuario", None),
                )

        elif nuevo_estado == "no_asistio":
            _registrar_penalidad_no_asistencia(cursor, cita, actor)

    actualizada = obtener(id_cita)
    registrar_auditoria(
        Accion.CITA_ESTADO_CAMBIADO, "citas", id_cita, getattr(actor, "id_usuario", None),
        contexto.get("ip"), contexto.get("user_agent"),
        {"de": estado_actual, "a": nuevo_estado, "motivo": motivo},
    )
    _notificar_cambio_estado(actualizada, nuevo_estado)
    return actualizada


def _registrar_penalidad_no_asistencia(cursor: Any, cita: dict, actor: Any) -> None:
    cursor.execute(
        """INSERT INTO penalidades
               (id_cliente, id_cita, tipo, descripcion, puntos_descontados, monto, estado, aplicada_en)
           VALUES (%s, %s, 'no_asistencia', %s, 0, %s, 'aplicada', NOW())""",
        (
            cita["id_cliente"],
            cita["id_cita"],
            f"Inasistencia a la cita {cita['codigo_reserva']}",
            settings.PENALIDAD_NO_ASISTENCIA,
        ),
    )


def _notificar_cambio_estado(cita: dict, estado: str) -> None:
    mensajes = {
        "confirmada": "Tu cita fue confirmada.",
        "en_atencion": "Tu barbero te esta atendiendo.",
        "completada": "Tu cita fue completada. Gracias por visitarnos.",
        "no_asistio": "Tu cita quedo marcada como inasistencia.",
    }
    mensaje = mensajes.get(estado)
    if not mensaje:
        return
    notificaciones_service.crear_notificacion(
        int(cita["id_usuario_cliente"]),
        f"Cita {cita['codigo_reserva']}",
        f"{mensaje} ({cita['fecha']} {cita['hora_inicio']})",
        "cita",
        f"/citas/{cita['id_cita']}",
    )


def cancelar(
    id_cita: int, motivo: str | None = None, actor: Any = None, contexto: dict | None = None
) -> dict:
    contexto = contexto or {}
    cita = obtener(id_cita)
    _verificar_acceso(cita, actor, escritura=True)

    if cita["estado"] in ESTADOS_CERRADOS:
        raise Conflicto(f"La cita ya esta en estado '{cita['estado']}'")

    es_cliente = actor is not None and getattr(actor, "es_cliente", False)
    tarde = False
    inicio_cita = datetime.combine(_a_fecha(cita["fecha"]), _a_time(cita["hora_inicio"]))
    horas_restantes = (inicio_cita - datetime.now()).total_seconds() / 3600

    if es_cliente and horas_restantes < settings.CANCELACION_HORAS_MINIMAS:
        if horas_restantes < 0:
            raise Conflicto("La cita ya paso; no puede cancelarse")
        tarde = True

    with transaction() as cursor:
        cursor.execute(
            """UPDATE citas
               SET estado = 'cancelada', motivo_cancelacion = %s, cancelado_en = NOW()
               WHERE id_cita = %s""",
            (motivo or "Cancelada por el usuario", id_cita),
        )

        # Se devuelven los puntos canjeados en la reserva
        puntos_canjeados = int(cita.get("puntos_canjeados") or 0)
        if puntos_canjeados > 0:
            puntos_service.aplicar_movimiento(
                cursor, int(cita["id_cliente"]), "ajuste", puntos_canjeados,
                f"Devolucion por cancelacion de la cita {cita['codigo_reserva']}", id_cita,
                getattr(actor, "id_usuario", None),
            )

        if tarde:
            cursor.execute(
                """INSERT INTO penalidades
                       (id_cliente, id_cita, tipo, descripcion, puntos_descontados, monto,
                        estado, aplicada_en)
                   VALUES (%s, %s, 'cancelacion_tardia', %s, 0, %s, 'aplicada', NOW())""",
                (
                    cita["id_cliente"], id_cita,
                    f"Cancelacion con menos de {settings.CANCELACION_HORAS_MINIMAS} horas "
                    f"de anticipacion (cita {cita['codigo_reserva']})",
                    settings.PENALIDAD_CANCELACION_TARDIA,
                ),
            )

    actualizada = obtener(id_cita)
    registrar_auditoria(
        Accion.CITA_CANCELADA, "citas", id_cita, getattr(actor, "id_usuario", None),
        contexto.get("ip"), contexto.get("user_agent"),
        {"motivo": motivo, "cancelacion_tardia": tarde},
    )

    notificaciones_service.crear_notificacion(
        int(actualizada["id_usuario_cliente"]), "Cita cancelada",
        f"Tu cita {actualizada['codigo_reserva']} del {actualizada['fecha']} fue cancelada.",
        "cita",
    )
    notificaciones_service.crear_notificacion(
        int(actualizada["id_usuario_barbero"]), "Cita cancelada",
        f"La cita {actualizada['codigo_reserva']} del {actualizada['fecha']} "
        f"a las {actualizada['hora_inicio']} fue cancelada.",
        "cita",
    )
    email_service.enviar_cancelacion_cita(
        actualizada["cliente_correo"], actualizada["cliente_nombre"], actualizada, motivo,
        int(actualizada["id_usuario_cliente"]),
    )
    return actualizada


def _verificar_acceso(cita: dict, actor: Any, escritura: bool = False) -> None:
    """Un cliente solo ve/edita sus citas; un barbero, las suyas; el admin, todas."""
    if actor is None:
        return
    if getattr(actor, "es_admin", False):
        return
    if getattr(actor, "es_cliente", False):
        if int(cita["id_cliente"]) != int(getattr(actor, "id_cliente", -1) or -1):
            raise Prohibido("Esta cita no te pertenece")
        return
    if getattr(actor, "es_barbero", False):
        if int(cita["id_barbero"]) != int(getattr(actor, "id_barbero", -1) or -1):
            raise Prohibido("Esta cita no esta asignada a ti")


# ----------------------------------------------------------------------
# Disponibilidad / slots
# ----------------------------------------------------------------------

def calcular_disponibilidad(
    id_barbero: int, fecha: str, id_servicio: int | None = None, paso: int | None = None
) -> dict:
    """Devuelve los slots libres del barbero para una fecha."""
    barberos_service.obtener(id_barbero)
    dia = _a_fecha(fecha)

    duracion = 30
    if id_servicio is not None:
        servicio = _obtener_servicio(int(id_servicio))
        duracion = int(servicio["duracion_minutos"])

    paso = int(paso or settings.SLOT_STEP_MINUTOS)
    franjas = barberos_service.horarios_del_dia(id_barbero, dia)
    bloqueos = barberos_service.bloqueos_del_dia(id_barbero, dia)

    ocupadas = fetch_all(
        """SELECT hora_inicio, hora_fin FROM citas
           WHERE id_barbero = %s AND fecha = %s AND estado NOT IN ('cancelada', 'no_asistio')""",
        (id_barbero, dia.isoformat()),
    )
    intervalos_ocupados = [
        (_minutos(_a_time(o["hora_inicio"])), _minutos(_a_time(o["hora_fin"]))) for o in ocupadas
    ] + [
        (_minutos(_a_time(b["hora_inicio"])), _minutos(_a_time(b["hora_fin"]))) for b in bloqueos
    ]

    ahora = datetime.now()
    es_hoy = dia == ahora.date()
    minuto_actual = ahora.hour * 60 + ahora.minute

    slots: list[dict] = []
    for franja in franjas:
        inicio_franja = _minutos(_a_time(franja["hora_inicio"]))
        fin_franja = _minutos(_a_time(franja["hora_fin"]))
        cursor_min = inicio_franja
        while cursor_min + duracion <= fin_franja:
            fin_slot = cursor_min + duracion
            libre = not any(
                cursor_min < ocupado_fin and fin_slot > ocupado_inicio
                for ocupado_inicio, ocupado_fin in intervalos_ocupados
            )
            if es_hoy and cursor_min <= minuto_actual:
                libre = False
            slots.append(
                {
                    "hora_inicio": f"{cursor_min // 60:02d}:{cursor_min % 60:02d}",
                    "hora_fin": f"{fin_slot // 60:02d}:{fin_slot % 60:02d}",
                    "disponible": libre,
                }
            )
            cursor_min += paso

    return {
        "id_barbero": id_barbero,
        "fecha": dia.isoformat(),
        "id_servicio": int(id_servicio) if id_servicio else None,
        "duracion_minutos": duracion,
        "slots": slots,
    }


def disponibilidad_semana(
    id_barbero: int, desde: str, dias: int = 7, id_servicio: int | None = None
) -> list[dict]:
    inicio = _a_fecha(desde)
    resultado = []
    for offset in range(max(1, min(dias, 31))):
        dia = inicio + timedelta(days=offset)
        disponibilidad = calcular_disponibilidad(id_barbero, dia.isoformat(), id_servicio)
        libres = [s for s in disponibilidad["slots"] if s["disponible"]]
        resultado.append(
            {
                "fecha": dia.isoformat(),
                "dia_semana": barberos_service.DIAS_SEMANA.get(dia.isoweekday()),
                "slots_libres": len(libres),
                "primer_slot": libres[0]["hora_inicio"] if libres else None,
            }
        )
    return resultado


__all__ = [
    "ESTADOS_ACTIVOS",
    "ESTADOS_CERRADOS",
    "TRANSICIONES",
    "obtener",
    "obtener_por_codigo",
    "listar",
    "contar",
    "agenda_barbero",
    "proximas_del_cliente",
    "hay_solapamiento",
    "crear",
    "actualizar",
    "cambiar_estado",
    "cancelar",
    "calcular_disponibilidad",
    "disponibilidad_semana",
]
