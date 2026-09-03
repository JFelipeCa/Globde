#!/usr/bin/env bash
#
# start.sh — Levanta GLOBDE (backend + frontend + MySQL) con Docker.
# Uso:  bash scripts/start.sh
# El instructor solo ejecuta `bash scripts/start.sh` y el sistema queda arriba.
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

# 2) Generar/asegurar secretos obligatorios (sin default en producción).
#    Si están vacíos, se generan automáticamente para que arranque sin fricción.
set_secret() {
  local key="$1"
  if ! grep -qE "^${key}=.+" "$ENV_FILE"; then
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
set_secret "DB_PASSWORD"

# 3) En Codespaces, el enlace del correo debe usar la URL reenviada del puerto.
#    La visibilidad publica requiere una sesion autenticada de GitHub CLI.
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

# 4) Levantar el stack.
echo "→ Levantando contenedores (docker compose up -d --build)..."
docker compose --env-file backend/.env up -d --build

# 5) Esperar a que la base de datos y la API estén listas.
echo "→ Esperando a que la API responda..."
for i in $(seq 1 60); do
  if curl -s http://localhost:8000/api/health 2>/dev/null | grep -q '"estado":"ok"'; then
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