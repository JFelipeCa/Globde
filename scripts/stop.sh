#!/usr/bin/env bash
#
# stop.sh — Detiene GLOBDE (opcionalmente borra la base de datos).
# Uso:  bash scripts/stop.sh           → detiene contenedores sin borrar datos
#       bash scripts/stop.sh --clean   → detiene Y elimina volúmenes (base desde cero)
set -euo pipefail

# Sube a la raíz del proyecto (donde vive docker-compose.yml).
PROYECTO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROYECTO"

MODE="${1:-stop}"

echo "→ Deteniendo contenedores de GLOBDE..."
docker compose down $([ "$MODE" = "--clean" ] && echo "-v")

if [ "$MODE" = "--clean" ]; then
  echo "✅ Contenedores detenidos y base de datos eliminada (volúmenes removidos)."
else
  echo "✅ Contenedores detenidos. (Usa stop.sh --clean para borrar la BD y empezar de cero.)"
fi