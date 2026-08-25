# GLOBDE API — Backend v2

API REST de la barbería GLOBDE. El esquema de base de datos lo gestionan las
migraciones de Alembic (`backend/alembic/`); el contrato está descrito en
`database/docs/cambios_backend_requeridos.md`.

- **Framework:** FastAPI (Python 3.13)
- **Base de datos:** MySQL 8 / MariaDB 11 con `mysql-connector-python` y SQL puro
- **Seguridad:** JWT (access + refresh) · bcrypt · autorización por roles
- **Prefijo de todas las rutas:** `/api`

---

## 1. Puesta en marcha

### Con Docker (recomendado)

```bash
cp backend/.env.example backend/.env   # y completa los valores
docker compose up --build
```

Levanta MySQL y la API. El contenedor del backend ejecuta
`alembic upgrade head` al arrancar, así que el esquema y los datos semilla se
crean solos la primera vez.
La API queda en <http://localhost:8000> y la documentación interactiva en
<http://localhost:8000/docs>.

### Sin Docker

```bash
# Si no tienes uv:  curl -LsSf https://astral.sh/uv/install.sh | sh
#                   source $HOME/.local/bin/env
cd backend
uv sync                                 # crea .venv e instala dependencias
cp .env.example .env                    # DB_HOST=127.0.0.1
uv run alembic upgrade head             # crea el esquema y los datos semilla
uv run uvicorn app.main:app --reload
```

> La base de datos debe existir antes del primer `upgrade`:
> `mysql -u root -p -e "CREATE DATABASE globde CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"`
> Detalles de las migraciones en [`alembic/README.md`](alembic/README.md).

> El `.env` **nunca** se sube al repositorio. Genera el secreto JWT con:
> `python -c "import secrets; print(secrets.token_urlsafe(48))"`

---

## 2. Estructura

```
backend/
├── app/
│   ├── main.py            # Creación de la app, CORS, routers, ciclo de vida
│   ├── core/              # config, security (JWT/bcrypt), exceptions, dependencies
│   ├── db/                # pool de conexiones, helpers SQL, serializadores
│   ├── schemas/           # modelos Pydantic de entrada y salida
│   ├── services/          # reglas de negocio + acceso a datos (SQL puro)
│   ├── routers/           # 13 routers, uno por dominio
│   └── utils/             # paginación
├── alembic/               # migraciones de base de datos (ver alembic/README.md)
│   └── versions/
├── alembic.ini
├── scripts/
│   └── limpiar_datos_prueba.py
├── tests/                 # pytest (unitarias + integración)
├── Dockerfile
├── pytest.ini
├── pyproject.toml
└── uv.lock
```

Cada dominio sigue el mismo camino: **router** (HTTP, permisos) →
**service** (reglas de negocio, SQL) → **db** (pool y helpers).

---

## 3. Endpoints

113 operaciones repartidas así:

| Módulo | Operaciones | Prefijo |
|---|---|---|
| Barberos (perfil, horarios, bloqueos, disponibilidad) | 17 | `/api/barberos` |
| Citas (agenda, estados, slots) | 11 | `/api/citas` |
| Reportes y dashboards | 10 | `/api/reportes` |
| Autenticación y recuperación de contraseña | 9 | `/api/auth` |
| Usuarios | 9 | `/api/usuarios` |
| Servicios y catálogo de cortes | 9 | `/api/servicios` |
| Reseñas | 9 | `/api/resenas` |
| Clientes | 8 | `/api/clientes` |
| Facturación | 7 | `/api/facturas` |
| Notificaciones | 7 | `/api/notificaciones` |
| Puntos y fidelización | 6 | `/api/puntos` |
| Penalidades | 6 | `/api/penalidades` |
| Auditoría (`audit_logs`, `login_attempts`, `email_logs`) | 3 | `/api/auditoria` |
| Sistema (`/`, `/api/health`) | 2 | — |
| Compatibilidad v1 (opcional, ver §10) | 4 | `/api/datos`, `/api/login`, `POST /api/clientes`, `POST /api/citas` |

El detalle completo, con esquemas de petición y respuesta, está en
<http://localhost:8000/docs>.

---

## 4. Autenticación

```bash
curl -X POST http://localhost:8000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"correo":"admin@globde.test","contrasena":"Globde2025*"}'
```

Devuelve `access_token` (60 min), `refresh_token` (7 días) y los datos del
usuario. Las rutas protegidas esperan la cabecera:

```
Authorization: Bearer <access_token>
```

**Roles:** `1` administrador, `2` barbero, `3` cliente. Las dependencias
`SoloAdmin`, `SoloBarbero`, `SoloCliente` y `AdminOBarbero` aplican el control
en cada ruta; los clientes solo ven sus propios datos.

**Protección de fuerza bruta:** tras `LOGIN_MAX_INTENTOS` (5) fallos en
`LOGIN_VENTANA_MINUTOS` (15) el correo queda bloqueado y la API responde `429`.

---

## 5. Reglas de negocio

- **Solapamiento de citas:** una cita se rechaza (`409`) si el barbero o el
  cliente ya tienen otra que se cruce en el rango horario, ignorando las
  `cancelada` y `no_asistio`. También se validan la jornada del barbero
  (`horarios_barbero`), los bloqueos de agenda y que la fecha sea futura.
- **Estados de la cita:** `pendiente → confirmada → en_atencion → completada`,
  con `cancelada` y `no_asistio` como salidas. Cualquier transición fuera de la
  máquina de estados devuelve `409`.
- **Puntos:** se otorgan al completar la cita y se devuelven si se cancela.
  Niveles: Bronce, Plata (300), Oro (700), Diamante (1500).
- **Facturas:** solo sobre citas `completada` o `en_atencion`, una por cita.
  El IVA se calcula sobre (subtotal − descuento). Anular una factura pagada la
  deja en `reembolsada`.
- **Reseñas:** solo el cliente dueño de una cita completada puede reseñarla, y
  el rating del barbero se recalcula en la misma transacción.
- **Penalidades:** `no_asistencia` y `cancelacion_tardia`, con descuento de
  puntos opcional.

---

## 6. Respuestas

Los listados administrativos usan un sobre uniforme:

```json
{ "items": [], "total": 0, "pagina": 1, "por_pagina": 20, "total_paginas": 1 }
```

Los catálogos públicos (`/api/servicios`, `/api/barberos`) devuelven listas planas.

Errores:

| Código | Situación |
|---|---|
| `400` | Datos inválidos según las reglas de negocio |
| `401` | Sin token, token inválido o credenciales incorrectas |
| `403` | El rol no tiene permiso sobre el recurso |
| `404` | El recurso no existe |
| `409` | Conflicto: solapamiento, duplicado, transición inválida |
| `422` | Error de validación del cuerpo o de los parámetros |
| `429` | Demasiados intentos de inicio de sesión |
| `503` | La base de datos no responde |

Los `422` incluyen el detalle por campo:

```json
{ "detail": "Datos de entrada invalidos",
  "errores": [{ "campo": "correo", "mensaje": "value is not a valid email address" }] }
```

---

## 7. Pruebas

```bash
cd backend
python -m pytest              # 132 pruebas
python -m pytest -m "not integracion"   # solo unitarias, sin base de datos
```

- `tests/test_unitarias.py` — hashing, JWT, tokens de recuperación, niveles de
  fidelización, paginación y configuración. No necesitan base de datos.
- `tests/test_api.py` — salud, autenticación, permisos por rol, catálogos,
  paginación, reportes y manejo de errores.
- `tests/test_reglas_negocio.py` — flujo completo de una cita, solapamiento,
  cancelación, puntos, ciclo de facturación, reseñas y auditoría.
- `tests/test_legacy.py` — rutas de compatibilidad v1 y comprobación de que el
  contrato v2 no se ve afectado en las rutas compartidas.

Las pruebas de integración crean sus propios datos con correos `qa-*`. Para
borrarlos:

```bash
python scripts/limpiar_datos_prueba.py        # simulación
python scripts/limpiar_datos_prueba.py --si   # borrado real
```

---

## 8. Trazabilidad

Toda acción sensible queda registrada:

- `audit_logs` — quién hizo qué, sobre qué entidad, desde qué IP.
- `login_attempts` — intentos de inicio de sesión, exitosos y fallidos.
- `email_logs` — correos enviados o simulados (con `EMAIL_ENABLED=false` no se
  envía nada, pero sí se registra).

Consultables por un administrador en `/api/auditoria`.

---

## 9. Notas de seguridad

- Las contraseñas se guardan con bcrypt (12 rondas); nunca en texto plano.
- De los tokens de recuperación solo se persiste el hash SHA-256.
- Las credenciales SMTP y de base de datos viven en variables de entorno.
- Todas las consultas usan parámetros (`%s`), nunca concatenación de cadenas.
- En producción, ajusta `CORS_ORIGINS` al dominio real del frontend y pon
  `APP_ENV=production` y `DEBUG=false`.

---

## 10. Compatibilidad con el frontend v1

El frontend del proyecto fue escrito contra la primera versión de la API. Para
no modificarlo, `app/routers/legacy.py` traduce sus cuatro llamadas al
contrato v2:

| Ruta v1 | Qué hace |
|---|---|
| `GET /api/datos` | Reúne servicios, barberos, clientes y citas en una sola respuesta, con las claves de la v1 (`id_usuario`, `hora`). Sin autenticación. |
| `POST /api/login` | Valida como `/auth/login` pero aplana la respuesta al perfil que leía la v1. Incluye `access_token` para una migración futura. |
| `POST /api/clientes` | Sin token: registro público. Con token de admin o barbero: delega en el alta v2 sin cambiar su comportamiento. |
| `POST /api/citas` | Acepta `id_usuario` + `hora` y los traduce a `id_barbero` + `hora_inicio`. Si el payload ya es v2 y hay sesión, delega en la ruta v2. |

Las reglas de negocio se aplican igual por ambas vías: barbero activo y
disponible, que preste el servicio, jornada, bloqueos, solapamiento (`409`) y
la restricción de que un cliente solo agenda para sí mismo (`403`).

El router se monta antes que los de dominio, porque FastAPI resuelve las rutas
en orden de registro y necesita atender `POST /api/clientes` y `POST /api/citas`
antes que sus equivalentes v2.

Detalle al leer `/docs`: en esas dos rutas compartidas la documentación muestra
el esquema **v2**, porque el generador de OpenAPI se queda con la última
definición registrada para una misma ruta. En ejecución responde el handler de
compatibilidad, que acepta los dos formatos. Las rutas exclusivas de la v1
(`/api/datos` y `/api/login`) sí aparecen bajo la etiqueta
*Compatibilidad v1*.

Es un puente temporal. Se apaga con:

```env
ENABLE_LEGACY_ROUTES=false
```

Conviene apagarlo en producción: `/datos` responde sin autenticación, tal como
lo hacía la v1. Cuando el frontend migre a los endpoints v2, este archivo se
puede borrar entero.
