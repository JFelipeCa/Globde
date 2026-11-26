# CU-33 — Gestión de Lista de Espera

> **Estado actual:** implementado con tabla persistente, alta y cancelación de
> solicitudes, aceptación de ofertas y procesamiento periódico de turnos compatibles.

[⬅ Volver al README principal](../../../README.md)

---

## Identificación

| Campo | Valor |
|---|---|
| **ID** | CU-33 |
| **Historia de Usuario asociada** | [HU-033](../HUs/HU-033_gesti%C3%B3n_de_lista_de_espera.md) |
| **Módulo** | Lista de Espera |
| **Actores** | Cliente, Sistema |

---

## Descripción

Permite al cliente autenticado o invitado solicitar un turno y recibir una oferta cuando se libera una franja compatible. El flujo de invitado verifica el correo antes de persistir la solicitud.

## Precondiciones

- El cliente debe haber iniciado sesión.
- Todos los horarios disponibles para la fecha deseada deben estar ocupados.

## Postcondiciones

- El cliente queda inscrito en la lista de espera.
- El sistema notifica al cliente cuando se libere un horario disponible.

## Secuencia Normal

| # | Acción (actor) | Reacción (sistema) |
|---|---|---|
| 1 | El cliente intenta reservar y el sistema detecta que no hay horarios disponibles. | El sistema muestra el mensaje de no disponibilidad y ofrece unirse a la lista de espera. |
| 2 | El cliente selecciona unirse a la lista de espera. | El sistema registra al cliente en la lista para la fecha deseada. |
| 3 | Se libera un horario por cancelación. | El sistema notifica automáticamente al primer cliente de la lista de espera. |
| 4 | El cliente recibe la notificación y confirma o rechaza el turno. | Si confirma, el sistema registra la cita. Si no confirma en 30 min, ofrece el turno al siguiente. |

## Excepciones

| # | Acción (actor) | Reacción (sistema) |
|---|---|---|
| p | El cliente ya está en la lista de espera para esa fecha. | El sistema muestra: "Ya estás inscrito en la lista de espera para esta fecha". |
| q | No se libera ningún horario antes de la fecha deseada. | El sistema notifica al cliente que no hubo disponibilidad y cierra la lista de espera. |

## Rendimiento

La notificación al cliente de la lista de espera debe enviarse en menos de 10 segundos tras la cancelación.

## Frecuencia de uso

Se activa cada vez que un cliente intenta reservar y no hay horarios disponibles.

## Diagrama de Caso de Uso

```mermaid
flowchart LR
    A0(["👤 Cliente"])
    UC(["Gestionar Lista de Espera"])
    A0 --> UC
    I0(["Detectar Disponibilidad"])
    UC -.include.-> I0
    I1(["Registrar Cliente"])
    UC -.include.-> I1
    I2(["Enviar Notificación"])
    UC -.include.-> I2
    E0(["Confirmar Turno"])
    E0 -.extend.-> UC
```

---

[⬅ Volver al README principal](../../../README.md)
