from typing import Any

from app.core.config import settings
from app.core.exceptions import Conflicto, DatosInvalidos, NoEncontrado
from app.db.database import fetch_all, fetch_one, fetch_value, transaction

NIVELES = ("Bronce", "Plata", "Oro", "Diamante")


def nivel_por_puntos(saldo: int) -> str:
    if saldo >= settings.NIVEL_DIAMANTE_DESDE:
        return "Diamante"
    if saldo >= settings.NIVEL_ORO_DESDE:
        return "Oro"
    if saldo >= settings.NIVEL_PLATA_DESDE:
        return "Plata"
    return "Bronce"


def _proximo_nivel(saldo: int) -> tuple[str | None, int | None]:
    umbrales = [
        ("Plata", settings.NIVEL_PLATA_DESDE),
        ("Oro", settings.NIVEL_ORO_DESDE),
        ("Diamante", settings.NIVEL_DIAMANTE_DESDE),
    ]
    for nombre, umbral in umbrales:
        if saldo < umbral:
            return nombre, umbral - saldo
    return None, None


# ----------------------------------------------------------------------
# Movimientos
# ----------------------------------------------------------------------

def aplicar_movimiento(
    cursor: Any,
    id_cliente: int,
    tipo: str,
    puntos: int,
    descripcion: str | None = None,
    id_cita: int | None = None,
    id_usuario_responsable: int | None = None,
) -> int:
    """Aplica un movimiento de puntos dentro de una transaccion abierta.

    `puntos` positivo suma y negativo descuenta. Devuelve el saldo resultante.
    """
    if puntos == 0:
        raise DatosInvalidos("El movimiento de puntos no puede ser 0")

    cursor.execute(
        "SELECT puntos_saldo FROM clientes WHERE id_cliente = %s FOR UPDATE",
        (id_cliente,),
    )
    fila = cursor.fetchone()
    if not fila:
        raise NoEncontrado("El cliente no existe")

    saldo_actual = int(fila["puntos_saldo"])
    nuevo_saldo = saldo_actual + puntos
    if nuevo_saldo < 0:
        raise Conflicto(
            f"Puntos insuficientes: el cliente tiene {saldo_actual} y se intentan "
            f"descontar {abs(puntos)}"
        )

    cursor.execute(
        "UPDATE clientes SET puntos_saldo = %s, nivel_fidelizacion = %s WHERE id_cliente = %s",
        (nuevo_saldo, nivel_por_puntos(nuevo_saldo), id_cliente),
    )
    cursor.execute(
        """INSERT INTO puntos_movimientos
               (id_cliente, id_cita, id_usuario_responsable, tipo, puntos,
                saldo_resultante, descripcion)
           VALUES (%s, %s, %s, %s, %s, %s, %s)""",
        (id_cliente, id_cita, id_usuario_responsable, tipo, puntos, nuevo_saldo, descripcion),
    )
    return nuevo_saldo


def ajustar_puntos(
    id_cliente: int,
    puntos: int,
    descripcion: str,
    id_usuario_responsable: int | None = None,
    tipo: str = "ajuste",
    id_cita: int | None = None,
) -> int:
    """Ajuste manual de puntos (transaccion propia)."""
    with transaction() as cursor:
        return aplicar_movimiento(
            cursor, id_cliente, tipo, puntos, descripcion, id_cita, id_usuario_responsable
        )


def canjear_puntos(
    id_cliente: int,
    puntos: int,
    descripcion: str = "Canje de puntos",
    id_cita: int | None = None,
    id_usuario_responsable: int | None = None,
) -> int:
    if puntos <= 0:
        raise DatosInvalidos("Los puntos a canjear deben ser mayores que 0")
    with transaction() as cursor:
        return aplicar_movimiento(
            cursor, id_cliente, "canje", -abs(puntos), descripcion, id_cita,
            id_usuario_responsable,
        )


def valor_en_pesos(puntos: int) -> float:
    return round(puntos * settings.PUNTO_VALOR_COP, 2)


def puntos_desde_pesos(monto: float) -> int:
    if settings.PUNTO_VALOR_COP <= 0:
        return 0
    return int(monto // settings.PUNTO_VALOR_COP)


# ----------------------------------------------------------------------
# Consultas
# ----------------------------------------------------------------------

def obtener_saldo(id_cliente: int) -> dict:
    cliente = fetch_one(
        """SELECT c.id_cliente, c.puntos_saldo, c.nivel_fidelizacion, u.nombre
           FROM clientes c
           JOIN usuarios u ON u.id_usuario = c.id_usuario
           WHERE c.id_cliente = %s""",
        (id_cliente,),
    )
    if not cliente:
        raise NoEncontrado("El cliente no existe")

    totales = fetch_one(
        """SELECT
               COALESCE(SUM(CASE WHEN puntos > 0 THEN puntos ELSE 0 END), 0) AS ganados,
               COALESCE(SUM(CASE WHEN puntos < 0 THEN -puntos ELSE 0 END), 0) AS canjeados
           FROM puntos_movimientos
           WHERE id_cliente = %s""",
        (id_cliente,),
    ) or {"ganados": 0, "canjeados": 0}

    saldo = int(cliente["puntos_saldo"])
    proximo, faltantes = _proximo_nivel(saldo)
    return {
        "id_cliente": int(cliente["id_cliente"]),
        "puntos_saldo": saldo,
        "nivel_fidelizacion": cliente["nivel_fidelizacion"],
        "valor_estimado_cop": valor_en_pesos(saldo),
        "puntos_ganados": int(totales["ganados"] or 0),
        "puntos_canjeados": int(totales["canjeados"] or 0),
        "proximo_nivel": proximo,
        "puntos_para_proximo_nivel": faltantes,
    }


def listar_movimientos(
    id_cliente: int, limite: int = 50, offset: int = 0, tipo: str | None = None
) -> list[dict]:
    condiciones = ["m.id_cliente = %s"]
    params: list[Any] = [id_cliente]
    if tipo:
        condiciones.append("m.tipo = %s")
        params.append(tipo)
    params.extend([limite, offset])

    return fetch_all(
        f"""SELECT m.id_movimiento, m.id_cliente, m.id_cita, m.tipo, m.puntos,
                   m.saldo_resultante, m.descripcion, m.creado_en,
                   c.codigo_reserva
            FROM puntos_movimientos m
            LEFT JOIN citas c ON c.id_cita = m.id_cita
            WHERE {' AND '.join(condiciones)}
            ORDER BY m.creado_en DESC, m.id_movimiento DESC
            LIMIT %s OFFSET %s""",
        params,
    )


def contar_movimientos(id_cliente: int, tipo: str | None = None) -> int:
    if tipo:
        return int(
            fetch_value(
                "SELECT COUNT(*) FROM puntos_movimientos WHERE id_cliente = %s AND tipo = %s",
                (id_cliente, tipo),
                por_defecto=0,
            ) or 0
        )
    return int(
        fetch_value(
            "SELECT COUNT(*) FROM puntos_movimientos WHERE id_cliente = %s",
            (id_cliente,),
            por_defecto=0,
        ) or 0
    )


__all__ = [
    "NIVELES",
    "nivel_por_puntos",
    "aplicar_movimiento",
    "ajustar_puntos",
    "canjear_puntos",
    "valor_en_pesos",
    "puntos_desde_pesos",
    "obtener_saldo",
    "listar_movimientos",
    "contar_movimientos",
]
