"""Procesamiento idempotente de recordatorios de citas por correo."""

from uuid import uuid4

from app.db.database import execute_rowcount, fetch_all
from app.services import email_service

_ESTADOS_CITA_ACTIVOS = ("pendiente", "confirmada")


def procesar_recordatorios() -> int:
    """Envía los recordatorios vencidos y devuelve cuántos correos se entregaron."""
    execute_rowcount(
        """INSERT IGNORE INTO recordatorios_citas (id_cita, proximo_intento)
           SELECT c.id_cita, DATE_SUB(TIMESTAMP(c.fecha, c.hora_inicio), INTERVAL 24 HOUR)
           FROM citas c
           WHERE c.estado IN (%s, %s)
             AND TIMESTAMP(c.fecha, c.hora_inicio) > NOW()""",
        _ESTADOS_CITA_ACTIVOS,
    )
    execute_rowcount(
        """UPDATE recordatorios_citas r
           JOIN citas c ON c.id_cita = r.id_cita
           SET r.estado = 'cancelado', r.claim_token = NULL
           WHERE r.estado = 'pendiente'
             AND c.estado NOT IN (%s, %s)""",
        _ESTADOS_CITA_ACTIVOS,
    )
    execute_rowcount(
        """UPDATE recordatorios_citas
           SET estado = IF(intentos + 1 >= 2, 'fallido', 'pendiente'),
               intentos = intentos + 1,
               proximo_intento = DATE_ADD(NOW(), INTERVAL 30 MINUTE),
               claim_token = NULL
           WHERE estado = 'procesando'
             AND actualizado_en < DATE_SUB(NOW(), INTERVAL 10 MINUTE)""",
        (),
    )

    pendientes = fetch_all(
        """SELECT r.id_recordatorio, r.id_cita, r.intentos,
                  c.codigo_reserva, c.fecha, c.hora_inicio,
                  cliente.id_usuario, cliente.nombre, cliente.correo,
                  barbero.nombre AS barbero_nombre
           FROM recordatorios_citas r
           JOIN citas c ON c.id_cita = r.id_cita
           JOIN clientes cl ON cl.id_cliente = c.id_cliente
           JOIN usuarios cliente ON cliente.id_usuario = cl.id_usuario
           JOIN barberos b ON b.id_barbero = c.id_barbero
           JOIN usuarios barbero ON barbero.id_usuario = b.id_usuario
           WHERE r.estado = 'pendiente'
             AND r.proximo_intento <= NOW()
             AND r.intentos < 2
             AND c.estado IN (%s, %s)
             AND TIMESTAMP(c.fecha, c.hora_inicio) > NOW()
           ORDER BY r.proximo_intento ASC
           LIMIT 50""",
        _ESTADOS_CITA_ACTIVOS,
    )

    enviados = 0
    for recordatorio in pendientes:
        token = str(uuid4())
        reclamado = execute_rowcount(
            """UPDATE recordatorios_citas
               SET estado = 'procesando', claim_token = %s
               WHERE id_recordatorio = %s
                 AND estado = 'pendiente'
                 AND proximo_intento <= NOW()""",
            (token, recordatorio["id_recordatorio"]),
        )
        if not reclamado:
            continue

        entregado = email_service.enviar_recordatorio_cita(
            str(recordatorio["correo"]),
            str(recordatorio["nombre"]),
            {
                "codigo_reserva": recordatorio["codigo_reserva"],
                "fecha": recordatorio["fecha"],
                "hora_inicio": recordatorio["hora_inicio"],
                "barbero_nombre": recordatorio["barbero_nombre"],
            },
            int(recordatorio["id_usuario"]),
        )
        if entregado:
            execute_rowcount(
                """UPDATE recordatorios_citas
                   SET estado = 'enviado', enviado_en = NOW(), claim_token = NULL
                   WHERE id_recordatorio = %s AND claim_token = %s""",
                (recordatorio["id_recordatorio"], token),
            )
            enviados += 1
            continue

        siguiente_intento = int(recordatorio["intentos"]) + 1
        estado = "fallido" if siguiente_intento >= 2 else "pendiente"
        execute_rowcount(
            """UPDATE recordatorios_citas
               SET estado = %s, intentos = %s, claim_token = NULL,
                   proximo_intento = DATE_ADD(NOW(), INTERVAL 30 MINUTE)
               WHERE id_recordatorio = %s AND claim_token = %s""",
            (estado, siguiente_intento, recordatorio["id_recordatorio"], token),
        )

    return enviados


__all__ = ["procesar_recordatorios"]
