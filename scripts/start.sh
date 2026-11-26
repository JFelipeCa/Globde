#!/usr/bin/env bash
#
# start.sh — Levanta GLOBDE (backend + frontend conectado a TiDB Cloud) con Docker.
# Uso:  bash scripts/start.sh
# Ejecuta `bash scripts/start.sh` para iniciar la aplicación.
set -euo pipefail

# La carpeta del proyecto es un nivel ARRIBA de scripts/ (donde vive docker-compose.yml).
PROYECTO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROYECTO"

ENV_FILE="backend/.env"
ENV_EXAMPLE="backend/.env.example"

# 1) Crear backend/.env a partir del ejemplo si no existe.
if [ ! -f "$ENV_FILE" ]; then
  echo "→ Creando $ENV_FILE a partir de $ENV_EXAMPLE..."
  cp "$ENV_EXAMPLE" "$ENV_FILE"
fi

# 2) Generar secretos locales si faltan. Se conservan entre reinicios.
set_secret() {
  local key="$1"
  if ! python3 - "$ENV_FILE" "$key" <<'PY' >/dev/null 2>&1
from pathlib import Path
import sys

env_file, key = sys.argv[1:]
for line in Path(env_file).read_text().splitlines():
    name, separator, value = line.partition("=")
    if separator and name.strip() == key:
        sys.exit(0 if value.strip().strip("\"'").strip() else 1)
sys.exit(1)
PY
  then
    local val
    val="$(python3 -c "import secrets; print(secrets.token_urlsafe(48))" 2>/dev/null || head -c 48 /dev/urandom | base64 | tr -d '/+=' | head -c 48)"
    if ! grep -qE "^${key}=" "$ENV_FILE"; then
      echo "${key}=${val}" >> "$ENV_FILE"
    else
      sed -i.bak "s|^${key}=.*|${key}=${val}|" "$ENV_FILE" && rm -f "$ENV_FILE.bak"
    fi
    echo "→ Generado ${key}."
  fi
}

set_secret "JWT_SECRET"

# Codespaces usa TiDB Cloud y Gmail; los valores explícitos del entorno tienen prioridad.
if [ "${CODESPACES:-false}" = "true" ]; then
  export DB_PORT="${DB_PORT:-4000}"
  export DB_NAME="${DB_NAME:-globde}"
  export EMAIL_ENABLED="${EMAIL_ENABLED:-true}"
  export SMTP_HOST="${SMTP_HOST:-smtp.gmail.com}"
  export SMTP_PORT="${SMTP_PORT:-587}"
  export SMTP_FROM="${SMTP_FROM:-${SMTP_USER:-}}"
  export SMTP_STARTTLS="${SMTP_STARTTLS:-true}"
  export SMTP_TIMEOUT="${SMTP_TIMEOUT:-15}"
fi

# 3) Validar la configuración antes de modificar puertos o construir imágenes.
echo "→ Validando configuración de TiDB y SMTP..."
if ! docker compose --env-file "$ENV_FILE" config --quiet; then
  echo "❌ Configuración incompleta." >&2
  echo "   Define las variables requeridas en Codespaces Secrets o en backend/.env." >&2
  exit 1
fi

# 4) En Codespaces, el enlace del correo debe usar la URL reenviada del puerto.
if [ "${CODESPACES:-false}" = "true" ] && [ -n "${CODESPACE_NAME:-}" ]; then
  PORT_FORWARDING_DOMAIN="${GITHUB_CODESPACE_PORT_FORWARDING_DOMAIN:-app.github.dev}"
  CODESPACE_FRONTEND_URL="https://${CODESPACE_NAME}-5173.${PORT_FORWARDING_DOMAIN}"
  if grep -qE '^FRONTEND_URL=' "$ENV_FILE"; then
    sed -i.bak "s|^FRONTEND_URL=.*|FRONTEND_URL=${CODESPACE_FRONTEND_URL}|" "$ENV_FILE"
    rm -f "$ENV_FILE.bak"
  else
    printf 'FRONTEND_URL=%s\n' "$CODESPACE_FRONTEND_URL" >> "$ENV_FILE"
  fi
  echo "→ URL de recuperacion: ${CODESPACE_FRONTEND_URL}"

  if command -v gh >/dev/null 2>&1 && gh auth status >/dev/null 2>&1; then
    if gh codespace ports visibility 5173:public -c "$CODESPACE_NAME" >/dev/null 2>&1; then
      echo "→ Puerto 5173 configurado como publico."
    else
      echo "⚠️  No se pudo hacer publico el puerto 5173 automaticamente."
      echo "    En VS Code, abre Ports y cambia 5173 a Public."
    fi
  else
    echo "⚠️  GitHub CLI no esta autenticado; cambia 5173 a Public en VS Code > Ports."
  fi
fi

# 5) Construir las imagenes y levantar el stack.
echo "→ Construyendo imagenes..."
if ! docker compose --env-file backend/.env build; then
  # Un cache BuildKit local dañado puede impedir exportar capas. Reintentar
  # con un builder aislado evita borrar la cache compartida de Docker.
  echo "⚠️  Fallo la compilacion predeterminada; reintentando con un builder aislado..."
  BUILDER="globde-start-fallback"
  if ! docker buildx inspect "$BUILDER" >/dev/null 2>&1; then
    docker buildx create --name "$BUILDER" --driver docker-container --bootstrap
  fi
  docker compose --env-file backend/.env build --builder "$BUILDER"
fi

echo "→ Levantando contenedores..."
docker compose --env-file backend/.env up -d --no-build

# 6) Esperar a que la API esté lista.
echo "→ Esperando a que la API responda..."
for i in $(seq 1 60); do
  if curl -fsS --max-time 3 http://127.0.0.1:8000/api/health 2>/dev/null | grep -q '"estado":"ok"'; then
    echo "✅ GLOBDE listo:"
    echo "   Frontend: http://localhost:5173"
    echo "   API/docs: http://localhost:8000/docs"
    echo "   Health:   http://localhost:8000/api/health"
    exit 0
  fi
  sleep 2
done

echo "⚠️  Contenedores arrancados pero la API aún no responde 'ok'."
echo "    Revisa: docker compose logs backend   (o)  docker compose ps"
exit 1