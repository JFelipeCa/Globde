<!--
  ¿Qué? Documenta cómo aplicar y mantener las migraciones de base de datos.
  ¿Para qué? Mantener el esquema versionado, reproducible y verificable.
  ¿Impacto? Evita diferencias entre las bases locales, CI y despliegues.
-->

# Migraciones de base de datos (Alembic)

El esquema de GLOBDE se crea y evoluciona **con Alembic**, no ejecutando
`database/database.sql` a mano.

## Por que

Antes, cualquier cambio de esquema obligaba a editar `database.sql` y a
avisar al resto del equipo para que borrara su base y la volviera a cargar.
No habia forma de saber que version tenia cada quien, ni de deshacer un
cambio. Con Alembic cada cambio es un archivo versionado en git, se aplica
con un comando y se puede revertir.

## Uso diario

Todos los comandos se ejecutan desde `backend/`.

```bash
# Poner la base al dia (crea el esquema si esta vacia)
uv run alembic upgrade head

# Ver en que version esta la base actual
uv run alembic current

# Ver el historial de migraciones
uv run alembic history
```

La base de datos **debe existir** antes del primer `upgrade`; Alembic crea
las tablas, no el esquema que las contiene:

```sql
CREATE DATABASE globde CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

Con Docker Compose esto ya lo hace la variable `MYSQL_DATABASE`.

## Configuracion

`alembic.ini` **no contiene la contrasena**. La URL de conexion se arma en
`alembic/env.py` a partir de `app/core/config.py`, que lee el `.env`. Es
decir: si la API se conecta, Alembic tambien.

Para apuntar a otra base sin tocar el `.env`:

```bash
ALEMBIC_DATABASE_URL="mysql+mysqlconnector://usuario:clave@host:3306/basededatos" \
  uv run alembic upgrade head
```

## Migraciones actuales

| Revision       | Contenido                                              |
|----------------|--------------------------------------------------------|
| `dd2ee59368e5` | Esquema inicial: 20 tablas, 27 claves foraneas, 4 vistas |
| `b2c3d4e5f6a7` | Datos semilla: 16 INSERT (roles, usuarios de prueba, servicios, etc.) |
| `c3d4e5f6a7b8` | Rediseño de datos de cliente |
| `d4e5f6a7b8c9` | Catálogo de servicios y cortes |
| `e4f5a6b7c8d9` | Horarios, cierres, extras, recordatorios y lista de espera |
| `e5f6a7b8c9d0` | Imágenes de perfil de barberos |
| `f6a7b8c9d0e1` | Ajustes a perfiles sin fotos predeterminadas |
| `g7a8b9c0d1e2` | Merge de migraciones de agenda y catálogo |
| `h8b9c0d1e2f3` | Verificación de correo para flujos de invitados (revisión actual) |

La revisión inicial tiene 20 tablas y 4 vistas; las migraciones posteriores
añaden tablas y columnas. El esquema actual contiene 26 tablas y 4 vistas.
La revisión de semillas forma parte del historial anterior a las migraciones
actuales; no existe un objetivo independiente de Alembic que omita esa revisión.
Antes de desplegar en un entorno con datos reales, define una estrategia de
semillas que no exponga usuarios de prueba.

```bash
uv run alembic upgrade dd2ee59368e5
```

Ese comando solo crea el esquema inicial y no es suficiente para ejecutar la
versión actual de la API. Para desarrollo y CI se aplica `upgrade head`; los
tests de integración requieren los datos semilla. La suite recopila 160 casos,
93 de ellos dependen de MySQL y esos datos.

## Crear una migracion nueva

El backend **no usa ORM**: los services trabajan con SQL directo mediante
`mysql-connector`. Por eso `--autogenerate` no sirve (no hay modelos que
comparar) y las migraciones se escriben a mano:

```bash
uv run alembic revision -m "descripcion corta del cambio"
```

Se edita el archivo generado en `alembic/versions/` rellenando `upgrade()`
y `downgrade()`. Se pueden usar las funciones de `op` (`op.add_column`,
`op.create_index`, ...) o SQL directo con `op.execute("...")`.

**Escribir siempre el `downgrade()`.** El CI lo comprueba: aplica todas las
migraciones, las revierte y las vuelve a aplicar. Si el downgrade deja algo
sin borrar, el build falla.

## Detalles de MySQL que conviene saber

- **MySQL no revierte DDL.** Si una migracion falla a la mitad, lo ya
  aplicado se queda. Al reintentar aparece `(1050, Table already exists)`.
  En desarrollo la salida es borrar la base y volver a empezar; en
  produccion, revisar a mano. Por eso conviene que cada migracion sea
  pequena.
- **Las vistas se crean con `op.execute`**, no con `op.create_table`.
- **El `downgrade` del esquema inicial usa `SET FOREIGN_KEY_CHECKS = 0`**
  para no depender del orden de borrado. Sin eso MySQL rechaza soltar
  indices que sostienen una clave foranea.

## Y `database/database.sql`?

Se conserva como referencia historica y documentacion del modelo, pero
**ya no es la fuente de verdad**: quedara desactualizado en cuanto haya una
migracion nueva. Para levantar una base, usar Alembic.
