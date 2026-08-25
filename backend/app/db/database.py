import logging
from contextlib import contextmanager
from typing import Any, Iterator, Sequence

import mysql.connector
from mysql.connector import pooling
from mysql.connector.errors import Error as MySQLError

from app.core.config import settings
from app.db.serializers import serializar_fila, serializar_filas

logger = logging.getLogger("globde.db")

_pool: pooling.MySQLConnectionPool | None = None


def get_pool() -> pooling.MySQLConnectionPool:
    """Crea (una sola vez) el pool de conexiones."""
    global _pool
    if _pool is None:
        _pool = pooling.MySQLConnectionPool(
            pool_name="globde_pool",
            pool_size=max(1, min(settings.DB_POOL_SIZE, 32)),
            pool_reset_session=True,
            **settings.db_config,
        )
        logger.info(
            "Pool MySQL creado (%s@%s:%s/%s)",
            settings.DB_USER,
            settings.DB_HOST,
            settings.DB_PORT,
            settings.DB_NAME,
        )
    return _pool


def cerrar_pool() -> None:
    
    global _pool
    _pool = None


@contextmanager
def get_connection() -> Iterator[Any]:
   
    conexion = get_pool().get_connection()
    try:
        yield conexion
    finally:
        try:
            conexion.close()
        except MySQLError:  # pragma: no cover - defensivo
            pass


@contextmanager
def transaction() -> Iterator[Any]:
    

    with get_connection() as conexion:
        cursor = conexion.cursor(dictionary=True)
        try:
            yield cursor
            conexion.commit()
        except Exception:
            conexion.rollback()
            raise
        finally:
            cursor.close()


def fetch_all(sql: str, params: Sequence[Any] = ()) -> list[dict]:
    
    with get_connection() as conexion:
        cursor = conexion.cursor(dictionary=True)
        try:
            cursor.execute(sql, tuple(params))
            filas = cursor.fetchall()
        finally:
            cursor.close()
    return serializar_filas(filas)


def fetch_one(sql: str, params: Sequence[Any] = ()) -> dict | None:
    
    with get_connection() as conexion:
        cursor = conexion.cursor(dictionary=True)
        try:
            cursor.execute(sql, tuple(params))
            fila = cursor.fetchone()
            cursor.fetchall()  # drena resultados pendientes
        finally:
            cursor.close()
    return serializar_fila(fila) if fila else None


def fetch_value(sql: str, params: Sequence[Any] = (), por_defecto: Any = None) -> Any:
    
    fila = fetch_one(sql, params)
    if not fila:
        return por_defecto
    valores = list(fila.values())
    return valores[0] if valores else por_defecto


def execute(sql: str, params: Sequence[Any] = ()) -> int:
   
    with get_connection() as conexion:
        cursor = conexion.cursor()
        try:
            cursor.execute(sql, tuple(params))
            conexion.commit()
            return cursor.lastrowid
        except Exception:
            conexion.rollback()
            raise
        finally:
            cursor.close()


def execute_rowcount(sql: str, params: Sequence[Any] = ()) -> int:
    
    with get_connection() as conexion:
        cursor = conexion.cursor()
        try:
            cursor.execute(sql, tuple(params))
            conexion.commit()
            return cursor.rowcount
        except Exception:
            conexion.rollback()
            raise
        finally:
            cursor.close()


def ping() -> bool:
    
    try:
        with get_connection() as conexion:
            cursor = conexion.cursor()
            cursor.execute("SELECT 1")
            cursor.fetchall()
            cursor.close()
        return True
    except MySQLError as exc:
        logger.error("Fallo el ping a MySQL: %s", exc)
        return False


def version_mysql() -> str | None:
    try:
        return str(fetch_value("SELECT VERSION() AS v"))
    except MySQLError:
        return None


__all__ = [
    "MySQLError",
    "mysql",
    "get_pool",
    "cerrar_pool",
    "get_connection",
    "transaction",
    "fetch_all",
    "fetch_one",
    "fetch_value",
    "execute",
    "execute_rowcount",
    "ping",
    "version_mysql",
]
