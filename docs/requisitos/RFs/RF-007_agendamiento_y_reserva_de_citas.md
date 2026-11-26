# RF-007 — Agendamiento y Reserva de Citas en Línea

<!--
  ¿Qué? Requisito funcional principal que permite agendar citas tanto a clientes de forma autónoma como a administradores y barberos.
  ¿Para qué? Digitalizar el flujo de reservas, evitar filas presenciales y organizar los turnos diarios.
  ¿Impacto? Es el núcleo del negocio de Globde; sin este requisito, no existe la operatividad del sistema de barbería.
-->

---

## Identificación

| Campo | Valor |
| :--- | :--- |
| **ID** | RF-007 |
| **Nombre** | Agendamiento y Reserva de Citas en Línea |
| **Módulo** | Citas y Reservas |
| **Prioridad** | Crítica |
| **Estado** | Implementado |
| **HUs Asociadas** | HU-12, HU-13, HU-33 |
| **Fecha** | Febrero 2026 |

---

## Descripción

El sistema debe permitir reservar una cita o solicitar un turno en lista de
espera, seleccionando servicio, barbero opcional, fecha y franja horaria. La API
valida disponibilidad, jornada, cierres y solapamientos antes de persistir la reserva.

---

## Entradas

| Campo | Tipo | Obligatorio | Validaciones |
| :--- | :--- | :--- | :--- |
| `id_cliente` | Entero | Sí | Debe existir en la tabla `clientes` |
| `id_barbero` | Entero | Sí | Debe existir en `usuarios` con `id_rol = 2` |
| `id_servicio` | Entero | Sí | Debe existir en `servicios` y estar activo |
| `fecha` | Fecha (YYYY-MM-DD) | Sí | No puede ser una fecha pasada |
| `hora` | Hora (HH:MM:SS) | Sí | Dentro del horario comercial del negocio |
| `notas` | Texto | No | Observaciones del cliente |

---

## Proceso

1. El usuario completa el formulario modal de agendamiento en `/citas`.
2. El backend verifica que el barbero esté libre en la fecha y hora seleccionada.
3. Se inserta el registro en la tabla `citas` con estado `'Pendiente'`.
4. Se calcula el precio base a partir de la tabla `servicios`.
5. Si el correo del cliente está registrado, se dispara el correo de confirmación de cita vía SMTP.
6. El backend retorna el objeto de la cita creada con código 201 Created.

---

## Salidas

| Escenario | Código HTTP | Respuesta JSON |
| :--- | :--- | :--- |
| Cita Agendada Exitosamente | 201 Created | `{"id_cita": 15, "id_cliente": 2, "id_barbero": 3, "fecha": "2026-03-10", "hora": "14:00:00", "estado": "Pendiente"}` |
| Horario No Disponible | 400 Bad Request | `{"detail": "El barbero ya cuenta con una cita en ese horario"}` |
| Fecha Inválida | 422 Unprocessable | `{"detail": "No se pueden agendar citas en fechas pasadas"}` |

---

## Endpoints Asociados

| Método | Ruta | Auth Requerida | Descripción |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/citas` | Sí | Crea y registra una nueva cita |
| `GET` | `/api/citas` | Sí | Consulta citas con filtros de barbero, cliente o fecha |

---

## Reglas de Negocio

- **RN-007.1**: No se permite doble reserva en el mismo horario para un mismo barbero.
- **RN-007.2**: Toda cita recién creada adquiere el estado `'Pendiente'`.
- **RN-007.3**: Las citas solo pueden programarse con un máximo de 30 días de anticipación.
