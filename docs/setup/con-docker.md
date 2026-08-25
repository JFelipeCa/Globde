# Guía de Instalación y Despliegue con Docker — GLOBDE

<!--
  ¿Qué? Guía paso a paso para levantar el entorno completo de GLOBDE utilizando Docker Compose.
  ¿Para qué? Proveer un método de despliegue estandarizado, reproducible y sin conflictos de librerías locales.
  ¿Impacto? Reduce el tiempo de configuración del entorno de horas a pocos minutos en cualquier sistema operativo.
-->

> **Requisitos**: Docker Desktop 24.0+ y Docker Compose v2.20+ instalados y en ejecución.

---

## 🚀 Pasos de Instalación Rápida

### 1. Clonar el repositorio
```bash
git clone https://github.com/JFelipeCa/Globde.git
cd Globde
```

### 2. Configurar variables de entorno del Backend
```bash
cd backend
cp .env.example .env
```

Edita `backend/.env`. Hay **dos variables obligatorias** que vienen vacías a propósito
(el proyecto no trae contraseñas por defecto):

```env
# --- Base de datos ---
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=          # ← OBLIGATORIA. Sin ella docker compose falla al arrancar.
DB_NAME=globde

# --- Autenticación JWT ---
JWT_SECRET=           # ← OBLIGATORIA. Genera una con el comando de abajo.

# --- App ---
APP_ENV=development
DEBUG=true

# --- Correo (SMTP) ---
EMAIL_ENABLED=false   # déjala en false si no vas a configurar un SMTP real

# --- Frontend / CORS ---
FRONTEND_URL=http://localhost:5173
```

Genera un `JWT_SECRET` real:

```bash
python -c "import secrets; print(secrets.token_urlsafe(48))"
```

> [!NOTE]
> `DB_HOST=127.0.0.1` y `DB_PORT=3306` son los valores para ejecutar el backend **fuera** de Docker.
> Cuando levantas con Docker Compose, el propio `docker-compose.yml` los sobreescribe a
> `DB_HOST=mysql` y `DB_PORT=3306` (red interna de Docker), así que no tienes que cambiarlos.

> [!IMPORTANT]
> `DB_PASSWORD` también la lee `docker-compose.yml` desde el entorno del shell. Si al ejecutar
> `docker compose up` ves el error *"define DB_PASSWORD en tu archivo .env"*, exporta la variable
> o crea un `.env` en la **raíz** del proyecto con la misma `DB_PASSWORD`.

### 3. Levantar los Contenedores
Regresa a la raíz del proyecto y ejecuta:
```bash
docker compose up -d --build
```
Verifica el estado:
```bash
docker compose ps
```
Deberías ver tres servicios en `Up` / `healthy`: **`mysql`** (MySQL 8.0), **`backend`** (FastAPI)
y **`frontend`** (React + Vite).

### 4. Esquema de base de datos (automático)

**No tienes que ejecutar ningún `.sql`.** El contenedor `backend` corre `docker-entrypoint.sh`,
que espera a que MySQL esté listo y ejecuta:

```bash
alembic upgrade head
```

Eso crea las **20 tablas**, las **4 vistas** y los **datos semilla** (roles, servicios, etc.).
Puedes confirmarlo en los logs:

```bash
docker compose logs backend | grep -i alembic
```

### 5. Acceder a la aplicación

El frontend ya viene levantado por Compose en **`http://localhost:5173`**.
Si prefieres correrlo fuera de Docker:

```bash
cd frontend
pnpm install
pnpm run dev
```

---

## 🔍 Puertos y URLs de Servicios

| Servicio | Puerto Host | URL |
| :--- | :---: | :--- |
| **Frontend React** | `5173` | `http://localhost:5173` |
| **Backend FastAPI** | `8000` | `http://localhost:8000` |
| **Swagger UI (Docs)**| `8000` | `http://localhost:8000/docs` |
| **Base de Datos MySQL**| `3307` | `localhost:3307` (`user: root`) |

> [!WARNING]
> MySQL se publica en el puerto **`3307`** del host (mapeo `3307:3306`), no en el 3306.
> Esto evita chocar con una instalación local de MySQL. Para conectarte con un cliente
> externo (Workbench, DBeaver, CLI) usa el **3307**:
>
> ```bash
> mysql -h 127.0.0.1 -P 3307 -u root -p globde
> ```
>
> Dentro de la red de Docker, en cambio, los contenedores se hablan por el puerto interno
> `3306` con el host `mysql`.

---

## 🛠️ Comandos de Mantenimiento y Troubleshooting

### Ver logs en tiempo real
```bash
docker compose logs -f backend
docker compose logs -f mysql
```

### Reiniciar contenedores
```bash
docker compose restart
```

### Aplicar cambios de dependencias o de código del backend
```bash
docker compose up -d --build
```

### Trabajar con migraciones de Alembic
```bash
# Ver en qué revisión está la base
docker compose exec backend alembic current

# Aplicar migraciones pendientes (el entrypoint ya lo hace al arrancar)
docker compose exec backend alembic upgrade head

# Crear una migración nueva (luego edita upgrade() y downgrade() a mano)
docker compose exec backend alembic revision -m "descripcion del cambio"
```

### Ejecutar las pruebas
```bash
docker compose exec backend uv run pytest
```

### Reset completo de la base de datos

Si la base quedó a medias (una migración falló, o venías de un esquema viejo creado con
`database.sql`), la forma limpia de arreglarla es **borrar el volumen**:

```bash
docker compose down -v      # ⚠️ ESTO BORRA TODOS LOS DATOS
docker compose up -d --build
```

> [!WARNING]
> El flag `-v` elimina el volumen `mysql_data`. Es irreversible: se pierden usuarios, citas
> y facturas de tu entorno local. Sin `-v`, el volumen sobrevive y la base rota sigue rota.

### Adoptar una base preexistente sin borrarla

Si ya tenías la base `globde` creada con el antiguo `database/database.sql` y no quieres
perder los datos, marca la base como "ya migrada" en lugar de reaplicar el esquema:

```bash
docker compose exec backend alembic stamp head
```

Sin esto, `alembic upgrade head` falla con `1050 Table 'roles' already exists`.

---

## 📎 Ver también

- [`docs/setup/sin-docker.md`](sin-docker.md) — instalación manual con `uv` y `pnpm`.
- [`database/README_DB.md`](../../database/README_DB.md) — cómo se gestiona el esquema.
- [`docs/referencia-tecnica/database-schema.md`](../referencia-tecnica/database-schema.md) — diccionario de datos.
