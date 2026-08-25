"""Facturacion: emision desde una cita, detalle, pago y anulacion."""

from datetime import datetime
from decimal import Decimal
from typing import Any

from app.core.config import settings
from app.core.exceptions import Conflicto, DatosInvalidos, NoEncontrado, Prohibido
from app.core.security import generar_numero_factura
from app.db.database import execute, fetch_all, fetch_one, fetch_value, transaction
from app.services import notificaciones_service
from app.services.auditoria_service import Accion, registrar_auditoria

SQL_FACTURA = """
    SELECT f.id_factura, f.numero_factura, f.id_cita, f.subtotal, f.descuento,
           f.impuestos, f.total, f.metodo_pago, f.estado_pago, f.observaciones,
           f.fecha_emision, f.pagado_en, f.anulada_en,
           c.codigo_reserva, c.fecha AS fecha_cita, c.hora_inicio, c.id_cliente, c.id_barbero,
           uc.nombre AS cliente_nombre, uc.correo AS cliente_correo, uc.id_usuario AS id_usuario_cliente,
           ub.nombre AS barbero_nombre,
           s.nombre AS servicio_nombre
    FROM facturas f
    JOIN citas c ON c.id_cita = f.id_cita
    JOIN clientes cl ON cl.id_cliente = c.id_cliente
    JOIN usuarios uc ON uc.id_usuario = cl.id_usuario
    JOIN barberos b ON b.id_barbero = c.id_barbero
    JOIN usuarios ub ON ub.id_usuario = b.id_usuario
    JOIN servicios s ON s.id_servicio = c.id_servicio
"""


# ----------------------------------------------------------------------
# Consultas
# ----------------------------------------------------------------------

def obtener(id_factura: int, con_detalle: bool = True) -> dict:
    factura = fetch_one(f"{SQL_FACTURA} WHERE f.id_factura = %s", (id_factura,))
    if not factura:
        raise NoEncontrado("La factura no existe")
    if con_detalle:
        factura["detalles"] = listar_detalle(id_factura)
    return factura


def obtener_por_cita(id_cita: int) -> dict | None:
    factura = fetch_one(f"{SQL_FACTURA} WHERE f.id_cita = %s", (id_cita,))
    if factura:
        factura["detalles"] = listar_detalle(int(factura["id_factura"]))
    return factura


def listar_detalle(id_factura: int) -> list[dict]:
    return fetch_all(
        """SELECT id_detalle, id_factura, id_servicio, descripcion, cantidad,
                  precio_unitario, descuento, subtotal
           FROM detalle_factura
           WHERE id_factura = %s
           ORDER BY id_detalle""",
        (id_factura,),
    )


def _filtros(
    id_cliente: int | None = None,
    id_barbero: int | None = None,
    estado_pago: str | None = None,
    metodo_pago: str | None = None,
    desde: str | None = None,
    hasta: str | None = None,
    buscar: str | None = None,
) -> tuple[str, list[Any]]:
    condiciones: list[str] = []
    params: list[Any] = []
    if id_cliente is not None:
        condiciones.append("c.id_cliente = %s")
        params.append(id_cliente)
    if id_barbero is not None:
        condiciones.append("c.id_barbero = %s")
        params.append(id_barbero)
    if estado_pago:
        condiciones.append("f.estado_pago = %s")
        params.append(estado_pago)
    if metodo_pago:
        condiciones.append("f.metodo_pago = %s")
        params.append(metodo_pago)
    if desde:
        condiciones.append("DATE(f.fecha_emision) >= %s")
        params.append(desde)
    if hasta:
        condiciones.append("DATE(f.fecha_emision) <= %s")
        params.append(hasta)
    if buscar:
        condiciones.append("(f.numero_factura LIKE %s OR uc.nombre LIKE %s OR c.codigo_reserva LIKE %s)")
        patron = f"%{buscar}%"
        params.extend([patron, patron, patron])
    where = f"WHERE {' AND '.join(condiciones)}" if condiciones else ""
    return where, params


def listar(limite: int = 50, offset: int = 0, **filtros) -> list[dict]:
    where, params = _filtros(**filtros)
    params = [*params, limite, offset]
    return fetch_all(
        f"{SQL_FACTURA} {where} ORDER BY f.fecha_emision DESC, f.id_factura DESC "
        "LIMIT %s OFFSET %s",
        params,
    )


def contar(**filtros) -> int:
    where, params = _filtros(**filtros)
    sql = f"""
        SELECT COUNT(*) FROM facturas f
        JOIN citas c ON c.id_cita = f.id_cita
        JOIN clientes cl ON cl.id_cliente = c.id_cliente
        JOIN usuarios uc ON uc.id_usuario = cl.id_usuario
        {where}
    """
    return int(fetch_value(sql, params, por_defecto=0) or 0)


# ----------------------------------------------------------------------
# Emision
# ----------------------------------------------------------------------

def _siguiente_numero(anio: int) -> str:
    total = int(
        fetch_value(
            "SELECT COUNT(*) FROM facturas WHERE YEAR(fecha_emision) = %s",
            (anio,),
            por_defecto=0,
        ) or 0
    )
    for intento in range(1, 50):
        numero = generar_numero_factura(total + intento, anio)
        existe = fetch_value(
            "SELECT COUNT(*) FROM facturas WHERE numero_factura = %s", (numero,), por_defecto=0
        )
        if not int(existe or 0):
            return numero
    raise Conflicto("No se pudo generar un numero de factura unico")


def emitir(datos: dict, actor: Any = None, contexto: dict | None = None) -> dict:
    """Emite la factura de una cita completada."""
    contexto = contexto or {}
    id_cita = int(datos["id_cita"])

    cita = fetch_one(
        """SELECT c.id_cita, c.codigo_reserva, c.estado, c.precio_total,
                  c.descuento_aplicado, c.id_cliente, c.id_barbero, c.id_servicio,
                  s.nombre AS servicio_nombre, s.precio AS servicio_precio,
                  s.puntos_otorga, cl.id_usuario AS id_usuario_cliente,
                  u.nombre AS cliente_nombre, u.correo AS cliente_correo
           FROM citas c
           JOIN servicios s ON s.id_servicio = c.id_servicio
           JOIN clientes cl ON cl.id_cliente = c.id_cliente
           JOIN usuarios u ON u.id_usuario = cl.id_usuario
           WHERE c.id_cita = %s""",
        (id_cita,),
    )
    if not cita:
        raise NoEncontrado("La cita no existe")
    if cita["estado"] not in ("completada", "en_atencion"):
        raise Conflicto(
            "Solo se puede facturar una cita completada o en atencion "
            f"(estado actual: {cita['estado']})"
        )
    if obtener_por_cita(id_cita):
        raise Conflicto("Esta cita ya tiene una factura emitida")

    lineas = datos.get("detalles") or [
        {
            "id_servicio": cita["id_servicio"],
            "descripcion": cita["servicio_nombre"],
            "cantidad": 1,
            "precio_unitario": float(cita["precio_total"] or cita["servicio_precio"]),
            "descuento": 0,
        }
    ]

    subtotal = Decimal("0")
    filas_detalle = []
    for linea in lineas:
        cantidad = int(linea.get("cantidad") or 1)
        if cantidad <= 0:
            raise DatosInvalidos("La cantidad de cada linea debe ser mayor que 0")
        precio_unitario = Decimal(str(linea["precio_unitario"]))
        descuento_linea = Decimal(str(linea.get("descuento") or 0))
        subtotal_linea = precio_unitario * cantidad - descuento_linea
        if subtotal_linea < 0:
            raise DatosInvalidos("El descuento de una linea no puede superar su valor")
        subtotal += subtotal_linea
        filas_detalle.append(
            (
                linea.get("id_servicio"),
                linea.get("descripcion") or cita["servicio_nombre"],
                cantidad,
                precio_unitario,
                descuento_linea,
                subtotal_linea,
            )
        )

    descuento = Decimal(str(datos.get("descuento", cita["descuento_aplicado"] or 0)))
    if descuento > subtotal:
        raise DatosInvalidos("El descuento no puede superar el subtotal")

    base = subtotal - descuento
    impuestos = Decimal(str(datos.get("impuestos"))) if datos.get("impuestos") is not None else (
        base * Decimal(str(settings.IVA_PORCENTAJE)) / Decimal("100")
    )
    total = base + impuestos

    numero = _siguiente_numero(datetime.now().year)
    metodo_pago = datos.get("metodo_pago")
    estado_pago = datos.get("estado_pago") or ("pagada" if metodo_pago else "pendiente")

    with transaction() as cursor:
        cursor.execute(
            """INSERT INTO facturas
                   (numero_factura, id_cita, subtotal, descuento, impuestos, total,
                    metodo_pago, estado_pago, observaciones, pagado_en)
               VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)""",
            (
                numero, id_cita, subtotal, descuento, impuestos, total,
                metodo_pago, estado_pago, datos.get("observaciones"),
                datetime.now().strftime("%Y-%m-%d %H:%M:%S") if estado_pago == "pagada" else None,
            ),
        )
        id_factura = cursor.lastrowid

        for fila in filas_detalle:
            cursor.execute(
                """INSERT INTO detalle_factura
                       (id_factura, id_servicio, descripcion, cantidad, precio_unitario,
                        descuento, subtotal)
                   VALUES (%s, %s, %s, %s, %s, %s, %s)""",
                (id_factura, *fila),
            )

    registrar_auditoria(
        Accion.FACTURA_EMITIDA, "facturas", id_factura, getattr(actor, "id_usuario", None),
        contexto.get("ip"), contexto.get("user_agent"),
        {"numero": numero, "total": float(total), "id_cita": id_cita},
    )
    notificaciones_service.crear_notificacion(
        int(cita["id_usuario_cliente"]), "Factura emitida",
        f"Se emitio la factura {numero} por ${total:,.0f} de tu cita {cita['codigo_reserva']}.",
        "pago", f"/facturas/{id_factura}",
    )
    return obtener(id_factura)


# ----------------------------------------------------------------------
# Pago y anulacion
# ----------------------------------------------------------------------

def registrar_pago(
    id_factura: int, metodo_pago: str, actor: Any = None, contexto: dict | None = None
) -> dict:
    contexto = contexto or {}
    factura = obtener(id_factura, con_detalle=False)

    if factura["estado_pago"] == "pagada":
        raise Conflicto("La factura ya esta pagada")
    if factura["estado_pago"] in ("anulada", "reembolsada"):
        raise Conflicto(f"No se puede cobrar una factura {factura['estado_pago']}")

    execute(
        """UPDATE facturas
           SET estado_pago = 'pagada', metodo_pago = %s, pagado_en = NOW()
           WHERE id_factura = %s""",
        (metodo_pago, id_factura),
    )
    registrar_auditoria(
        Accion.FACTURA_PAGADA, "facturas", id_factura, getattr(actor, "id_usuario", None),
        contexto.get("ip"), contexto.get("user_agent"),
        {"numero": factura["numero_factura"], "metodo_pago": metodo_pago},
    )
    notificaciones_service.crear_notificacion(
        int(factura["id_usuario_cliente"]), "Pago registrado",
        f"Registramos el pago de la factura {factura['numero_factura']} por "
        f"${float(factura['total']):,.0f}.",
        "pago",
    )
    return obtener(id_factura)


def anular(
    id_factura: int, motivo: str, actor: Any = None, contexto: dict | None = None
) -> dict:
    contexto = contexto or {}
    factura = obtener(id_factura, con_detalle=False)

    if factura["estado_pago"] == "anulada":
        raise Conflicto("La factura ya esta anulada")

    nuevo_estado = "reembolsada" if factura["estado_pago"] == "pagada" else "anulada"
    observaciones = f"{factura.get('observaciones') or ''}\n[Anulacion] {motivo}".strip()

    execute(
        """UPDATE facturas
           SET estado_pago = %s, anulada_en = NOW(), observaciones = %s
           WHERE id_factura = %s""",
        (nuevo_estado, observaciones, id_factura),
    )
    registrar_auditoria(
        Accion.FACTURA_ANULADA, "facturas", id_factura, getattr(actor, "id_usuario", None),
        contexto.get("ip"), contexto.get("user_agent"),
        {"numero": factura["numero_factura"], "motivo": motivo, "estado": nuevo_estado},
    )
    return obtener(id_factura)


def verificar_acceso(factura: dict, actor: Any) -> None:
    if actor is None or getattr(actor, "es_admin", False):
        return
    if getattr(actor, "es_cliente", False):
        if int(factura["id_cliente"]) != int(getattr(actor, "id_cliente", -1) or -1):
            raise Prohibido("Esta factura no te pertenece")
        return
    if getattr(actor, "es_barbero", False):
        if int(factura["id_barbero"]) != int(getattr(actor, "id_barbero", -1) or -1):
            raise Prohibido("Esta factura no corresponde a tus servicios")


__all__ = [
    "obtener",
    "obtener_por_cita",
    "listar",
    "contar",
    "listar_detalle",
    "emitir",
    "registrar_pago",
    "anular",
    "verificar_acceso",
]
