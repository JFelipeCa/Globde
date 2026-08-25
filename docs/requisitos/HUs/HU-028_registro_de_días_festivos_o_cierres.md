# HU-028 — Registro de días festivos o cierres

<!--
  ¿Qué? Historia de usuario que describe el requerimiento de registro de días festivos o cierres.
  ¿Para qué? Formalizar la necesidad del administrador en el sistema GLOBDE.
  ¿Impacto? Garantiza la correcta implementación de la funcionalidad y su trazabilidad con RF-015.
-->

---

## Identificación

| Campo | Valor |
| :--- | :--- |
| **ID** | HU-028 |
| **Título** | Registro de días festivos o cierres |
| **Módulo** | Configuración |
| **Prioridad** | Media |
| **Estado** | Parcial |
| **RF Asociados** | RF-015 |

> [!WARNING]
> **Estado real (verificado contra el código, agosto 2026): parcial.**
> Existe la tabla `bloqueos_agenda` y los endpoints
> `POST/DELETE /barberos/{id}/bloqueos`, pero la columna `id_barbero` es
> `NOT NULL` y el bloqueo exige `hora_inicio`/`hora_fin`. Es decir: se puede
> bloquear a **un** barbero en un rango horario, no cerrar el negocio completo
> un día festivo. Falta: bloqueos de día completo a nivel de negocio
> (`id_barbero` nullable o tabla `dias_no_laborales`) y su propagación a la
> validación de disponibilidad.

---

## Historia

**Como** administrador,  
**quiero** marcar días no laborales en el calendario,  
**para** bloquear reservas en fechas de cierre.

---

## Criterios de Aceptación

### CA-HU-028.1 — Validación de datos y precondiciones
- **Dado que** el administrador se encuentra en la vista de configuración,
- **cuando** intenta realizar la acción con datos inválidos o incompletos,
- **entonces** el sistema debe mostrar mensajes de error descriptivos impidiendo la acción.

### CA-HU-028.2 — Flujo exitoso de operación
- **Dado que** se han ingresado los datos válidos requeridos,
- **cuando** el administrador confirma la operación,
- **entonces** el sistema procesa la solicitud, actualiza el estado en la base de datos MySQL y muestra una notificación de éxito.

### CA-HU-028.3 — Control de accesos y persistencia
- **Dado que** la acción se completa satisfactoriamente,
- **cuando** se consulta el módulo correspondiente,
- **entonces** la información debe reflejarse de forma consistente en el estado global de la aplicación (React Context API, `AppContext`) y en la interfaz.
