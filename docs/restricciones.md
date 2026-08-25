# Restricciones del Proyecto — Globde

## RT — Restricciones Técnicas
- **RT-01:** Backend en Python 3.13+ (FastAPI), dependencias gestionadas con `uv`.
- **RT-02:** Frontend en React 19 + TypeScript estricto sobre Vite 7, dependencias con `pnpm`.
- **RT-03:** Base de datos MySQL 8.0+ (`mysql-connector-python`), esquema versionado con Alembic.
- **RT-04:** Containerización con Docker Compose.

## RH — Restricciones de Hardware
- **RH-01:** Entorno local requiere 8 GB RAM.
- **RH-02:** Conexión a internet para SMTP y Docker.

## RO — Restricciones Organizacionales
- **RO-01:** Proyecto formato SENA / Metodología Scrum.
- **RO-02:** Documentación estricta en repositorio.

## RS — Restricciones de Seguridad
- **RS-01:** Contraseñas encriptadas (Bcrypt).
- **RS-02:** No credenciales hardcodeadas (uso de .env).

## RD — Restricciones de Diseño
- **RD-01:** Paleta corporativa estricta (Negro / Blanco / Dorado) y Tailwind CSS v4.
- **RD-02:** Responsive obligatorio.

---

> [!NOTE]
> Este archivo es un resumen. La versión detallada, con justificación de cada
> restricción, está en [`docs/requisitos/restricciones.md`](requisitos/restricciones.md).
