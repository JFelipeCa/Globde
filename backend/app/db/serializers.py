from datetime import date, datetime, timedelta
from decimal import Decimal
from typing import Any


def _serializar_valor(valor: Any) -> Any:
    if valor is None:
        return None
    if isinstance(valor, bool):
        return valor
    if isinstance(valor, Decimal):
        # Los precios se manejan como float en la API
        return float(valor)
    if isinstance(valor, datetime):
        return valor.strftime("%Y-%m-%d %H:%M:%S")
    if isinstance(valor, date):
        return valor.strftime("%Y-%m-%d")
    if isinstance(valor, timedelta):
        # MySQL devuelve las columnas TIME como timedelta
        total = int(valor.total_seconds())
        signo = "-" if total < 0 else ""
        total = abs(total)
        horas, resto = divmod(total, 3600)
        minutos, segundos = divmod(resto, 60)
        return f"{signo}{horas:02d}:{minutos:02d}:{segundos:02d}"
    if isinstance(valor, (bytes, bytearray)):
        return valor.decode("utf-8", errors="replace")
    return valor


def serializar_fila(fila: dict | None) -> dict | None:
    if fila is None:
        return None
    return {clave: _serializar_valor(valor) for clave, valor in fila.items()}


def serializar_filas(filas: list[dict]) -> list[dict]:
    return [serializar_fila(f) for f in filas if f is not None]  


def hhmm(valor: Any) -> str | None:
   
    serializado = _serializar_valor(valor)
    if not isinstance(serializado, str):
        return serializado
    partes = serializado.split(":")
    if len(partes) >= 2:
        return f"{partes[0]}:{partes[1]}"
    return serializado


__all__ = ["serializar_fila", "serializar_filas", "hhmm"]
