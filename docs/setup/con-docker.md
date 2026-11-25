<!--
  ¿Qué? Guía para iniciar GLOBDE con Docker Compose.
  ¿Para qué? Configura el backend y frontend de forma reproducible y segura.
  ¿Impacto? Evita conexiones accidentales a una base de datos compartida.
-->

# Guía de instalación con Docker — GLOBDE

## Requisitos

- Docker Desktop o Docker Engine con Docker Compose v2.
- Una base MySQL compatible accesible desde el backend. Compose **no** inicia una base de datos.

## Configurar el backend

Desde la raíz del repositorio:

```bash
cp backend/.env.example backend/.env
```

Edita `backend/.env` y configura una base **local o aislada para pruebas**:

```env
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=globde_dev
DB_PASSWORD=
DB_NAME=globde_dev
JWT_SECRET=
EMAIL_ENABLED=false
```

Completa los valores de conexión según tu entorno. `DB_HOST` debe ser accesible desde
el contenedor del backend; para una base en la nube usa el hostname y puerto de esa
instancia. El ejemplo no contiene credenciales ni apunta a la base compartida.

Genera un `JWT_SECRET` de al menos 32 caracteres:

```bash
python -c "import secrets; print(secrets.token_urlsafe(48))"
```

No compartas ni subas `backend/.env`. No pegues credenciales en `docker-compose.yml`.

> **Importante:** el entrypoint del backend aplica `alembic upgrade head` al iniciar.
> No conectes Compose a producción o a una base compartida para probar cambios:
> una migración puede alterar sus datos. Usa una instancia aislada y revisa cada
> migración antes de aplicarla.

## Iniciar la aplicación

```bash
docker compose up -d --build
docker compose ps
```

Compose levanta el backend y el frontend. La base de datos se administra aparte.

| Servicio | URL |
|---|---|
| Frontend | <http://localhost:5173> |
| API | <http://localhost:8000> |
| Swagger | <http://localhost:8000/docs> |

## Logs y migraciones

```bash
docker compose logs -f backend
docker compose logs -f frontend
docker compose exec backend alembic current
```

Para crear una migración, hazlo solo como parte de un cambio de esquema y revisa
`upgrade()` y `downgrade()` antes de aplicarla:

```bash
docker compose exec backend alembic revision -m "descripcion del cambio"
```

No uses `docker compose down -v` como método de reinicio de la base: Compose no
gestiona la base de datos y ese comando no revierte cambios ya aplicados a una
instancia externa.

## Ejecutar pruebas

Las pruebas de integración requieren una base de datos aislada con el esquema
aplicado. No las ejecutes contra datos compartidos:

```bash
docker compose exec backend uv run pytest
```

Para más información consulta [la guía del backend](../../backend/README.md) y
[la documentación de migraciones](../../backend/alembic/README.md).
