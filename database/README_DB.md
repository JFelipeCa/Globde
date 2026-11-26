<!--
  ¿Qué? Explica cómo se administra el esquema y los datos de GLOBDE.
  ¿Para qué? Orientar la creación y evolución segura de bases de datos.
  ¿Impacto? Evita usar scripts históricos o marcar como migrado un esquema incompleto.
-->

# Base de datos GLOBDE

## Fuente de verdad

El esquema vigente se crea y versiona exclusivamente con las migraciones de
Alembic en [`backend/alembic/versions/`](../backend/alembic/versions/). La
revisión actual es `h8b9c0d1e2f3` e incluye 26 tablas y 4 vistas.

[`database.sql`](database.sql) es una referencia histórica; no se ejecuta para
crear ni actualizar bases. El detalle del esquema está en la
[referencia técnica](../docs/referencia-tecnica/database-schema.md), y el
procedimiento de migraciones en la [guía de Alembic](../backend/alembic/README.md).
Los requisitos vigentes del producto están organizados en
[`docs/requisitos.md`](../docs/requisitos.md), no en propuestas antiguas de esquema.

## Crear o actualizar una base local

1. Crea una base MySQL vacía con codificación `utf8mb4`.
2. Configura las variables `DB_*` y los secretos locales en `backend/.env`.
   No incluyas ese archivo en Git.
3. Desde `backend/`, instala dependencias y aplica las migraciones:

   ```bash
   uv sync
   uv run alembic upgrade head
   uv run alembic current
   ```

`upgrade head` ejecuta la cadena de migraciones, incluidas las semillas
existentes. Antes de usar la cadena actual en un entorno con datos reales,
define una estrategia de semillas que no exponga usuarios de prueba.

## Evolución del esquema

Desde `backend/`, crea una migración nueva para cada cambio de esquema:

```bash
uv run alembic revision -m "descripcion del cambio"
```

Completa `upgrade()` y `downgrade()` y valida ambas direcciones con las
pruebas de CI antes de integrar el cambio. No uses `alembic stamp head` para
evitar errores en una base preexistente: `stamp` solo cambia el registro de
revisión y no aplica ni verifica el esquema. Haz copia de seguridad y revisa
una estrategia de migración explícita para bases existentes.

MySQL no revierte DDL de forma transaccional. En una base local desechable,
puede ser necesario recrearla si una migración falla parcialmente. No borres
volúmenes ni bases que contengan información que debas conservar.

## Consultas de verificación

```sql
SELECT version_num FROM alembic_version;
SHOW FULL TABLES;
SELECT COUNT(*) FROM usuarios;
SELECT COUNT(*) FROM servicios;
```

No consultes ni compartas datos personales o credenciales de una instancia real
para validar el esquema.
