# Especificación de Endpoints REST API — GLOBDE

<!--
  ¿Qué? Catálogo de la API REST de GLOBDE, generado a partir de los routers reales
        en `backend/app/routers/`.
  ¿Para qué? Dar al frontend y a los evaluadores el mapa completo de rutas, método,
             nivel de autorización y propósito de cada endpoint.
  ¿Impacto? Evita integraciones a ciegas y documenta qué parte de la API ya está
            construida frente a lo que el frontend consume hoy.
-->

> **Base URL local**: `http://localhost:8000`
> **Prefijo de la API**: todos los endpoints cuelgan de `/api` (salvo `GET /`).
> **Formato**: `application/json`
> **Swagger UI**: `http://localhost:8000/docs` · **ReDoc**: `http://localhost:8000/redoc`

> [!NOTE]
> La fuente de verdad es el esquema OpenAPI que FastAPI genera en caliente
> (`/openapi.json`). Este documento es un resumen navegable; si alguna vez
> discrepan, manda el código.

---

## 📊 Resumen

| Concepto | Valor |
| :--- | :--- |
| Routers de dominio | 14 (`backend/app/routers/`) |
| Endpoints en routers | 115 |
| Endpoints de sistema | 2 (`GET /` y `GET /api/health`) |
| **Total** | **117** |
| Autenticación | JWT Bearer (`Authorization: Bearer <access_token>`) |

### Endpoints de sistema

| Método | Ruta | Auth | Descripción |
| :--- | :--- | :--- | :--- |
| `GET` | `/` | Pública | Bienvenida: nombre, versión y enlaces a `/docs` y `/api/health` |
| `GET` | `/api/health` | Pública | Estado del servicio y de la conexión a MySQL (motor, BD, entorno) |

---

## 🔐 Autenticación y roles

El login devuelve un `access_token` (JWT) que debe viajar en cada petición privada:

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Niveles de autorización usados en las tablas:

| Nivel | Significado |
| :--- | :--- |
| **Pública** | No requiere token |
| **Privada** | Requiere token válido de cualquier rol |
| **Privada (Admin)** | Solo rol administrador |
| **Privada (Barbero)** | Solo rol barbero |
| **Privada (Cliente)** | Solo rol cliente |
| **Privada (Admin/Barbero)** | Administrador o barbero |

Varios endpoints además **acotan el alcance por rol dentro del propio handler**:
por ejemplo `GET /api/citas` devuelve solo las citas del cliente autenticado si
quien pregunta es un cliente, y solo la agenda propia si es un barbero
(ver `_filtros_segun_rol` en `routers/citas.py`).

---

## 📄 Paginación

Los listados devuelven un sobre `RespuestaPaginada` (`schemas/comunes.py`):

```json
{
  "items": [],
  "total": 0,
  "pagina": 1,
  "por_pagina": 20,
  "total_paginas": 0
}
```

Parámetros de consulta: `pagina` (≥ 1, por defecto `1`) y `por_pagina`
(entre 1 y 100, por defecto `20`).

---

## ⚠️ Errores

Todas las excepciones de dominio (`app/core/exceptions.py`) responden con el
mismo cuerpo:

```json
{ "detail": "Mensaje legible del error", "error": "NoEncontrado" }
```

| Excepción | HTTP | Cuándo |
| :--- | :---: | :--- |
| `DatosInvalidos` | 400 | El payload es sintácticamente válido pero rompe una regla de negocio |
| `NoAutorizado` | 401 | Token ausente, expirado o credenciales incorrectas |
| `Prohibido` | 403 | Autenticado pero sin permisos para ese recurso |
| `NoEncontrado` | 404 | El recurso no existe |
| `Conflicto` | 409 | Choca con el estado actual (p. ej. solapamiento de cita) |
| `DemasiadosIntentos` | 429 | Límite de reintentos superado |
| *(validación Pydantic)* | 422 | El cuerpo no cumple el esquema |
| *(MySQL caído)* | 503 | Sin conexión a la base de datos |
| *(no controlado)* | 500 | Error inesperado, se registra en el log `globde.errors` |

---

## 🗂️ Catálogo por módulo
### `Auditoria` — `backend/app/routers/auditoria.py` (3 endpoints)

| Método | Ruta | Auth | Descripción |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/auditoria` | Privada (Admin) | Bitacora de acciones |
| `GET` | `/api/auditoria/login` | Privada (Admin) | Intentos de inicio de sesion |
| `GET` | `/api/auditoria/emails` | Privada (Admin) | Bitacora de correos enviados |

### `Autenticacion` — `backend/app/routers/auth.py` (9 endpoints)

| Método | Ruta | Auth | Descripción |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/login` | Pública | Iniciar sesion |
| `POST` | `/api/auth/registro` | Pública | Registro publico de clientes |
| `POST` | `/api/auth/refresh` | Pública | Renovar el access token |
| `GET` | `/api/auth/me` | Privada | Perfil del usuario autenticado |
| `POST` | `/api/auth/logout` | Privada | Cerrar sesion |
| `POST` | `/api/auth/password/forgot` | Pública | Solicitar enlace de recuperacion |
| `POST` | `/api/auth/password/validar-token` | Pública | Verificar que un token de recuperacion sigue vigente |
| `POST` | `/api/auth/password/reset` | Pública | Restablecer la contrasena con el token |
| `POST` | `/api/auth/password/cambiar` | Privada | Cambiar la contrasena estando autenticado |

### `Barberos` — `backend/app/routers/barberos.py` (17 endpoints)

| Método | Ruta | Auth | Descripción |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/barberos` | Pública | Listar barberos |
| `GET` | `/api/barberos/ranking` | Pública | Ranking de barberos |
| `GET` | `/api/barberos/{id_barbero}` | Pública | Perfil completo |
| `GET` | `/api/barberos/{id_barbero}/servicios` | Pública | Servicios que presta |
| `GET` | `/api/barberos/{id_barbero}/disponibilidad` | Pública | Slots libres de una fecha |
| `GET` | `/api/barberos/{id_barbero}/disponibilidad-semana` | Pública | Resumen de disponibilidad por dia |
| `GET` | `/api/barberos/{id_barbero}/agenda` | Privada | Agenda de una fecha |
| `PUT` | `/api/barberos/{id_barbero}` | Privada | Actualizar perfil de barbero |
| `PATCH` | `/api/barberos/{id_barbero}/disponibilidad` | Privada | Marcar disponible o no |
| `PUT` | `/api/barberos/{id_barbero}/servicios` | Privada (Admin) | Asignar servicios al barbero |
| `GET` | `/api/barberos/{id_barbero}/horarios` | Pública | Jornada semanal |
| `PUT` | `/api/barberos/{id_barbero}/horarios` | Privada | Reemplazar la jornada semanal completa |
| `POST` | `/api/barberos/{id_barbero}/horarios` | Privada | Agregar una franja horaria |
| `DELETE` | `/api/barberos/{id_barbero}/horarios/{id_horario}` | Privada | Eliminar una franja horaria |
| `GET` | `/api/barberos/{id_barbero}/bloqueos` | Privada | Listar bloqueos |
| `POST` | `/api/barberos/{id_barbero}/bloqueos` | Privada | Bloquear un rango de la agenda |
| `DELETE` | `/api/barberos/{id_barbero}/bloqueos/{id_bloqueo}` | Privada | Liberar un bloqueo |

### `Citas` — `backend/app/routers/citas.py` (11 endpoints)

| Método | Ruta | Auth | Descripción |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/citas` | Privada | Listar citas |
| `GET` | `/api/citas/mias` | Privada | Mis proximas citas |
| `GET` | `/api/citas/disponibilidad` | Pública | Slots libres de un barbero |
| `GET` | `/api/citas/codigo/{codigo}` | Privada | Buscar por codigo de reserva |
| `GET` | `/api/citas/{id_cita}` | Privada | Detalle de una cita |
| `POST` | `/api/citas` | Privada | Agendar una cita |
| `PUT` | `/api/citas/{id_cita}` | Privada | Reprogramar o editar una cita |
| `PATCH` | `/api/citas/{id_cita}/estado` | Privada | Cambiar el estado |
| `POST` | `/api/citas/{id_cita}/cancelar` | Privada | Cancelar una cita |
| `POST` | `/api/citas/{id_cita}/confirmar` | Privada (Admin/Barbero) | Confirmar una cita |
| `POST` | `/api/citas/{id_cita}/completar` | Privada (Admin/Barbero) | Marcar como completada |

### `Clientes` — `backend/app/routers/clientes.py` (8 endpoints)

| Método | Ruta | Auth | Descripción |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/clientes` | Privada (Admin/Barbero) | Listar clientes |
| `GET` | `/api/clientes/me` | Privada | Mi ficha de cliente |
| `POST` | `/api/clientes` | Privada (Admin/Barbero) | Registrar un cliente (personal) |
| `GET` | `/api/clientes/{id_cliente}` | Privada | Detalle de un cliente |
| `GET` | `/api/clientes/{id_cliente}/citas` | Privada | Historial de citas |
| `PUT` | `/api/clientes/{id_cliente}` | Privada | Actualizar un cliente |
| `PATCH` | `/api/clientes/{id_cliente}/estado` | Privada (Admin) | Activar o desactivar |
| `DELETE` | `/api/clientes/{id_cliente}` | Privada (Admin) | Baja logica |

### `Compatibilidad v1` — `backend/app/routers/legacy.py` (4 endpoints)

| Método | Ruta | Auth | Descripción |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/datos` | Pública | Paquete de datos iniciales (compatibilidad v1) |
| `POST` | `/api/login` | Pública | Inicio de sesion (compatibilidad v1) |
| `POST` | `/api/clientes` | Pública | Alta de cliente (v1 publica / v2 con token) |
| `POST` | `/api/citas` | Pública | Crear cita (acepta payload v1 y v2) |

### `Facturacion` — `backend/app/routers/facturas.py` (7 endpoints)

| Método | Ruta | Auth | Descripción |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/facturas` | Privada | Listar facturas |
| `GET` | `/api/facturas/cita/{id_cita}` | Privada | Factura de una cita |
| `GET` | `/api/facturas/{id_factura}` | Privada | Detalle de una factura |
| `GET` | `/api/facturas/{id_factura}/detalle` | Privada | Lineas de detalle |
| `POST` | `/api/facturas` | Privada (Admin/Barbero) | Emitir una factura |
| `PATCH` | `/api/facturas/{id_factura}/pago` | Privada (Admin/Barbero) | Registrar el pago |
| `POST` | `/api/facturas/{id_factura}/anular` | Privada (Admin) | Anular una factura |

### `Notificaciones` — `backend/app/routers/notificaciones.py` (7 endpoints)

| Método | Ruta | Auth | Descripción |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/notificaciones` | Privada | Mis notificaciones |
| `GET` | `/api/notificaciones/no-leidas` | Privada | Conteo de no leidas |
| `PATCH` | `/api/notificaciones/{id_notificacion}/leida` | Privada | Marcar como leida |
| `PATCH` | `/api/notificaciones/leidas` | Privada | Marcar todas como leidas |
| `DELETE` | `/api/notificaciones/{id_notificacion}` | Privada | Eliminar una notificacion |
| `POST` | `/api/notificaciones` | Privada (Admin) | Enviar una notificacion a un usuario |
| `POST` | `/api/notificaciones/masiva` | Privada (Admin) | Notificacion masiva por rol |

### `Penalidades` — `backend/app/routers/penalidades.py` (6 endpoints)

| Método | Ruta | Auth | Descripción |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/penalidades` | Privada | Listar penalidades |
| `GET` | `/api/penalidades/{id_penalidad}` | Privada | Detalle de una penalidad |
| `POST` | `/api/penalidades` | Privada (Admin/Barbero) | Registrar una penalidad |
| `POST` | `/api/penalidades/{id_penalidad}/aplicar` | Privada (Admin) | Aplicar penalidad |
| `POST` | `/api/penalidades/{id_penalidad}/anular` | Privada (Admin) | Anular penalidad |
| `DELETE` | `/api/penalidades/{id_penalidad}` | Privada (Admin) | Eliminar penalidad |

### `Puntos y fidelizacion` — `backend/app/routers/puntos.py` (6 endpoints)

| Método | Ruta | Auth | Descripción |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/puntos/saldo` | Privada | Saldo de puntos |
| `GET` | `/api/puntos/movimientos` | Privada | Historial de movimientos |
| `POST` | `/api/puntos/canjear` | Privada | Canjear puntos |
| `POST` | `/api/puntos/clientes/{id_cliente}/ajuste` | Privada (Admin) | Ajuste manual |
| `GET` | `/api/puntos/clientes/{id_cliente}/saldo` | Privada (Admin/Barbero) | Saldo de un cliente |
| `GET` | `/api/puntos/equivalencia` | Pública | Equivalencia puntos <-> pesos |

### `Reportes` — `backend/app/routers/reportes.py` (10 endpoints)

| Método | Ruta | Auth | Descripción |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/reportes/dashboard` | Privada | Dashboard segun mi rol |
| `GET` | `/api/reportes/dashboard/admin` | Privada (Admin) | Tablero general |
| `GET` | `/api/reportes/dashboard/barbero/{id_barbero}` | Privada | Tablero de un barbero |
| `GET` | `/api/reportes/dashboard/cliente/{id_cliente}` | Privada | Tablero de un cliente |
| `GET` | `/api/reportes/ingresos` | Privada (Admin) | Ingresos por periodo |
| `GET` | `/api/reportes/ingresos/barberos` | Privada (Admin) | Ingresos por barbero |
| `GET` | `/api/reportes/servicios-populares` | Privada (Admin) | Servicios top |
| `GET` | `/api/reportes/citas` | Privada (Admin) | Reporte de citas |
| `GET` | `/api/reportes/ocupacion` | Privada (Admin) | Ocupacion de barberos |
| `GET` | `/api/reportes/fidelizacion` | Privada (Admin) | Reporte de fidelizacion |

### `Resenas` — `backend/app/routers/resenas.py` (9 endpoints)

| Método | Ruta | Auth | Descripción |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/resenas` | Pública | Listar resenas |
| `GET` | `/api/resenas/pendientes` | Privada | Citas que puedo resenar |
| `GET` | `/api/resenas/barbero/{id_barbero}/resumen` | Pública | Resumen de un barbero |
| `GET` | `/api/resenas/cita/{id_cita}` | Pública | Resena de una cita |
| `GET` | `/api/resenas/{id_resena}` | Pública | Detalle de una resena |
| `POST` | `/api/resenas` | Privada | Publicar resena |
| `PUT` | `/api/resenas/{id_resena}` | Privada | Editar mi resena |
| `PATCH` | `/api/resenas/{id_resena}/visibilidad` | Privada (Admin) | Mostrar u ocultar (moderacion) |
| `DELETE` | `/api/resenas/{id_resena}` | Privada (Admin) | Eliminar una resena |

### `Servicios` — `backend/app/routers/servicios.py` (9 endpoints)

| Método | Ruta | Auth | Descripción |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/servicios` | Pública | Listar servicios |
| `GET` | `/api/servicios/categorias` | Pública | Categorias con conteo |
| `GET` | `/api/servicios/catalogo-cortes` | Pública | Catalogo de cortes |
| `GET` | `/api/servicios/{id_servicio}` | Pública | Detalle de un servicio |
| `GET` | `/api/servicios/{id_servicio}/barberos` | Pública | Barberos que lo prestan |
| `POST` | `/api/servicios` | Privada (Admin) | Crear un servicio |
| `PUT` | `/api/servicios/{id_servicio}` | Privada (Admin) | Actualizar un servicio |
| `PATCH` | `/api/servicios/{id_servicio}/estado` | Privada (Admin) | Activar o desactivar |
| `DELETE` | `/api/servicios/{id_servicio}` | Privada (Admin) | Eliminar o desactivar |

### `Usuarios` — `backend/app/routers/usuarios.py` (9 endpoints)

| Método | Ruta | Auth | Descripción |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/usuarios` | Privada (Admin) | Listar usuarios |
| `GET` | `/api/usuarios/roles` | Privada (Admin) | Catalogo de roles |
| `GET` | `/api/usuarios/me` | Privada | Mi perfil |
| `PUT` | `/api/usuarios/me` | Privada | Actualizar mi perfil |
| `GET` | `/api/usuarios/{id_usuario}` | Privada | Obtener un usuario |
| `POST` | `/api/usuarios/interno` | Privada (Admin) | Crear administrador o barbero |
| `PUT` | `/api/usuarios/{id_usuario}` | Privada | Actualizar un usuario |
| `PATCH` | `/api/usuarios/{id_usuario}/estado` | Privada (Admin) | Activar o desactivar un usuario |
| `DELETE` | `/api/usuarios/{id_usuario}` | Privada (Admin) | Desactivar un usuario (baja logica) |

---

## 🔁 Rutas de compatibilidad (v1)

El router `legacy.py` expone 4 rutas heredadas de la primera versión del
proyecto (`/api/datos`, `/api/login`, `POST /api/clientes`, `POST /api/citas`).
Se registran **solo si `ENABLE_LEGACY_ROUTES` está activo** en la configuración
(`app/core/config.py`).

> [!IMPORTANT]
> **Apagadas por defecto.** El frontend consume la **API v2** con JWT
> (`Authorization: Bearer`), carga el catálogo desde `/servicios`, `/barberos`
> y `/citas`, y ya no depende de `mockData.ts` ni de las rutas legacy. Estas 4
> rutas quedan **desactivadas** por defecto (`ENABLE_LEGACY_ROUTES=false`):
> `/api/datos` respondía sin autenticación exponiendo correos, teléfonos y
> citas, lo que incumplía RNF-001 y el ítem OWASP A01.

---

## 📎 Ver también

- [`docs/referencia-tecnica/architecture.md`](architecture.md) — arquitectura por capas.
- [`docs/referencia-tecnica/database-schema.md`](database-schema.md) — diccionario de datos.
- [`.github/copilot-instructions.md`](../../.github/copilot-instructions.md) — convenciones de código.
