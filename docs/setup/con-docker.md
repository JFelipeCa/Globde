<!--
  ¿Qué? Guía para iniciar GLOBDE con Docker Compose.
  ¿Para qué? Configura la aplicación para Codespaces y la base externa TiDB sin guardar secretos en Git.
  ¿Impacto? Permite que cada integrante use credenciales autorizadas y que Alembic migre el esquema correcto.
-->

# Guía de instalación con Docker — GLOBDE

## Requisitos

- Docker Desktop o Docker Engine con Docker Compose v2.
- Acceso de red a la instancia de desarrollo TiDB del equipo. Compose **no** inicia una base de datos.
- Credenciales válidas de TiDB y Gmail SMTP, disponibles localmente o como Codespaces Secrets.

## Configurar Codespaces Secrets

Cada integrante configura estos secretos una vez en **GitHub → Settings → Codespaces → Codespaces secrets** y limita su acceso al repositorio Globde:

| Nombre | Uso |
|---|---|
| `DB_HOST` | Host asignado por TiDB Cloud |
| `DB_USER` | Usuario de la base |
| `DB_PASSWORD` | Contraseña de la base |
| `SMTP_USER` | Cuenta Gmail del proyecto |
| `SMTP_PASSWORD` | Contraseña de aplicación de Gmail |

En Codespaces, `DB_PORT` usa `4000`, `DB_NAME` usa `globde` y `SMTP_FROM` usa `SMTP_USER` si no se definen; el correo queda habilitado por defecto. Se pueden definir esos valores en el entorno si la instancia o el remitente son distintos. Usa una contraseña de aplicación de Gmail, no la contraseña normal de la cuenta.

Los Codespaces Secrets personales solo están disponibles para la cuenta que los configura. Cada integrante debe añadirlos a su cuenta; un administrador puede centralizarlos como secretos de organización si corresponde. Después de agregarlos, crea o reconstruye el Codespace para que estén disponibles en su entorno.

## Configurar el entorno local

Para ejecutar fuera de Codespaces, copia la plantilla y completa los valores privados localmente:

```bash
cp backend/.env.example backend/.env
```

`scripts/start.sh` crea `backend/.env` si falta y genera un `JWT_SECRET` local. Las variables de entorno de Codespaces tienen prioridad sobre el archivo para los servicios de Docker. No compartas ni subas `backend/.env`, y nunca pongas credenciales en `docker-compose.yml` ni en `.env.example`.

> **Importante:** al iniciar el backend, el entrypoint ejecuta `alembic upgrade head` contra la instancia TiDB configurada. La instancia debe ser de desarrollo del equipo y el usuario necesita permisos para aplicar migraciones. Revisa y aprueba cada migración antes de integrarla: una migración puede cambiar datos o esquema compartidos. Alembic falla deliberadamente si no puede conectar o migrar; no se debe ocultar ese error ni arrancar la API con un esquema desactualizado.

## Iniciar la aplicación

```bash
bash scripts/start.sh
docker compose ps
```

El script valida las variables necesarias antes de construir o iniciar contenedores. Si falta una credencial, indica configurarla en Codespaces Secrets o `backend/.env`; no imprime sus valores.

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
