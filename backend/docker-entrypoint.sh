#!/bin/sh
# Punto de entrada del contenedor del backend.
#
# Aplica las migraciones pendientes antes de arrancar la API. Si la base
# esta vacia, esto crea el esquema completo; si ya esta al dia, Alembic no
# hace nada y el arranque sigue de largo.
set -e

echo "[entrypoint] Aplicando migraciones de base de datos..."
alembic upgrade head
echo "[entrypoint] Base de datos al dia."

echo "[entrypoint] Arrancando la API..."
exec "$@"
