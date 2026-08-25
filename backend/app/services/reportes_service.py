"""Dashboards y reportes analiticos apoyados en las vistas del esquema v2."""

from datetime import date, timedelta
from typing import Any

from app.db.database import fetch_all, fetch_one, fetch_value
from app.db.serializers import hhmm

AGRUPAMIENTOS = {
    "dia": "DATE(f.fecha_emision)",
    "semana": "DATE_FORMAT(f.fecha_emision, '%x-S%v')",
    "mes": "DATE_FORMAT(f.fecha_emision, '%Y-%m')",
    "anio": "YEAR(f.fecha_emision)",
}


def _rango(desde: str | None, hasta: str | None, dias: int = 30) -> tuple[str, str]:
    hoy = date.today()
    return (
        desde or (hoy - timedelta(days=dias)).isoformat(),
        hasta or hoy.isoformat(),
    )


# ----------------------------------------------------------------------
# Dashboards
# ----------------------------------------------------------------------

def dashboard_admin() -> dict:
    kpis = fetch_one("SELECT * FROM v_dashboard_admin") or {}
    hoy = date.today()
    inicio_semana = hoy - timedelta(days=hoy.weekday())
    inicio_mes = hoy.replace(day=1)

    datos: dict[str, Any] = dict(kpis)
    datos["citas_hoy"] = int(
        fetch_value("SELECT COUNT(*) FROM citas WHERE fecha = %s", (hoy.isoformat(),), por_defecto=0) or 0
    )
    datos["citas_semana"] = int(
        fetch_value(
            "SELECT COUNT(*) FROM citas WHERE fecha BETWEEN %s AND %s",
            (inicio_semana.isoformat(), (inicio_semana + timedelta(days=6)).isoformat()),
            por_defecto=0,
        ) or 0
    )
    datos["ingresos_mes"] = float(
        fetch_value(
            """SELECT COALESCE(SUM(total), 0) FROM facturas
               WHERE estado_pago = 'pagada' AND DATE(fecha_emision) >= %s""",
            (inicio_mes.isoformat(),),
            por_defecto=0,
        ) or 0
    )
    datos["clientes_nuevos_mes"] = int(
        fetch_value(
            "SELECT COUNT(*) FROM clientes WHERE DATE(fecha_registro) >= %s",
            (inicio_mes.isoformat(),),
            por_defecto=0,
        ) or 0
    )
    datos["resenas_promedio"] = float(
        fetch_value(
            "SELECT COALESCE(AVG(calificacion), 0) FROM resenas WHERE visible = 1", por_defecto=0
        ) or 0
    )

    total_citas = int(datos.get("total_citas") or 0)
    if total_citas:
        datos["tasa_cancelacion"] = round(
            int(datos.get("citas_canceladas") or 0) * 100 / total_citas, 2
        )
        datos["tasa_no_asistencia"] = round(
            int(datos.get("citas_no_asistio") or 0) * 100 / total_citas, 2
        )
    else:
        datos["tasa_cancelacion"] = 0.0
        datos["tasa_no_asistencia"] = 0.0

    datos["ingresos_pagados"] = float(datos.get("ingresos_pagados") or 0)
    return datos


def dashboard_barbero(id_barbero: int) -> dict:
    hoy = date.today()
    inicio_semana = hoy - timedelta(days=hoy.weekday())
    inicio_mes = hoy.replace(day=1)

    barbero = fetch_one(
        """SELECT b.id_barbero, u.nombre, b.rating, b.total_resenas, b.citas_completadas
           FROM barberos b JOIN usuarios u ON u.id_usuario = b.id_usuario
           WHERE b.id_barbero = %s""",
        (id_barbero,),
    ) or {"id_barbero": id_barbero}

    conteos = fetch_one(
        """SELECT
               SUM(fecha = %s) AS citas_hoy,
               SUM(estado = 'pendiente') AS citas_pendientes,
               SUM(fecha BETWEEN %s AND %s) AS citas_semana
           FROM citas
           WHERE id_barbero = %s AND estado NOT IN ('cancelada')""",
        (
            hoy.isoformat(), inicio_semana.isoformat(),
            (inicio_semana + timedelta(days=6)).isoformat(), id_barbero,
        ),
    ) or {}

    ingresos_mes = fetch_value(
        """SELECT COALESCE(SUM(f.total), 0)
           FROM facturas f JOIN citas c ON c.id_cita = f.id_cita
           WHERE c.id_barbero = %s AND f.estado_pago = 'pagada'
             AND DATE(f.fecha_emision) >= %s""",
        (id_barbero, inicio_mes.isoformat()),
        por_defecto=0,
    )

    proximas = fetch_all(
        """SELECT id_cita, codigo_reserva, fecha, hora_inicio, hora_fin, estado,
                  cliente_nombre, servicio_nombre
           FROM v_citas_detalle
           WHERE id_barbero = %s AND estado IN ('pendiente', 'confirmada', 'en_atencion')
             AND CONCAT(fecha, ' ', hora_inicio) >= NOW()
           ORDER BY fecha, hora_inicio
           LIMIT 10""",
        (id_barbero,),
    )
    for cita in proximas:
        cita["hora_inicio"] = hhmm(cita["hora_inicio"])
        cita["hora_fin"] = hhmm(cita["hora_fin"])

    return {
        "id_barbero": int(barbero.get("id_barbero", id_barbero)),
        "nombre": barbero.get("nombre"),
        "citas_hoy": int(conteos.get("citas_hoy") or 0),
        "citas_pendientes": int(conteos.get("citas_pendientes") or 0),
        "citas_semana": int(conteos.get("citas_semana") or 0),
        "citas_completadas": int(barbero.get("citas_completadas") or 0),
        "ingresos_mes": float(ingresos_mes or 0),
        "rating": float(barbero.get("rating") or 0),
        "total_resenas": int(barbero.get("total_resenas") or 0),
        "proximas_citas": proximas,
    }


def dashboard_cliente(id_cliente: int) -> dict:
    resumen = fetch_one(
        "SELECT * FROM v_resumen_clientes WHERE id_cliente = %s", (id_cliente,)
    ) or {}

    proxima = fetch_one(
        """SELECT id_cita, codigo_reserva, fecha, hora_inicio, hora_fin, estado,
                  barbero_nombre, servicio_nombre, precio_total
           FROM v_citas_detalle
           WHERE id_cliente = %s AND estado IN ('pendiente', 'confirmada', 'en_atencion')
             AND CONCAT(fecha, ' ', hora_inicio) >= NOW()
           ORDER BY fecha, hora_inicio
           LIMIT 1""",
        (id_cliente,),
    )
    if proxima:
        proxima["hora_inicio"] = hhmm(proxima["hora_inicio"])
        proxima["hora_fin"] = hhmm(proxima["hora_fin"])

    return {
        "id_cliente": id_cliente,
        "nombre": resumen.get("nombre"),
        "puntos_saldo": int(resumen.get("puntos_saldo") or 0),
        "nivel_fidelizacion": resumen.get("nivel_fidelizacion") or "Bronce",
        "total_citas": int(resumen.get("total_citas") or 0),
        "citas_completadas": int(resumen.get("citas_completadas") or 0),
        "citas_canceladas": int(resumen.get("citas_canceladas") or 0),
        "total_pagado": float(resumen.get("total_pagado") or 0),
        "proxima_cita": proxima,
        "ultima_fecha_cita": resumen.get("ultima_fecha_cita"),
    }


# ----------------------------------------------------------------------
# Reporte de ingresos
# ----------------------------------------------------------------------

def reporte_ingresos(
    desde: str | None = None, hasta: str | None = None, agrupar_por: str = "dia"
) -> dict:
    desde, hasta = _rango(desde, hasta)
    expresion = AGRUPAMIENTOS.get(agrupar_por, AGRUPAMIENTOS["dia"])

    totales = fetch_one(
        """SELECT COUNT(*) AS total_citas,
                  COALESCE(SUM(f.total), 0) AS total_facturado,
                  COALESCE(SUM(CASE WHEN f.estado_pago = 'pagada' THEN f.total ELSE 0 END), 0) AS total_pagado,
                  COALESCE(SUM(CASE WHEN f.estado_pago = 'pendiente' THEN f.total ELSE 0 END), 0) AS total_pendiente
           FROM facturas f
           WHERE DATE(f.fecha_emision) BETWEEN %s AND %s
             AND f.estado_pago <> 'anulada'""",
        (desde, hasta),
    ) or {}

    periodos = fetch_all(
        f"""SELECT {expresion} AS periodo,
                   COUNT(*) AS total_citas,
                   COALESCE(SUM(f.total), 0) AS total_facturado,
                   COALESCE(SUM(CASE WHEN f.estado_pago = 'pagada' THEN f.total ELSE 0 END), 0) AS total_pagado,
                   COALESCE(SUM(f.descuento), 0) AS descuentos
            FROM facturas f
            WHERE DATE(f.fecha_emision) BETWEEN %s AND %s AND f.estado_pago <> 'anulada'
            GROUP BY periodo
            ORDER BY periodo""",
        (desde, hasta),
    )
    for periodo in periodos:
        periodo["periodo"] = str(periodo["periodo"])

    total_citas = int(totales.get("total_citas") or 0)
    total_facturado = float(totales.get("total_facturado") or 0)
    return {
        "desde": desde,
        "hasta": hasta,
        "agrupar_por": agrupar_por,
        "total_facturado": total_facturado,
        "total_pagado": float(totales.get("total_pagado") or 0),
        "total_pendiente": float(totales.get("total_pendiente") or 0),
        "total_citas": total_citas,
        "ticket_promedio": round(total_facturado / total_citas, 2) if total_citas else 0.0,
        "periodos": periodos,
    }


def ingresos_por_barbero(desde: str | None = None, hasta: str | None = None) -> list[dict]:
    desde, hasta = _rango(desde, hasta)
    return fetch_all(
        """SELECT b.id_barbero, u.nombre,
                  COUNT(DISTINCT CASE WHEN c.estado = 'completada' THEN c.id_cita END) AS citas_completadas,
                  COALESCE(SUM(CASE WHEN f.estado_pago <> 'anulada' THEN f.total ELSE 0 END), 0) AS total_facturado,
                  COALESCE(SUM(CASE WHEN f.estado_pago = 'pagada' THEN f.total ELSE 0 END), 0) AS total_pagado,
                  b.rating, b.total_resenas
           FROM barberos b
           JOIN usuarios u ON u.id_usuario = b.id_usuario
           LEFT JOIN citas c ON c.id_barbero = b.id_barbero AND c.fecha BETWEEN %s AND %s
           LEFT JOIN facturas f ON f.id_cita = c.id_cita
           GROUP BY b.id_barbero, u.nombre, b.rating, b.total_resenas
           ORDER BY total_pagado DESC, citas_completadas DESC""",
        (desde, hasta),
    )


def servicios_populares(
    desde: str | None = None, hasta: str | None = None, limite: int = 10
) -> list[dict]:
    desde, hasta = _rango(desde, hasta, dias=90)
    return fetch_all(
        """SELECT s.id_servicio, s.nombre, s.categoria, s.precio,
                  COUNT(c.id_cita) AS total_citas,
                  COALESCE(SUM(CASE WHEN c.estado = 'completada' THEN c.precio_total ELSE 0 END), 0) AS total_ingresos
           FROM servicios s
           LEFT JOIN citas c ON c.id_servicio = s.id_servicio AND c.fecha BETWEEN %s AND %s
           GROUP BY s.id_servicio, s.nombre, s.categoria, s.precio
           ORDER BY total_citas DESC, total_ingresos DESC
           LIMIT %s""",
        (desde, hasta, limite),
    )


# ----------------------------------------------------------------------
# Reporte de citas
# ----------------------------------------------------------------------

def reporte_citas(desde: str | None = None, hasta: str | None = None) -> dict:
    desde, hasta = _rango(desde, hasta)

    por_estado_filas = fetch_all(
        """SELECT estado, COUNT(*) AS total FROM citas
           WHERE fecha BETWEEN %s AND %s GROUP BY estado""",
        (desde, hasta),
    )
    por_estado = {str(f["estado"]): int(f["total"]) for f in por_estado_filas}

    por_dia = fetch_all(
        """SELECT fecha, COUNT(*) AS total,
                  SUM(estado = 'completada') AS completadas,
                  SUM(estado = 'cancelada') AS canceladas
           FROM citas
           WHERE fecha BETWEEN %s AND %s
           GROUP BY fecha
           ORDER BY fecha""",
        (desde, hasta),
    )

    por_barbero = fetch_all(
        """SELECT c.id_barbero, u.nombre, COUNT(*) AS total,
                  SUM(c.estado = 'completada') AS completadas,
                  SUM(c.estado = 'cancelada') AS canceladas,
                  SUM(c.estado = 'no_asistio') AS no_asistio
           FROM citas c
           JOIN barberos b ON b.id_barbero = c.id_barbero
           JOIN usuarios u ON u.id_usuario = b.id_usuario
           WHERE c.fecha BETWEEN %s AND %s
           GROUP BY c.id_barbero, u.nombre
           ORDER BY total DESC""",
        (desde, hasta),
    )

    por_servicio = fetch_all(
        """SELECT c.id_servicio, s.nombre, s.categoria, COUNT(*) AS total
           FROM citas c
           JOIN servicios s ON s.id_servicio = c.id_servicio
           WHERE c.fecha BETWEEN %s AND %s
           GROUP BY c.id_servicio, s.nombre, s.categoria
           ORDER BY total DESC""",
        (desde, hasta),
    )

    return {
        "desde": desde,
        "hasta": hasta,
        "total": sum(por_estado.values()),
        "por_estado": por_estado,
        "por_dia": por_dia,
        "por_barbero": por_barbero,
        "por_servicio": por_servicio,
    }


def ocupacion_barberos(desde: str | None = None, hasta: str | None = None) -> list[dict]:
    """Porcentaje de la jornada laboral realmente ocupado por citas."""
    desde, hasta = _rango(desde, hasta, dias=7)

    ocupados = fetch_all(
        """SELECT c.id_barbero, u.nombre,
                  COUNT(*) AS citas,
                  COALESCE(SUM(TIMESTAMPDIFF(MINUTE, c.hora_inicio, c.hora_fin)), 0) AS minutos_ocupados
           FROM citas c
           JOIN barberos b ON b.id_barbero = c.id_barbero
           JOIN usuarios u ON u.id_usuario = b.id_usuario
           WHERE c.fecha BETWEEN %s AND %s AND c.estado NOT IN ('cancelada', 'no_asistio')
           GROUP BY c.id_barbero, u.nombre""",
        (desde, hasta),
    )
    ocupados_por_id = {int(f["id_barbero"]): f for f in ocupados}

    inicio = date.fromisoformat(desde)
    fin = date.fromisoformat(hasta)
    dias = [(inicio + timedelta(days=i)).isoweekday() for i in range((fin - inicio).days + 1)]
    conteo_dias: dict[int, int] = {}
    for dia in dias:
        conteo_dias[dia] = conteo_dias.get(dia, 0) + 1

    horarios = fetch_all(
        """SELECT h.id_barbero, u.nombre, h.dia_semana,
                  TIMESTAMPDIFF(MINUTE, h.hora_inicio, h.hora_fin) AS minutos
           FROM horarios_barbero h
           JOIN barberos b ON b.id_barbero = h.id_barbero
           JOIN usuarios u ON u.id_usuario = b.id_usuario
           WHERE h.activo = 1"""
    )

    disponibles: dict[int, dict] = {}
    for fila in horarios:
        id_barbero = int(fila["id_barbero"])
        entrada = disponibles.setdefault(
            id_barbero, {"nombre": fila["nombre"], "minutos": 0}
        )
        entrada["minutos"] += int(fila["minutos"] or 0) * conteo_dias.get(
            int(fila["dia_semana"]), 0
        )

    resultado = []
    for id_barbero in set(list(disponibles.keys()) + list(ocupados_por_id.keys())):
        minutos_disponibles = int(disponibles.get(id_barbero, {}).get("minutos", 0))
        ocupado = ocupados_por_id.get(id_barbero, {})
        minutos_ocupados = int(ocupado.get("minutos_ocupados") or 0)
        nombre = disponibles.get(id_barbero, {}).get("nombre") or ocupado.get("nombre") or ""
        resultado.append(
            {
                "id_barbero": id_barbero,
                "nombre": nombre,
                "minutos_disponibles": minutos_disponibles,
                "minutos_ocupados": minutos_ocupados,
                "porcentaje_ocupacion": (
                    round(minutos_ocupados * 100 / minutos_disponibles, 2)
                    if minutos_disponibles else 0.0
                ),
                "citas": int(ocupado.get("citas") or 0),
            }
        )
    resultado.sort(key=lambda item: item["porcentaje_ocupacion"], reverse=True)
    return resultado


# ----------------------------------------------------------------------
# Fidelizacion
# ----------------------------------------------------------------------

def reporte_fidelizacion() -> dict:
    por_nivel = fetch_all(
        """SELECT nivel_fidelizacion AS nivel, COUNT(*) AS total,
                  COALESCE(SUM(puntos_saldo), 0) AS puntos
           FROM clientes
           GROUP BY nivel_fidelizacion
           ORDER BY FIELD(nivel_fidelizacion, 'Bronce', 'Plata', 'Oro', 'Diamante')"""
    )

    movimientos = fetch_one(
        """SELECT COALESCE(SUM(CASE WHEN puntos > 0 THEN puntos ELSE 0 END), 0) AS otorgados,
                  COALESCE(SUM(CASE WHEN puntos < 0 THEN -puntos ELSE 0 END), 0) AS canjeados
           FROM puntos_movimientos"""
    ) or {}

    top = fetch_all(
        """SELECT c.id_cliente, u.nombre, c.puntos_saldo, c.nivel_fidelizacion,
                  COUNT(ci.id_cita) AS total_citas
           FROM clientes c
           JOIN usuarios u ON u.id_usuario = c.id_usuario
           LEFT JOIN citas ci ON ci.id_cliente = c.id_cliente AND ci.estado = 'completada'
           GROUP BY c.id_cliente, u.nombre, c.puntos_saldo, c.nivel_fidelizacion
           ORDER BY c.puntos_saldo DESC
           LIMIT 10"""
    )

    return {
        "total_clientes": int(fetch_value("SELECT COUNT(*) FROM clientes", por_defecto=0) or 0),
        "puntos_en_circulacion": int(
            fetch_value("SELECT COALESCE(SUM(puntos_saldo), 0) FROM clientes", por_defecto=0) or 0
        ),
        "puntos_otorgados": int(movimientos.get("otorgados") or 0),
        "puntos_canjeados": int(movimientos.get("canjeados") or 0),
        "por_nivel": por_nivel,
        "top_clientes": top,
    }


__all__ = [
    "dashboard_admin",
    "dashboard_barbero",
    "dashboard_cliente",
    "reporte_ingresos",
    "ingresos_por_barbero",
    "servicios_populares",
    "reporte_citas",
    "ocupacion_barberos",
    "reporte_fidelizacion",
]
