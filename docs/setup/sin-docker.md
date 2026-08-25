# Guía de Instalación Manual (Sin Docker) — GLOBDE

<!--
  ¿Qué? Guía detallada para la instalación y ejecución manual de GLOBDE en sistemas operativos locales.
  ¿Para qué? Proveer una alternativa a equipos sin soporte o recursos para Docker.
  ¿Impacto? Garantiza la accesibilidad y ejecución del software en cualquier máquina de desarrollo.
-->

> **Requisitos Previos**:
> - Python 3.13+ instalado (`python --version`)
> - Node.js 22 LTS+ y pnpm 11+ (`node --version`, `pnpm --version`)
> - Servidor MySQL 8.0+ instalado y corriendo localmente (`mysql --version`)

---

## 📋 Pasos de Instalación Manual

### 1. Clonar el Repositorio
```bash
git clone https://github.com/JFelipeCa/Globde.git
cd Globde
```

---

### 2. Configurar y Poblar la Base de Datos MySQL

1. Abre tu cliente de base de datos preferido (MySQL Workbench, DBeaver, HeidiSQL o terminal).
2. Crea la base de datos **vacía**. El esquema no se carga a mano: lo generan
   las migraciones de Alembic en el paso 3.
```bash
mysql -u root -p -e "CREATE DATABASE globde CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
```

> El archivo `database/database.sql` se conserva como referencia del modelo,
> pero ya no es la fuente de verdad del esquema. Ver `backend/alembic/README.md`.

---

### 3. Configurar y Ejecutar el Backend (FastAPI)

```bash
cd backend

# Instalar uv si no lo tienes (no viene preinstalado en Codespaces):
#   curl -LsSf https://astral.sh/uv/install.sh | sh
#   source $HOME/.local/bin/env

# Crear entorno virtual e instalar dependencias (uv lo hace en un solo paso)
uv sync

# Configurar variables de entorno
cp .env.example .env
# Edita el archivo .env con tus credenciales locales de MySQL:
# DB_HOST=127.0.0.1
# DB_PORT=3306
# DB_USER=root
# DB_PASSWORD=tu_password_local
# DB_NAME=globde
#
# Y el secreto de JWT (obligatorio, viene vacío):
# JWT_SECRET=...  genera uno con:
#   python -c "import secrets; print(secrets.token_urlsafe(48))"

# Crear el esquema y los datos semilla con Alembic (20 tablas + 4 vistas)
uv run alembic upgrade head

# Si la base YA existía con el esquema viejo de database.sql, en vez del comando
# anterior márcala como migrada (si no, fallará con "1050 Table 'roles' already exists"):
#   uv run alembic stamp head

# Iniciar servidor FastAPI con recarga automática
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```
- API activa en: `http://localhost:8000`
- Swagger Docs: `http://localhost:8000/docs`

---

### 4. Configurar y Ejecutar el Frontend (React + TypeScript)

En una **segunda terminal**:
```bash
cd frontend

# Instalar dependencias de Node
pnpm install

# Iniciar servidor de desarrollo Vite
pnpm run dev
```
- Frontend activo en: `http://localhost:5173`

---

## 🧪 Ejecutar las pruebas

```bash
cd backend
uv run pytest                                        # 132 pruebas
uv run pytest --cov=app --cov-report=term-missing    # con cobertura (~70%)
```

> Las pruebas requieren la base MySQL accesible con las variables `DB_*` del `.env`.
> Sin ella, la mayoría quedarán en `skipped`.

---

## 🪟 Nota para Windows

Se recomienda usar **Git Bash** o **WSL2** para ejecutar los comandos de esta guía con
sintaxis bash uniforme. Necesitarás dos terminales abiertas: una para el backend
(`uv run uvicorn ...`) y otra para el frontend (`pnpm run dev`).

---

## 📎 Ver también

- [`docs/setup/con-docker.md`](con-docker.md) — instalación con Docker Compose (recomendada).
- [`database/README_DB.md`](../../database/README_DB.md) — gestión del esquema con Alembic.
