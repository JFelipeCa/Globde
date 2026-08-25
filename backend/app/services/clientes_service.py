from typing import Any

from app.core.config import settings
from app.core.exceptions import Conflicto, DatosInvalidos, NoEncontrado
from app.core.security import hash_password
from app.db.database import execute, fetch_all, fetch_one, fetch_value, transaction
from app.services import usuarios_service

SQL_CLIENTE = """
    SELECT c.id_cliente, c.id_usuario, u.nombre, u.correo, u.telefono, u.activo,
           c.puntos_saldo, c.nivel_fidelizacion, c.fecha_registro
    FROM clientes c
    JOIN usuarios u ON u.id_usuario = c.id_usuario
"""

SQL_RESUMEN = """
    SELECT id_cliente, id_usuario, nombre, correo, telefono, activo,
           puntos_saldo, nivel_fidelizacion, fecha_registro,
           total_citas, COALESCE(citas_completadas, 0) AS citas_completadas,
           COALESCE(citas_canceladas, 0) AS citas_canceladas,
           COALESCE(citas_no_asistio, 0) AS citas_no_asistio,
           total_pagado, ultima_fecha_cita
    FROM v_resumen_clientes
"""


# ----------------------------------------------------------------------
# Consultas
# ----------------------------------------------------------------------

def obtener(id_cliente: int) -> dict:
    fila = fetch_one(f"{SQL_CLIENTE} WHERE c.id_cliente = %s", (id_cliente,))
    if not fila:
        raise NoEncontrado("El cliente no existe")
    return fila


def obtener_resumen(id_cliente: int) -> dict:
    fila = fetch_one(f"{SQL_RESUMEN} WHERE id_cliente = %s", (id_cliente,))
    if not fila:
        raise NoEncontrado("El cliente no existe")
    return fila


def obtener_por_usuario(id_usuario: int) -> dict | None:
    return fetch_one(f"{SQL_CLIENTE} WHERE c.id_usuario = %s", (id_usuario,))


def _filtros(
    buscar: str | None, nivel: str | None, activo: bool | None
) -> tuple[str, list[Any]]:
    condiciones: list[str] = []
    params: list[Any] = []
    if buscar:
        condiciones.append("(nombre LIKE %s OR correo LIKE %s OR telefono LIKE %s)")
        patron = f"%{buscar}%"
        params.extend([patron, patron, patron])
    if nivel:
        condiciones.append("nivel_fidelizacion = %s")
        params.append(nivel)
    if activo is not None:
        condiciones.append("activo = %s")
        params.append(1 if activo else 0)
    where = f"WHERE {' AND '.join(condiciones)}" if condiciones else ""
    return where, params


def listar(
    buscar: str | None = None,
    nivel: str | None = None,
    activo: bool | None = None,
    limite: int = 50,
    offset: int = 0,
    con_resumen: bool = True,
) -> list[dict]:
    where, params = _filtros(buscar, nivel, activo)
    base = SQL_RESUMEN if con_resumen else SQL_CLIENTE
    
    orden = (
        "ORDER BY nombre ASC, id_cliente ASC"
        if con_resumen
        else "ORDER BY u.nombre ASC, c.id_cliente ASC"
    )
    if not con_resumen and where:
        where = where.replace("nombre LIKE", "u.nombre LIKE")
        where = where.replace("correo LIKE", "u.correo LIKE")
        where = where.replace("telefono LIKE", "u.telefono LIKE")
        where = where.replace("nivel_fidelizacion =", "c.nivel_fidelizacion =")
        where = where.replace("activo =", "u.activo =")
    params = [*params, limite, offset]
    return fetch_all(f"{base} {where} {orden} LIMIT %s OFFSET %s", params)


def contar(
    buscar: str | None = None, nivel: str | None = None, activo: bool | None = None
) -> int:
    where, params = _filtros(buscar, nivel, activo)
    return int(
        fetch_value(f"SELECT COUNT(*) FROM v_resumen_clientes {where}", params, por_defecto=0) or 0
    )


def historial_citas(id_cliente: int, limite: int = 50, offset: int = 0) -> list[dict]:
    return fetch_all(
        """SELECT * FROM v_citas_detalle
           WHERE id_cliente = %s
           ORDER BY fecha DESC, hora_inicio DESC
           LIMIT %s OFFSET %s""",
        (id_cliente, limite, offset),
    )


# ----------------------------------------------------------------------
# Altas y actualizaciones
# ----------------------------------------------------------------------

def crear(datos: dict, contrasena_generada: str | None = None) -> tuple[dict, str | None]:
    """Crea un cliente. Devuelve (cliente, contrasena_temporal_o_None)."""
    correo = datos["correo"].strip().lower()
    if usuarios_service.existe_correo(correo):
        raise Conflicto("Ya existe un usuario registrado con ese correo")

    contrasena = datos.get("contrasena") or contrasena_generada
    temporal = None
    if not contrasena:
        raise DatosInvalidos("Se requiere una contrasena para crear el cliente")
    if not datos.get("contrasena"):
        temporal = contrasena

    with transaction() as cursor:
        cursor.execute(
            """INSERT INTO usuarios (id_rol, nombre, correo, telefono, contrasena_hash)
               VALUES (%s, %s, %s, %s, %s)""",
            (
                settings.ROL_CLIENTE,
                datos["nombre"],
                correo,
                datos.get("telefono"),
                hash_password(contrasena),
            ),
        )
        id_usuario = cursor.lastrowid
        cursor.execute("INSERT INTO clientes (id_usuario) VALUES (%s)", (id_usuario,))
        id_cliente = cursor.lastrowid

    return obtener(id_cliente), temporal


def actualizar(id_cliente: int, datos: dict) -> dict:
    cliente = obtener(id_cliente)
    id_usuario = int(cliente["id_usuario"])

    datos_usuario = {
        campo: datos[campo]
        for campo in ("nombre", "correo", "telefono")
        if datos.get(campo) is not None
    }
    if datos_usuario:
        usuarios_service.actualizar(id_usuario, datos_usuario)

    if datos.get("nivel_fidelizacion"):
        execute(
            "UPDATE clientes SET nivel_fidelizacion = %s WHERE id_cliente = %s",
            (datos["nivel_fidelizacion"], id_cliente),
        )

    if not datos_usuario and not datos.get("nivel_fidelizacion"):
        raise DatosInvalidos("No se enviaron campos para actualizar")

    return obtener(id_cliente)


def cambiar_estado(id_cliente: int, activo: bool) -> dict:
    cliente = obtener(id_cliente)
    usuarios_service.cambiar_estado(int(cliente["id_usuario"]), activo)
    return obtener(id_cliente)


def eliminar(id_cliente: int) -> dict:
    """Baja logica del cliente (se conserva el historial de citas)."""
    return cambiar_estado(id_cliente, False)


__all__ = [
    "obtener",
    "obtener_resumen",
    "obtener_por_usuario",
    "listar",
    "contar",
    "historial_citas",
    "crear",
    "actualizar",
    "cambiar_estado",
    "eliminar",
]
