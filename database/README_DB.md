# Base de Datos GLOBDE v2

> [!IMPORTANT]
> **El esquema ya no se crea ejecutando `database.sql`.** La fuente de verdad son las
> migraciones de Alembic en `backend/alembic/versions/`. Para levantar una base:
>
> ```bash
> cd backend && uv run alembic upgrade head     # o, con Docker: docker compose up -d --build
> ```
>
> `database/database.sql` se conserva **solo como referencia histórica del modelo** y no se
> ejecuta en ningún flujo (ni Docker, ni manual, ni CI). Los requisitos de este documento que
> citan `database.sql` como "archivo ejecutable" quedaron cubiertos por las migraciones; se
> anotan abajo con su equivalencia actual.

## Objetivo

Rediseñar la base de datos de GLOBDE para dejarla segura, moderna, ordenada y preparada para una versión funcional orientada a clientes reales.

Esta versión reemplaza el modelo inicial de pruebas por una estructura profesional enfocada en:

- Seguridad de usuarios.
- Recuperación real de contraseña.
- Gestión de clientes y barberos.
- Agenda de citas por rangos horarios.
- Facturación.
- Fidelización por puntos.
- Reseñas.
- Auditoría.
- Logs de correo.
- Trazabilidad de eventos importantes.

---

## Alcance

La modificación corresponde únicamente al modelo de datos. Su implementación vive hoy en las
migraciones de Alembic:

```text
backend/alembic/versions/dd2ee59368e5_esquema_inicial.py   # 20 tablas + 4 vistas
backend/alembic/versions/b2c3d4e5f6a7_*.py                 # datos semilla (head)
```

El archivo `database/database.sql` documenta el mismo modelo en SQL plano, como referencia.

No se modifican funcionalidades de backend ni frontend en esta rama.

Los cambios requeridos en backend se documentan en:

```text
database/docs/cambios_backend_requeridos.md
```

---

## RFs - Requerimientos Funcionales

### RF-DB-01 - Gestión de usuarios

La base de datos debe permitir registrar usuarios con roles diferenciados:

- Administrador.
- Barbero.
- Cliente.

### RF-DB-02 - Gestión de clientes

La base de datos debe permitir almacenar información específica de clientes, incluyendo saldo de puntos y nivel de fidelización.

### RF-DB-03 - Gestión de barberos

La base de datos debe permitir almacenar información profesional de barberos, como experiencia, biografía, disponibilidad y horarios.

### RF-DB-04 - Gestión de servicios

La base de datos debe permitir registrar servicios de barbería con precio, duración, categoría, imagen, icono, estado y puntos otorgados.

### RF-DB-05 - Gestión de citas

La base de datos debe permitir crear citas asociadas a cliente, barbero y servicio, manejando fecha, hora de inicio, hora de fin, estado y código de reserva.

### RF-DB-06 - Recuperación de contraseña

La base de datos debe permitir recuperación de contraseña mediante tokens seguros almacenados como hash, con expiración y uso único.

### RF-DB-07 - Registro de correos

La base de datos debe permitir registrar intentos de envío de correos para recuperación de contraseña, confirmación de citas y notificaciones.

### RF-DB-08 - Facturación

La base de datos debe permitir generar facturas y detalles asociados a citas completadas.

### RF-DB-09 - Fidelización

La base de datos debe permitir registrar movimientos de puntos por ganancias, canjes, ajustes y penalizaciones.

### RF-DB-10 - Reseñas

La base de datos debe permitir registrar reseñas de clientes sobre citas completadas.

### RF-DB-11 - Auditoría

La base de datos debe permitir registrar acciones importantes realizadas sobre entidades del sistema.

---

## RNFs - Requerimientos No Funcionales

### RNF-DB-01 - Seguridad

Las contraseñas no deben almacenarse en texto plano. Deben almacenarse como hash seguro generado por el backend.

### RNF-DB-02 - Privacidad

La base de datos no debe incluir datos personales reales en los datos semilla.

### RNF-DB-03 - Integridad referencial

Las tablas deben usar llaves primarias, llaves foráneas, restricciones e índices.

### RNF-DB-04 - Trazabilidad

Los eventos relevantes deben poder auditarse mediante tablas de logs.

### RNF-DB-05 - Mantenibilidad

El esquema debe estar ordenado, documentado y **versionado**. Se cumple mediante migraciones
Alembic incrementales y reversibles (`upgrade()` / `downgrade()`), en lugar de un único script
monolítico.

### RNF-DB-06 - Compatibilidad Docker

La base de datos debe poder inicializarse mediante Docker sin pasos manuales. Se cumple con
`docker-entrypoint.sh` del servicio `backend`, que espera a MySQL y ejecuta:

```bash
alembic upgrade head
```

MySQL solo crea la base vacía (`MYSQL_DATABASE`); el esquema y las semillas los aplica Alembic.

### RNF-DB-07 - Codificación

La base de datos debe usar `utf8mb4` para soportar correctamente caracteres especiales, tildes, eñes y símbolos.

---

## HUs - Historias de Usuario

### HU-DB-01 - Recuperar contraseña

Como cliente, quiero solicitar recuperación de contraseña para recibir un enlace seguro en mi correo y poder crear una nueva contraseña.

### HU-DB-02 - Reservar cita

Como cliente, quiero reservar una cita con un barbero y servicio específico para recibir atención en un horario disponible.

### HU-DB-03 - Consultar historial

Como cliente, quiero consultar mis citas, facturas, puntos y reseñas para conocer mi historial en la barbería.

### HU-DB-04 - Gestionar agenda

Como barbero, quiero consultar mis citas asignadas para organizar mi jornada laboral.

### HU-DB-05 - Administrar servicios

Como administrador, quiero gestionar servicios, precios y duración para mantener actualizado el catálogo.

### HU-DB-06 - Auditar eventos

Como administrador, quiero revisar eventos importantes del sistema para tener trazabilidad de cambios y acciones.

---

## Restricciones

- No se deben almacenar contraseñas en texto plano.
- No se deben almacenar tokens de recuperación en texto plano.
- No se deben incluir correos personales reales en datos semilla.
- No se deben incluir teléfonos personales reales en datos semilla.
- No se deben modificar dependencias del proyecto.
- No se deben usar versiones de paquetes con comodines.
- La entrega debe realizarse mediante GitHub y Docker.
- La rama `main` debe reservarse exclusivamente para producción.
- Los desarrollos deben integrarse según el flujo acordado por el equipo.
- Las ramas de desarrollo deben seguir el formato `feature/<nombre-feature>`.
- La base de datos debe inicializarse desde Docker sin depender de configuraciones manuales adicionales.
- El esquema debe aplicarse mediante migraciones de Alembic (`alembic upgrade head`); **no** mediante
  la ejecución manual de un `.sql`.
- Todo cambio de esquema debe entrar como una migración nueva, con su `downgrade()` correspondiente.

---

## Estructura de archivos

```text
database/
├── .gitignore
├── database.sql                       # referencia histórica del modelo (NO se ejecuta)
├── README_DB.md
└── docs/
    └── cambios_backend_requeridos.md

backend/
├── alembic.ini                        # config de Alembic (sin sqlalchemy.url: la arma env.py)
├── docker-entrypoint.sh               # espera a MySQL y corre 'alembic upgrade head'
└── alembic/
    ├── env.py                         # construye la URL desde get_settings()
    └── versions/
        ├── dd2ee59368e5_esquema_inicial.py    # 20 tablas + 4 vistas
        └── b2c3d4e5f6a7_*.py                  # datos semilla (head)
```

---

## Decisiones de diseño

### 1. Rediseño completo de la base de datos

Se define una versión v2 de la base de datos para reemplazar el modelo inicial de pruebas por una estructura más cercana a producción.

### 2. Contraseñas seguras

La columna de contraseña se define como `contrasena_hash`, indicando que nunca se deben guardar contraseñas en texto plano.

### 3. Recuperación de contraseña segura

La recuperación se maneja mediante la tabla `password_reset_tokens`, guardando únicamente el hash del token, fecha de expiración y fecha de uso.

### 4. Eliminación de tokens de prueba

La tabla anterior `tokens_recuperacion` se elimina porque no debe existir almacenamiento de tokens en texto plano.

### 5. Separación de usuarios, clientes y barberos

Los datos generales se almacenan en `usuarios`, mientras que los datos específicos se almacenan en `clientes` y `barberos`.

### 6. Agenda por rangos horarios

Las citas manejan `hora_inicio` y `hora_fin` para permitir validación real de solapamientos.

### 7. Trazabilidad

Se incluyen tablas como `audit_logs`, `email_logs` y `login_attempts` para registrar eventos relevantes.

### 8. Datos semilla seguros

Los datos de prueba usan correos ficticios y no incluyen información personal real.

---

## Ejecución con Docker

En un arranque normal no hay que hacer nada: el entrypoint del backend aplica las migraciones
pendientes automáticamente.

```bash
docker compose up -d --build
```

Para reconstruir la base **desde cero**:

```bash
docker compose down -v      # ⚠️ elimina el volumen mysql_data: se pierden TODOS los datos locales
docker compose up -d --build
```

El parámetro `-v` borra el volumen de MySQL; al volver a levantar, Alembic recrea las 20 tablas,
las 4 vistas y los datos semilla.

### Comandos útiles de Alembic

```bash
docker compose exec backend alembic current                    # revisión actual
docker compose exec backend alembic history --verbose          # historial de migraciones
docker compose exec backend alembic upgrade head               # aplicar pendientes
docker compose exec backend alembic downgrade -1               # revertir la última
docker compose exec backend alembic revision -m "mi cambio"    # crear una nueva
```

### Si ya tenías la base creada con `database.sql`

`alembic upgrade head` fallará con `1050 Table 'roles' already exists`. Marca la base como
migrada sin reaplicar el esquema:

```bash
docker compose exec backend alembic stamp head
```

> [!WARNING]
> MySQL no revierte DDL dentro de una transacción. Si una migración falla a mitad, la base queda
> en un estado intermedio: recréala con `down -v` antes de reintentar.

---

## Pruebas básicas

Entrar al contenedor de MySQL:

```bash
docker exec -it globde_mysql mysql -uroot -p
```

O desde el host, recordando que MySQL se publica en el puerto **3307**:

```bash
mysql -h 127.0.0.1 -P 3307 -u root -p globde
```

Seleccionar la base:

```sql
USE globde;
SHOW TABLES;                      -- 20 tablas + 4 vistas + alembic_version
SELECT * FROM alembic_version;    -- debe mostrar la revisión head
SELECT COUNT(*) FROM usuarios;
SELECT COUNT(*) FROM servicios;
SELECT COUNT(*) FROM password_reset_tokens;
```

Validar que no existan tokens de recuperación previos:

```sql
SELECT COUNT(*) FROM password_reset_tokens;
```

Validar usuarios demo:

```sql
SELECT id_usuario, nombre, correo, id_rol, activo
FROM usuarios;
```

Validar servicios activos:

```sql
SELECT nombre, categoria, precio, duracion_minutos, activo
FROM servicios
WHERE activo = 1;
```

---

## Git y trazabilidad

La rama de trabajo sigue el formato:

```text
feature/db-v2-profesional
```

Commits sugeridos:

```text
docs(db): documentar alcance de base de datos v2
feat(db): crear esquema profesional de base de datos v2
fix(db): corregir restricciones de base de datos v2
docs(db): documentar cambios requeridos para backend
```

---

## Nota para backend

Esta versión modifica nombres de columnas y relaciones importantes. El backend debe ajustarse según el documento:

```text
database/docs/cambios_backend_requeridos.md
```

La DB v2 puede romper consultas actuales del backend si este no se adapta. Esto es esperado porque el modelo fue rediseñado para ser más seguro, normalizado y mantenible.
