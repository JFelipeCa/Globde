"""Catalogo de servicios de la barberia."""

from typing import Any

from app.core.exceptions import Conflicto, DatosInvalidos, NoEncontrado
from app.db.database import execute, fetch_all, fetch_one, fetch_value

CAMPOS = (
    "nombre",
    "categoria",
    "descripcion",
    "precio",
    "duracion_minutos",
    "icono",
    "imagen_url",
    "puntos_otorga",
    "popular",
    "activo",
)

SQL_SERVICIO = """
    SELECT id_servicio, nombre, categoria, descripcion, precio, duracion_minutos,
           icono, imagen_url, puntos_otorga, popular, activo, creado_en
    FROM servicios
"""


def obtener(id_servicio: int) -> dict:
    fila = fetch_one(f"{SQL_SERVICIO} WHERE id_servicio = %s", (id_servicio,))
    if not fila:
        raise NoEncontrado("El servicio no existe")
    return fila


def obtener_activo(id_servicio: int) -> dict:
    servicio = obtener(id_servicio)
    if not servicio.get("activo"):
        raise DatosInvalidos("El servicio no esta activo")
    return servicio


def listar(
    categoria: str | None = None,
    activo: bool | None = True,
    popular: bool | None = None,
    buscar: str | None = None,
    id_barbero: int | None = None,
) -> list[dict]:
    condiciones: list[str] = []
    params: list[Any] = []

    if categoria:
        condiciones.append("s.categoria = %s")
        params.append(categoria)
    if activo is not None:
        condiciones.append("s.activo = %s")
        params.append(1 if activo else 0)
    if popular is not None:
        condiciones.append("s.popular = %s")
        params.append(1 if popular else 0)
    if buscar:
        condiciones.append("(s.nombre LIKE %s OR s.descripcion LIKE %s)")
        patron = f"%{buscar}%"
        params.extend([patron, patron])

    join = ""
    if id_barbero is not None:
        join = "JOIN barbero_servicio bs ON bs.id_servicio = s.id_servicio AND bs.activo = 1"
        condiciones.append("bs.id_barbero = %s")
        params.append(id_barbero)

    where = f"WHERE {' AND '.join(condiciones)}" if condiciones else ""
    return fetch_all(
        f"""SELECT s.id_servicio, s.nombre, s.categoria, s.descripcion, s.precio,
                   s.duracion_minutos, s.icono, s.imagen_url, s.puntos_otorga,
                   s.popular, s.activo, s.creado_en
            FROM servicios s
            {join}
            {where}
            ORDER BY s.popular DESC, s.categoria ASC, s.nombre ASC""",
        params,
    )


def listar_categorias() -> list[dict]:
    return fetch_all(
        """SELECT categoria, COUNT(*) AS total,
                  MIN(precio) AS precio_minimo, MAX(precio) AS precio_maximo
           FROM servicios
           WHERE activo = 1
           GROUP BY categoria
           ORDER BY categoria"""
    )


def existe_nombre(nombre: str, excluir_id: int | None = None) -> bool:
    if excluir_id:
        total = fetch_value(
            "SELECT COUNT(*) FROM servicios WHERE nombre = %s AND id_servicio <> %s",
            (nombre, excluir_id),
            por_defecto=0,
        )
    else:
        total = fetch_value(
            "SELECT COUNT(*) FROM servicios WHERE nombre = %s", (nombre,), por_defecto=0
        )
    return int(total or 0) > 0


def crear(datos: dict) -> dict:
    if existe_nombre(datos["nombre"]):
        raise Conflicto("Ya existe un servicio con ese nombre")

    id_servicio = execute(
        """INSERT INTO servicios
               (nombre, categoria, descripcion, precio, duracion_minutos, icono,
                imagen_url, puntos_otorga, popular)
           VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)""",
        (
            datos["nombre"],
            datos.get("categoria") or "Cortes",
            datos.get("descripcion"),
            datos["precio"],
            datos["duracion_minutos"],
            datos.get("icono"),
            datos.get("imagen_url"),
            int(datos.get("puntos_otorga") or 0),
            1 if datos.get("popular") else 0,
        ),
    )
    return obtener(id_servicio)


def actualizar(id_servicio: int, datos: dict) -> dict:
    obtener(id_servicio)

    campos: list[str] = []
    params: list[Any] = []
    for campo in CAMPOS:
        if campo in datos and datos[campo] is not None:
            valor = datos[campo]
            if campo == "nombre" and existe_nombre(str(valor), excluir_id=id_servicio):
                raise Conflicto("Ya existe otro servicio con ese nombre")
            if campo in ("popular", "activo"):
                valor = 1 if valor else 0
            campos.append(f"{campo} = %s")
            params.append(valor)

    if not campos:
        raise DatosInvalidos("No se enviaron campos para actualizar")

    params.append(id_servicio)
    execute(f"UPDATE servicios SET {', '.join(campos)} WHERE id_servicio = %s", params)
    return obtener(id_servicio)


def cambiar_estado(id_servicio: int, activo: bool) -> dict:
    obtener(id_servicio)
    execute(
        "UPDATE servicios SET activo = %s WHERE id_servicio = %s",
        (1 if activo else 0, id_servicio),
    )
    return obtener(id_servicio)


def eliminar(id_servicio: int) -> dict:
    """Baja logica: los servicios con historial de citas no se borran."""
    return cambiar_estado(id_servicio, False)


def barberos_del_servicio(id_servicio: int) -> list[dict]:
    return fetch_all(
        """SELECT b.id_barbero, u.nombre, b.titulo, b.rating, b.disponible,
                  COALESCE(bs.precio_personalizado, s.precio) AS precio
           FROM barbero_servicio bs
           JOIN barberos b ON b.id_barbero = bs.id_barbero
           JOIN usuarios u ON u.id_usuario = b.id_usuario
           JOIN servicios s ON s.id_servicio = bs.id_servicio
           WHERE bs.id_servicio = %s AND bs.activo = 1 AND u.activo = 1
           ORDER BY b.rating DESC, u.nombre ASC""",
        (id_servicio,),
    )


# ----------------------------------------------------------------------
# Catalogo de cortes (galeria)
# ----------------------------------------------------------------------

def listar_catalogo_cortes(categoria: str | None = None, solo_activos: bool = True) -> list[dict]:
    condiciones: list[str] = []
    params: list[Any] = []
    if categoria:
        condiciones.append("categoria = %s")
        params.append(categoria)
    if solo_activos:
        condiciones.append("activo = 1")
    where = f"WHERE {' AND '.join(condiciones)}" if condiciones else ""
    return fetch_all(
        f"""SELECT id_corte, id_servicio, nombre, categoria, descripcion,
                   imagen_url, popular, activo
            FROM catalogo_cortes
            {where}
            ORDER BY popular DESC, nombre ASC""",
        params,
    )


__all__ = [
    "obtener",
    "obtener_activo",
    "listar",
    "listar_categorias",
    "crear",
    "actualizar",
    "cambiar_estado",
    "eliminar",
    "barberos_del_servicio",
    "listar_catalogo_cortes",
    "existe_nombre",
]
