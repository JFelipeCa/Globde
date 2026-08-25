# CU-07 — Registro de Servicios

[⬅ Volver al README principal](../../../README.md)

---

## Identificación

| Campo | Valor |
|---|---|
| **ID** | CU-07 |
| **Historia de Usuario asociada** | [HU-007](../HUs/HU-007_registro_de_servicios_en_cat%C3%A1logo.md) |
| **Módulo** | Gestion de Clientes, Servicios y Barberos |
| **Actores** | Administrador |

---

## Descripción

Permite al administrador registrar los servicios que ofrece la barbería incluyendo nombre, precio y duración estimada para mostrarlos en el catálogo.

## Precondiciones

- El administrador debe haber iniciado sesión.
- El módulo de servicios debe estar disponible.

## Postcondiciones

- El servicio queda registrado en el sistema.
- El servicio aparece en el catálogo visible para los clientes.

## Secuencia Normal

| # | Acción (actor) | Reacción (sistema) |
|---|---|---|
| 1 | El administrador accede al módulo de servicios. | El sistema muestra el catálogo de servicios activos. |
| 2 | El administrador selecciona 'Nuevo servicio'. | El sistema muestra el formulario de registro. |
| 3 | El administrador ingresa nombre, precio y duración. | El sistema valida los datos ingresados. |
| 4 | El administrador confirma el registro. | El sistema guarda el servicio y muestra confirmación. |

## Excepciones

| # | Acción (actor) | Reacción (sistema) |
|---|---|---|
| p | El nombre del servicio ya existe en el sistema. | El sistema muestra: "Ya existe un servicio con ese nombre". |
| q | Faltan campos obligatorios. | El sistema solicita completar los campos requeridos. |

## Rendimiento

El registro debe completarse en menos de 2 segundos.

## Frecuencia de uso

Se realiza cuando se agrega un nuevo servicio a la oferta de la barbería.

## Diagrama de Caso de Uso

```mermaid
flowchart LR
    A0(["👤 Administrador"])
    UC(["Registrar Servicio"])
    A0 --> UC
    I0(["Validar Datos"])
    UC -.include.-> I0
    I1(["Guardar Servicio"])
    UC -.include.-> I1
```

---

[⬅ Volver al README principal](../../../README.md)
