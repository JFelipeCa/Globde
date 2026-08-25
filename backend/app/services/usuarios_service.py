"""Gestion de usuarios: consulta, alta interna, actualizacion y estado."""

from typing import Any

from app.core.config import settings
from app.core.exceptions import Conflicto, DatosInvalidos, NoEncontrado
from app.core.security import hash_password, validar_fortaleza_password, verificar_password
from app.db.database import execute, fetch_all, fetch_one, fetch_value, transaction

SQL_USUARIO = """
    SELECT u.id_usuario, u.id_rol, r.nombre AS rol, u.nombre, u.correo, u.telefono,
           u.avatar_url, u.activo, u.email_verificado_at, u.ultimo_login_at, u.creado_en,
           c.id_cliente, c.puntos_saldo, c.nivel_fidelizacion,
           b.id_barbero
    FROM usuarios u
    JOIN roles r ON r.id_rol = u.id_rol
    LEFT JOIN clientes c ON c.id_usuario = u.id_usuario
    LEFT JOIN barberos b ON b.id_usuario = u.id_usuario
"""


# ----------------------------------------------------------------------
# Consultas
# ----------------------------------------------------------------------

def obtener(id_usuario: int) -> dict:
    fila = fetch_one(f"{SQL_USUARIO} WHERE u.id_usuario = %s", (id_usuario,))
    if not fila:
        raise NoEncontrado("El usuario no existe")
    return fila


def obtener_por_correo(correo: str) -> dict | None:
    return fetch_one(f"{SQL_USUARIO} WHERE u.correo = %s", (correo.strip().lower(),))


def existe_correo(correo: str, excluir_id: int | None = None) -> bool:
    if excluir_id:
        total = fetch_value(
            "SELECT COUNT(*) FROM usuarios WHERE correo = %s AND id_usuario <> %s",
            (correo.strip().lower(), excluir_id),
            por_defecto=0,
        )
    else:
        total = fetch_value(
            "SELECT COUNT(*) FROM usuarios WHERE correo = %s",
            (correo.strip().lower(),),
            por_defecto=0,
        )
    return int(total or 0) > 0


def listar(
    id_rol: int | None = None,
    activo: bool | None = None,
    buscar: str | None = None,
    limite: int = 50,
    offset: int = 0,
) -> list[dict]:
    condiciones: list[str] = []
    params: list[Any] = []
    if id_rol is not None:
        condiciones.append("u.id_rol = %s")
        params.append(id_rol)
    if activo is not None:
        condiciones.append("u.activo = %s")
        params.append(1 if activo else 0)
    if buscar:
        condiciones.append("(u.nombre LIKE %s OR u.correo LIKE %s OR u.telefono LIKE %s)")
        patron = f"%{buscar}%"
        params.extend([patron, patron, patron])

    where = f"WHERE {' AND '.join(condiciones)}" if condiciones else ""
    params.extend([limite, offset])
    return fetch_all(
        f"{SQL_USUARIO} {where} ORDER BY u.creado_en DESC, u.id_usuario DESC LIMIT %s OFFSET %s",
        params,
    )


def contar(
    id_rol: int | None = None, activo: bool | None = None, buscar: str | None = None
) -> int:
    condiciones: list[str] = []
    params: list[Any] = []
    if id_rol is not None:
        condiciones.append("id_rol = %s")
        params.append(id_rol)
    if activo is not None:
        condiciones.append("activo = %s")
        params.append(1 if activo else 0)
    if buscar:
        condiciones.append("(nombre LIKE %s OR correo LIKE %s OR telefono LIKE %s)")
        patron = f"%{buscar}%"
        params.extend([patron, patron, patron])
    where = f"WHERE {' AND '.join(condiciones)}" if condiciones else ""
    return int(fetch_value(f"SELECT COUNT(*) FROM usuarios {where}", params, por_defecto=0) or 0)


def listar_roles() -> list[dict]:
    return fetch_all(
        "SELECT id_rol, nombre, descripcion, activo FROM roles ORDER BY id_rol"
    )


# ----------------------------------------------------------------------
# Alta de usuarios internos (admin / barbero)
# ----------------------------------------------------------------------

def crear_usuario_interno(datos: dict) -> dict:
    """Crea un administrador o barbero. Si es barbero, crea tambien su perfil."""
    correo = datos["correo"].strip().lower()
    if existe_correo(correo):
        raise Conflicto("Ya existe un usuario registrado con ese correo")

    id_rol = int(datos["id_rol"])
    if id_rol not in (settings.ROL_ADMINISTRADOR, settings.ROL_BARBERO):
        raise DatosInvalidos("Solo se permite crear administradores o barberos")

    with transaction() as cursor:
        cursor.execute(
            """INSERT INTO usuarios (id_rol, nombre, correo, telefono, contrasena_hash)
               VALUES (%s, %s, %s, %s, %s)""",
            (
                id_rol,
                datos["nombre"],
                correo,
                datos.get("telefono"),
                hash_password(datos["contrasena"]),
            ),
        )
        id_usuario = cursor.lastrowid

        if id_rol == settings.ROL_BARBERO:
            cursor.execute(
                """INSERT INTO barberos
                       (id_usuario, titulo, experiencia_anios, bio, foto_url, color)
                   VALUES (%s, %s, %s, %s, %s, %s)""",
                (
                    id_usuario,
                    datos.get("titulo") or "Barbero",
                    int(datos.get("experiencia_anios") or 0),
                    datos.get("bio"),
                    datos.get("foto_url"),
                    datos.get("color"),
                ),
            )

    return obtener(id_usuario)


# ----------------------------------------------------------------------
# Actualizacion
# ----------------------------------------------------------------------

CAMPOS_PERFIL = ("nombre", "correo", "telefono", "avatar_url")


def actualizar(id_usuario: int, datos: dict) -> dict:
    """Actualiza los datos basicos del usuario (perfil)."""
    obtener(id_usuario)  # valida existencia

    campos: list[str] = []
    params: list[Any] = []
    for campo in CAMPOS_PERFIL:
        if campo in datos and datos[campo] is not None:
            valor = datos[campo]
            if campo == "correo":
                valor = str(valor).strip().lower()
                if existe_correo(valor, excluir_id=id_usuario):
                    raise Conflicto("Ese correo ya esta en uso por otro usuario")
            campos.append(f"{campo} = %s")
            params.append(valor)

    if not campos:
        raise DatosInvalidos("No se enviaron campos para actualizar")

    params.append(id_usuario)
    execute(f"UPDATE usuarios SET {', '.join(campos)} WHERE id_usuario = %s", params)
    return obtener(id_usuario)


def cambiar_estado(id_usuario: int, activo: bool) -> dict:
    obtener(id_usuario)
    execute(
        "UPDATE usuarios SET activo = %s WHERE id_usuario = %s",
        (1 if activo else 0, id_usuario),
    )
    return obtener(id_usuario)


def cambiar_password(id_usuario: int, actual: str, nueva: str) -> None:
    fila = fetch_one(
        "SELECT contrasena_hash FROM usuarios WHERE id_usuario = %s", (id_usuario,)
    )
    if not fila:
        raise NoEncontrado("El usuario no existe")
    if not verificar_password(actual, fila["contrasena_hash"]):
        raise DatosInvalidos("La contrasena actual no es correcta")

    errores = validar_fortaleza_password(nueva)
    if errores:
        raise DatosInvalidos("; ".join(errores))
    if verificar_password(nueva, fila["contrasena_hash"]):
        raise DatosInvalidos("La nueva contrasena debe ser distinta de la actual")

    execute(
        "UPDATE usuarios SET contrasena_hash = %s WHERE id_usuario = %s",
        (hash_password(nueva), id_usuario),
    )


def establecer_password(id_usuario: int, nueva: str) -> None:
    """Fija una contrasena sin pedir la anterior (reset o alta administrativa)."""
    execute(
        "UPDATE usuarios SET contrasena_hash = %s WHERE id_usuario = %s",
        (hash_password(nueva), id_usuario),
    )


def eliminar(id_usuario: int) -> None:
    """Baja logica: nunca se borran usuarios con historial de citas."""
    cambiar_estado(id_usuario, False)


__all__ = [
    "SQL_USUARIO",
    "obtener",
    "obtener_por_correo",
    "existe_correo",
    "listar",
    "contar",
    "listar_roles",
    "crear_usuario_interno",
    "actualizar",
    "cambiar_estado",
    "cambiar_password",
    "establecer_password",
    "eliminar",
]
