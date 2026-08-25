# CU-05 — Búsqueda de Clientes

[⬅ Volver al README principal](../../../README.md)

---

## Identificación

| Campo | Valor |
|---|---|
| **ID** | CU-05 |
| **Historia de Usuario asociada** | [HU-005](../HUs/HU-005_b%C3%BAsqueda_y_consulta_de_clientes.md) |
| **Módulo** | Gestion de Clientes, Servicios y Barberos |
| **Actores** | Administrador |

---

## Descripción

Permite al administrador buscar un cliente en el sistema mediante su nombre o número de teléfono para ubicarlo de forma rápida y eficiente.

## Precondiciones

- El administrador debe haber iniciado sesión.
- Deben existir clientes registrados en el sistema.

## Postcondiciones

- El sistema muestra los clientes que coinciden con el criterio de búsqueda.
- El administrador puede seleccionar un cliente para ver su detalle.

## Secuencia Normal

| # | Acción (actor) | Reacción (sistema) |
|---|---|---|
| 1 | El administrador accede al módulo de clientes. | El sistema muestra la lista de clientes y el campo de búsqueda. |
| 2 | El administrador ingresa un nombre o número de teléfono. | El sistema filtra y muestra los clientes que coincidan. |
| 3 | El administrador selecciona el cliente deseado. | El sistema muestra el perfil completo del cliente. |

## Excepciones

| # | Acción (actor) | Reacción (sistema) |
|---|---|---|
| p | No existen coincidencias con el criterio ingresado. | El sistema muestra: "No se encontraron clientes con ese criterio". |
| q | El campo de búsqueda está vacío. | El sistema muestra la lista completa de clientes registrados. |

## Rendimiento

Los resultados de búsqueda deben mostrarse en menos de 2 segundos.

## Frecuencia de uso

Se realiza frecuentemente para localizar clientes específicos al gestionar citas.

## Diagrama de Caso de Uso

```mermaid
flowchart LR
    A0(["👤 Administrador"])
    UC(["Buscar Cliente"])
    A0 --> UC
    I0(["Filtrar Clientes"])
    UC -.include.-> I0
    E0(["Ver Perfil Cliente"])
    E0 -.extend.-> UC
```

---

[⬅ Volver al README principal](../../../README.md)
