# CU-25 — Configuración de Puntos por Servicio

[⬅ Volver al README principal](../../../README.md)

---

## Identificación

| Campo | Valor |
|---|---|
| **ID** | CU-25 |
| **Historia de Usuario asociada** | [HU-025](../HUs/HU-025_configuraci%C3%B3n_de_puntos_por_servicio.md) |
| **Módulo** | Programa de Fidelizacion (Puntos) |
| **Actores** | Administrador |

---

## Descripción

Permite al administrador definir la cantidad de puntos que otorga cada servicio al completarse para personalizar el programa de fidelización.

## Precondiciones

- El administrador debe haber iniciado sesión.
- Los servicios deben estar registrados en el sistema.

## Postcondiciones

- Los puntos quedan configurados por servicio.
- El sistema aplica la nueva puntuación a las citas futuras de ese servicio.

## Secuencia Normal

| # | Acción (actor) | Reacción (sistema) |
|---|---|---|
| 1 | El administrador accede al módulo de servicios. | El sistema muestra la lista de servicios con su puntuación actual. |
| 2 | El administrador selecciona un servicio y accede a su configuración. | El sistema muestra el formulario de configuración de puntos. |
| 3 | El administrador define la cantidad de puntos a otorgar y guarda. | El sistema valida el valor y aplica los puntos configurados. |

## Excepciones

| # | Acción (actor) | Reacción (sistema) |
|---|---|---|
| p | El valor de puntos ingresado no es numérico o es negativo. | El sistema muestra: "Ingrese un valor numérico positivo". |

## Rendimiento

La configuración debe guardarse en menos de 2 segundos.

## Frecuencia de uso

Se realiza al crear un servicio o al ajustar la estrategia de fidelización.

## Diagrama de Caso de Uso

```mermaid
flowchart LR
    A0(["👤 Administrador"])
    UC(["Configurar Puntos"])
    A0 --> UC
    I0(["Validar Valor"])
    UC -.include.-> I0
```

---

[⬅ Volver al README principal](../../../README.md)
