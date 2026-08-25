# CU-21 — Alerta de Cancelación al Administrador

[⬅ Volver al README principal](../../../README.md)

---

## Identificación

| Campo | Valor |
|---|---|
| **ID** | CU-21 |
| **Historia de Usuario asociada** | [HU-021](../HUs/HU-021_alerta_de_cancelaci%C3%B3n_al_administrador.md) |
| **Módulo** | Calificaciones, Historial y Notificaciones |
| **Actores** | Sistema, Administrador |

---

## Descripción

El sistema notifica al administrador en el panel cuando un cliente cancela una cita para que pueda reasignar el horario rápidamente.

## Precondiciones

- Debe existir una cita activa que sea cancelada por un cliente.
- El administrador debe tener acceso al panel del sistema.

## Postcondiciones

- El administrador recibe la alerta visible en su panel.
- El administrador puede gestionar el horario liberado.

## Secuencia Normal

| # | Acción (actor) | Reacción (sistema) |
|---|---|---|
| 1 | El cliente cancela su cita desde la plataforma. | El sistema procesa la cancelación y actualiza la agenda. |
| 2 | El sistema genera una alerta de cancelación. | La alerta aparece en el panel del administrador con los datos de la cita. |
| 3 | El administrador revisa la notificación. | El sistema marca la notificación como leída y registra la hora de revisión. |

## Excepciones

| # | Acción (actor) | Reacción (sistema) |
|---|---|---|
| p | El administrador no está conectado en ese momento. | El sistema guarda la notificación y la muestra al próximo inicio de sesión. |

## Rendimiento

La notificación debe aparecer en el panel en menos de 5 segundos tras la cancelación.

## Frecuencia de uso

Se activa cada vez que un cliente cancela una cita registrada en el sistema.

## Diagrama de Caso de Uso

```mermaid
flowchart LR
    A0(["👤 Administrador"])
    UC(["Recibir Alerta"])
    A0 --> UC
    I0(["Visualizar Notificación"])
    UC -.include.-> I0
```

---

[⬅ Volver al README principal](../../../README.md)
