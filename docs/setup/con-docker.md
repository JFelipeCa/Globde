<!--
  ¿Qué? Guía para iniciar GLOBDE con Docker Compose.
  ¿Para qué? Configura el backend y frontend de forma reproducible y segura.
  ¿Impacto? Evita conexiones accidentales a una base de datos compartida.
-->

# Guía de instalación con Docker — GLOBDE

## Requisitos

- Docker Desktop o Docker Engine con Docker Compose v2. Compose inicia MySQL
  junto con el backend y el frontend.

## Configurar el backend

Desde la raíz del repositorio:

```bash
cp backend/.env.example backend/.env
```

Edita `backend/.env` y revisa la configuración para una base **local o aislada
para pruebas**:

```env
DB_USER=globde_dev
DB_PASSWORD=
DB_NAME=globde_dev
JWT_SECRET=
EMAIL_ENABLED=false
```

En Compose, el backend se conecta al servicio MySQL interno (`mysql`); no es
necesario instalar MySQL en el equipo. `scripts/start.sh` genera valores
seguros para `DB_PASSWORD` y `JWT_SECRET` si están vacíos y los guarda en este
archivo local, que no se sube al repositorio.

No compartas ni subas `backend/.env`. No pegues credenciales en `docker-compose.yml`.

> **Importante:** el entrypoint del backend aplica `alembic upgrade head` al iniciar.
> No conectes Compose a producción o a una base compartida para probar cambios:
> una migración puede alterar sus datos. Usa una instancia aislada y revisa cada
> migración antes de aplicarla.

## Iniciar la aplicación

```bash
bash scripts/start.sh
```

Compose espera a que MySQL esté saludable, aplica las migraciones y después
inicia la API y el frontend. MySQL conserva sus datos en un volumen.

| Servicio | URL |
|---|---|
| Frontend | <http://localhost:5173> |
| API | <http://localhost:8000> |
| Swagger | <http://localhost:8000/docs> |

## Logs y migraciones

```bash
docker compose --env-file backend/.env logs -f backend
docker compose --env-file backend/.env logs -f frontend
docker compose --env-file backend/.env exec backend alembic current
```

Para crear una migración, hazlo solo como parte de un cambio de esquema y revisa
`upgrade()` y `downgrade()` antes de aplicarla:

```bash
docker compose --env-file backend/.env exec backend alembic revision -m "descripcion del cambio"
```

No uses `docker compose down -v` para reiniciar: elimina el volumen local de
MySQL y borra sus datos.

## Ejecutar pruebas

Las pruebas de integración requieren una base de datos aislada con el esquema
aplicado. No las ejecutes contra datos compartidos:

```bash
docker compose --env-file backend/.env exec backend uv run pytest
```

Para más información consulta [la guía del backend](../../backend/README.md) y
[la documentación de migraciones](../../backend/alembic/README.md).
