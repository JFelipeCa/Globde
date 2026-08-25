# Cambios requeridos en Backend para Base de Datos GLOBDE v2

## Objetivo

Este documento describe los cambios que el backend debe implementar para adaptarse a la base de datos v2.

La DB v2 prioriza seguridad, normalización, recuperación real de contraseña, agenda por rangos horarios, auditoría y trazabilidad.

---

## Resumen

La nueva base de datos cambia el modelo anterior para dejarlo más cercano a producción.  
Esto implica que algunas consultas actuales del backend deberán actualizarse.

Los cambios principales están relacionados con:

- Autenticación.
- Recuperación de contraseña.
- Gestión de usuarios.
- Gestión de clientes.
- Gestión de barberos.
- Gestión de citas.
- Servicios.
- Facturación.
- Fidelización.
- Auditoría.
- Logs de correo.

---

## Cambios principales

| Modelo anterior | Modelo nuevo | Cambio requerido en backend |
|---|---|---|
| `usuarios.contrasena` | `usuarios.contrasena_hash` | Login, registro y recuperación deben usar la nueva columna. |
| `clientes.nombre` | `usuarios.nombre` | Los datos personales se consultan desde `usuarios`. |
| `clientes.correo` | `usuarios.correo` | El correo del cliente se obtiene mediante JOIN con `usuarios`. |
| `clientes.telefono` | `usuarios.telefono` | El teléfono se obtiene mediante JOIN con `usuarios`. |
| Barberos como usuarios con rol | Tabla `barberos` relacionada con `usuarios` | El backend debe consultar barberos mediante JOIN. |
| `citas.id_usuario` | `citas.id_barbero` | Las citas deben asociarse al barbero real. |
| `citas.hora` | `citas.hora_inicio` y `citas.hora_fin` | La agenda debe validar solapamientos por rango horario. |
| `password_reset_tokens.used` | `password_reset_tokens.used_at` | La recuperación debe marcar fecha de uso, no solo booleano. |
| `tokens_recuperacion` | Eliminada | No debe usarse esta tabla. |
| Puntaje directo en cliente | `puntos_movimientos` | Los puntos deben registrar historial auditable. |
| Factura básica | `facturas` + `detalle_factura` | La facturación debe manejar subtotales, descuentos, impuestos, total y detalle. |
| Sin logs de correo | `email_logs` | El backend debe registrar intentos de envío de correo. |
| Sin logs de auditoría | `audit_logs` | El backend debe registrar acciones importantes. |

---

## Autenticación

### Login

Antes se validaba contra:

```text
usuarios.contrasena
```

Ahora debe validarse contra:

```text
usuarios.contrasena_hash
```

La contraseña nunca debe guardarse ni devolverse en texto plano.

### Consulta sugerida

```sql
SELECT
    id_usuario,
    id_rol,
    nombre,
    correo,
    telefono,
    contrasena_hash,
    activo,
    email_verificado_at,
    ultimo_login_at
FROM usuarios
WHERE correo = ?;
```

### Después de login exitoso

Actualizar:

```sql
UPDATE usuarios
SET ultimo_login_at = NOW()
WHERE id_usuario = ?;
```

También se recomienda registrar el evento en:

```text
login_attempts
audit_logs
```

---

## Registro de usuarios

Al registrar usuarios, el backend debe insertar en:

```text
usuarios
```

La contraseña debe llegar ya procesada como hash seguro.

Para clientes, además debe insertar en:

```text
clientes
```

Para barberos, además debe insertar en:

```text
barberos
```

### Cliente

```sql
INSERT INTO usuarios (
    id_rol,
    nombre,
    correo,
    telefono,
    contrasena_hash,
    activo
) VALUES (?, ?, ?, ?, ?, 1);
```

Luego:

```sql
INSERT INTO clientes (
    id_usuario,
    puntos_saldo,
    nivel_fidelizacion
) VALUES (?, 0, 'Bronce');
```

### Barbero

```sql
INSERT INTO usuarios (
    id_rol,
    nombre,
    correo,
    telefono,
    contrasena_hash,
    activo
) VALUES (?, ?, ?, ?, ?, 1);
```

Luego:

```sql
INSERT INTO barberos (
    id_usuario,
    experiencia_anios,
    bio,
    disponible
) VALUES (?, ?, ?, 1);
```

---

## Recuperación de contraseña

La recuperación debe usar únicamente:

```text
password_reset_tokens
```

La tabla anterior:

```text
tokens_recuperacion
```

fue eliminada y no debe usarse.

### Flujo esperado

1. El usuario solicita recuperación con su correo.
2. El backend responde con un mensaje genérico, exista o no exista el correo.
3. Si el correo existe, el backend genera un token aleatorio seguro.
4. El backend guarda solo el hash del token en `password_reset_tokens.token_hash`.
5. El backend define `expires_at`.
6. El backend envía el token real al correo del usuario.
7. El token debe ser de un solo uso.
8. Al usarse, debe marcarse `used_at`.
9. El intento de correo debe registrarse en `email_logs`.
10. El evento debe poder registrarse en `audit_logs`.

### Crear token

```sql
INSERT INTO password_reset_tokens (
    id_usuario,
    token_hash,
    expires_at,
    request_ip,
    user_agent
) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL ? MINUTE), ?, ?);
```

### Validar token

```sql
SELECT
    id_token,
    id_usuario,
    expires_at,
    used_at
FROM password_reset_tokens
WHERE token_hash = ?
  AND used_at IS NULL
  AND expires_at > NOW()
LIMIT 1;
```

### Marcar token como usado

```sql
UPDATE password_reset_tokens
SET used_at = NOW()
WHERE id_token = ?;
```

### Actualizar contraseña

```sql
UPDATE usuarios
SET contrasena_hash = ?,
    actualizado_en = NOW()
WHERE id_usuario = ?;
```

---

## Variables de entorno requeridas para correo

La recuperación real por correo debe configurarse fuera del código:

```env
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASSWORD=
SMTP_FROM=
FRONTEND_URL=
RESET_TOKEN_MINUTES=
```

No se deben quemar correos, contraseñas SMTP ni tokens en el código.

---

## Registro de correos

El backend debe registrar envíos o fallos en:

```text
email_logs
```

### Insertar intento pendiente

```sql
INSERT INTO email_logs (
    id_usuario,
    destinatario,
    tipo,
    asunto,
    estado,
    proveedor
) VALUES (?, ?, 'password_reset', ?, 'pendiente', ?);
```

### Marcar enviado

```sql
UPDATE email_logs
SET estado = 'enviado',
    enviado_en = NOW()
WHERE id_email = ?;
```

### Marcar fallido

```sql
UPDATE email_logs
SET estado = 'fallido',
    error = ?
WHERE id_email = ?;
```

---

## Citas

La agenda debe migrar de hora única a rango horario.

Antes:

```text
fecha + hora
```

Ahora:

```text
fecha + hora_inicio + hora_fin
```

La cita debe asociarse a:

```text
id_cliente
id_barbero
id_servicio
```

No debe asociarse el barbero directamente mediante `citas.id_usuario`.

### Crear cita

```sql
INSERT INTO citas (
    codigo_reserva,
    id_cliente,
    id_barbero,
    id_servicio,
    fecha,
    hora_inicio,
    hora_fin,
    estado,
    precio_total,
    descuento_aplicado,
    puntos_canjeados,
    observaciones
) VALUES (?, ?, ?, ?, ?, ?, ?, 'pendiente', ?, 0, 0, ?);
```

### Validación recomendada de solapamiento

```sql
SELECT id_cita
FROM citas
WHERE id_barbero = ?
  AND fecha = ?
  AND estado NOT IN ('cancelada', 'no_asistio')
  AND hora_inicio < ?
  AND hora_fin > ?;
```

Parámetros:

```text
nueva_hora_fin
nueva_hora_inicio
```

### Listar citas con datos completos

```sql
SELECT
    ci.id_cita,
    ci.codigo_reserva,
    ci.fecha,
    ci.hora_inicio,
    ci.hora_fin,
    ci.estado,
    ci.precio_total,
    cliente_user.nombre AS cliente_nombre,
    cliente_user.correo AS cliente_correo,
    barbero_user.nombre AS barbero_nombre,
    s.nombre AS servicio_nombre,
    s.duracion_minutos
FROM citas ci
JOIN clientes cl ON cl.id_cliente = ci.id_cliente
JOIN usuarios cliente_user ON cliente_user.id_usuario = cl.id_usuario
JOIN barberos b ON b.id_barbero = ci.id_barbero
JOIN usuarios barbero_user ON barbero_user.id_usuario = b.id_usuario
JOIN servicios s ON s.id_servicio = ci.id_servicio;
```

---

## Clientes

Los datos personales del cliente se obtienen desde `usuarios`.

Consulta recomendada:

```sql
SELECT
    c.id_cliente,
    u.id_usuario,
    u.nombre,
    u.correo,
    u.telefono,
    c.puntos_saldo,
    c.nivel_fidelizacion,
    c.fecha_registro
FROM clientes c
JOIN usuarios u ON u.id_usuario = c.id_usuario;
```

---

## Barberos

Los barberos se consultan desde la tabla `barberos` relacionada con `usuarios`.

Consulta recomendada:

```sql
SELECT
    b.id_barbero,
    u.id_usuario,
    u.nombre,
    u.correo,
    u.telefono,
    b.bio,
    b.experiencia_anios,
    b.rating,
    b.total_resenas,
    b.citas_completadas,
    b.disponible
FROM barberos b
JOIN usuarios u ON u.id_usuario = b.id_usuario;
```

---

## Servicios

La tabla `servicios` incluye nuevos campos:

- `categoria`
- `icono`
- `imagen_url`
- `puntos_otorga`
- `popular`
- `activo`

### Consulta sugerida

```sql
SELECT
    id_servicio,
    nombre,
    categoria,
    descripcion,
    precio,
    duracion_minutos,
    icono,
    imagen_url,
    puntos_otorga,
    popular,
    activo
FROM servicios
WHERE activo = 1;
```

---

## Facturación

Las facturas deben manejar:

- número de factura.
- subtotal.
- descuento.
- impuestos.
- total.
- método de pago.
- estado de pago.
- detalle de factura.

### Consulta sugerida

```sql
SELECT
    f.id_factura,
    f.numero_factura,
    f.fecha_emision,
    f.subtotal,
    f.descuento,
    f.impuestos,
    f.total,
    f.metodo_pago,
    f.estado_pago,
    df.descripcion,
    df.cantidad,
    df.precio_unitario,
    df.subtotal AS subtotal_detalle
FROM facturas f
JOIN detalle_factura df ON df.id_factura = f.id_factura
WHERE f.id_factura = ?;
```

---

## Fidelización

Los puntos deben manejarse mediante historial.

Tabla principal:

```text
puntos_movimientos
```

Tipos recomendados:

```text
ganancia
canje
ajuste
penalizacion
```

Cuando una cita se completa, el backend puede:

1. Sumar puntos en `clientes.puntos_saldo`.
2. Insertar movimiento en `puntos_movimientos`.

---

## Reseñas

Las reseñas se registran en:

```text
resenas
```

Cada cita solo debe tener una reseña.

### Insertar reseña

```sql
INSERT INTO resenas (
    id_cita,
    id_cliente,
    id_barbero,
    calificacion,
    comentario
) VALUES (?, ?, ?, ?, ?);
```

Luego se recomienda actualizar métricas del barbero:

```sql
UPDATE barberos
SET total_resenas = total_resenas + 1
WHERE id_barbero = ?;
```

---

## Auditoría y logs

El backend debe registrar eventos importantes en:

```text
audit_logs
email_logs
login_attempts
```

Eventos recomendados:

- login exitoso.
- login fallido.
- solicitud de recuperación.
- contraseña cambiada.
- cita creada.
- cita cancelada.
- factura emitida.
- puntos ajustados.
- servicio creado.
- servicio editado.
- usuario desactivado.

### Insertar auditoría

```sql
INSERT INTO audit_logs (
    id_usuario,
    accion,
    entidad,
    entidad_id,
    ip,
    user_agent,
    detalles
) VALUES (?, ?, ?, ?, ?, ?, ?);
```

---

## Notificaciones

Las notificaciones del sistema se registran en:

```text
notificaciones
```

Pueden usarse para:

- confirmaciones de cita.
- recordatorios.
- cancelaciones.
- mensajes del sistema.
- alertas administrativas.

---

## Consideraciones para el frontend

El frontend deberá consumir datos ajustados al nuevo modelo, especialmente en:

- Login.
- Perfil.
- Servicios.
- Barberos.
- Agenda.
- Citas.
- Historial.
- Facturas.
- Puntos.
- Reseñas.

---

## Nota importante

La DB v2 puede romper consultas existentes del backend actual. Esto es esperado porque la base de datos fue rediseñada para una estructura más cercana a producción.

El backend debe adaptarse a este nuevo contrato de datos antes de considerar funcional la aplicación completa.