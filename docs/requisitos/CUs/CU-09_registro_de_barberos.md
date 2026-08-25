# CU-09 — Registro de Barberos

[⬅ Volver al README principal](../../../README.md)

---

## Identificación

| Campo | Valor |
|---|---|
| **ID** | CU-09 |
| **Historia de Usuario asociada** | [HU-009](../HUs/HU-009_registro_de_nuevos_barberos.md) |
| **Módulo** | Gestion de Clientes, Servicios y Barberos |
| **Actores** | Administrador |

---

## Descripción

Permite al administrador registrar los barberos del negocio con nombre, especialidad y datos de contacto para gestionar el personal de la barbería.

## Precondiciones

- El administrador debe haber iniciado sesión.
- El barbero no debe estar registrado previamente.

## Postcondiciones

- El barbero queda registrado en el directorio del sistema.
- El barbero puede ser asignado a citas según su disponibilidad.

## Secuencia Normal

| # | Acción (actor) | Reacción (sistema) |
|---|---|---|
| 1 | El administrador accede al módulo de barberos. | El sistema muestra el directorio de barberos registrados. |
| 2 | El administrador selecciona 'Nuevo barbero'. | El sistema muestra el formulario de registro. |
| 3 | El administrador ingresa nombre, especialidad y datos de contacto. | El sistema valida los datos ingresados. |
| 4 | El administrador confirma el registro. | El sistema guarda el perfil del barbero y muestra confirmación. |

## Excepciones

| # | Acción (actor) | Reacción (sistema) |
|---|---|---|
| p | El correo del barbero ya está registrado. | El sistema muestra: "El barbero ya existe en el sistema". |
| q | Faltan datos obligatorios. | El sistema indica los campos pendientes. |

## Rendimiento

El registro debe guardarse en menos de 3 segundos.

## Frecuencia de uso

Se realiza cuando se incorpora un nuevo barbero al equipo de trabajo.

## Diagrama de Caso de Uso

```mermaid
flowchart LR
    A0(["👤 Administrador"])
    UC(["Registrar Barbero"])
    A0 --> UC
    I0(["Validar Datos"])
    UC -.include.-> I0
    I1(["Guardar Barbero"])
    UC -.include.-> I1
```

---

[⬅ Volver al README principal](../../../README.md)
