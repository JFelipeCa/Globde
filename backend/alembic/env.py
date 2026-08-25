"""Entorno de Alembic para GLOBDE.

La URL de conexion no se escribe en alembic.ini: se arma desde
app.core.config, que ya lee el .env. Asi las credenciales viven en un
unico lugar y 'alembic upgrade' usa exactamente la misma base que la API.
"""

import os
import sys
from logging.config import fileConfig
from pathlib import Path
from urllib.parse import quote_plus

from alembic import context
from sqlalchemy import engine_from_config, pool

# Permite importar 'app' cuando alembic corre desde backend/.
RAIZ_BACKEND = Path(__file__).resolve().parents[1]
if str(RAIZ_BACKEND) not in sys.path:
    sys.path.insert(0, str(RAIZ_BACKEND))

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)


def url_de_la_base() -> str:
    """Construye la URL desde la configuracion de la aplicacion."""
    from app.core.config import get_settings

    ajustes = get_settings()
    # quote_plus: una contrasena con '@' o '/' rompe la URL si no se escapa.
    usuario = quote_plus(ajustes.DB_USER)
    clave = quote_plus(ajustes.DB_PASSWORD)
    return (
        f"mysql+mysqlconnector://{usuario}:{clave}"
        f"@{ajustes.DB_HOST}:{ajustes.DB_PORT}/{ajustes.DB_NAME}"
    )


# Permite sobreescribir la URL sin tocar el .env, util en el CI:
#   ALEMBIC_DATABASE_URL=... alembic upgrade head
URL = os.getenv("ALEMBIC_DATABASE_URL") or url_de_la_base()

# El backend no usa ORM: las migraciones son explicitas y no hay metadata
# contra la cual comparar, asi que --autogenerate no aplica por ahora.
target_metadata = None


def run_migrations_offline() -> None:
    """Genera el SQL sin conectarse (alembic upgrade head --sql)."""
    context.configure(
        url=URL,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Aplica las migraciones contra la base configurada."""
    seccion = config.get_section(config.config_ini_section, {})
    seccion["sqlalchemy.url"] = URL

    conectable = engine_from_config(
        seccion,
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with conectable.connect() as conexion:
        context.configure(connection=conexion, target_metadata=target_metadata)
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
