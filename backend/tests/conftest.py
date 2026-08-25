"""Configuracion compartida de pytest para el backend GLOBDE."""

import os
import sys
from pathlib import Path

import pytest

# Permite ejecutar `pytest` desde backend/ o desde la raiz del repo.
RAIZ_BACKEND = Path(__file__).resolve().parents[1]
if str(RAIZ_BACKEND) not in sys.path:
    sys.path.insert(0, str(RAIZ_BACKEND))

# Fuerza entorno de pruebas antes de importar la configuracion.
os.environ.setdefault("APP_ENV", "testing")


@pytest.fixture(scope="session")
def settings():
    from app.core.config import get_settings

    return get_settings()


@pytest.fixture(scope="session")
def hay_base_de_datos() -> bool:
    """True si hay una base de datos alcanzable con la config actual."""
    try:
        from app.db.database import ping

        return bool(ping())
    except Exception:  # noqa: BLE001 - cualquier fallo significa "sin DB"
        return False


@pytest.fixture(scope="session")
def cliente_api(hay_base_de_datos):
    """Cliente HTTP contra la app FastAPI. Requiere base de datos."""
    if not hay_base_de_datos:
        pytest.skip("Se requiere una base de datos MySQL/MariaDB accesible")

    from fastapi.testclient import TestClient

    from app.main import app

    with TestClient(app) as cliente:
        yield cliente


CORREOS_SEMILLA = ("admin@globde.test", "barbero1@globde.test", "cliente1@example.com")


@pytest.fixture(scope="session", autouse=True)
def _limpiar_bloqueos(hay_base_de_datos):
    """Evita que corridas previas dejen bloqueados por rate limit a los usuarios semilla."""
    if not hay_base_de_datos:
        return
    from app.db.database import execute_rowcount

    marcadores = ", ".join(["%s"] * len(CORREOS_SEMILLA))
    execute_rowcount(
        f"DELETE FROM login_attempts WHERE correo_intentado IN ({marcadores})",
        CORREOS_SEMILLA,
    )


def _token(cliente, correo: str, contrasena: str = "Globde2025*") -> str | None:
    respuesta = cliente.post(
        "/api/auth/login", json={"correo": correo, "contrasena": contrasena}
    )
    if respuesta.status_code != 200:
        return None
    return respuesta.json().get("access_token")


@pytest.fixture(scope="session")
def token_admin(cliente_api):
    token = _token(cliente_api, "admin@globde.test")
    if not token:
        pytest.skip("No se pudo autenticar al usuario administrador semilla")
    return token


@pytest.fixture(scope="session")
def token_barbero(cliente_api):
    token = _token(cliente_api, "barbero1@globde.test")
    if not token:
        pytest.skip("No se pudo autenticar al usuario barbero semilla")
    return token


@pytest.fixture(scope="session")
def token_cliente(cliente_api):
    token = _token(cliente_api, "cliente1@example.com")
    if not token:
        pytest.skip("No se pudo autenticar al usuario cliente semilla")
    return token


@pytest.fixture
def auth():
    """Construye la cabecera Authorization a partir de un token."""

    def _auth(token: str) -> dict:
        return {"Authorization": f"Bearer {token}"}

    return _auth
