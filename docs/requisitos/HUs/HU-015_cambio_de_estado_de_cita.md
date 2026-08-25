# HU-015 — Cambio de estado de cita

<!--
  ¿Qué? Historia de usuario que describe el requerimiento de cambio de estado de cita.
  ¿Para qué? Formalizar la necesidad del barbero o administrador en el sistema GLOBDE.
  ¿Impacto? Garantiza la correcta implementación de la funcionalidad y su trazabilidad con RF-008.
-->

---

## Identificación

| Campo | Valor |
| :--- | :--- |
| **ID** | HU-015 |
| **Título** | Cambio de estado de cita |
| **Módulo** | Citas |
| **Prioridad** | Alta |
| **Estado** | Implementada |
| **RF Asociados** | RF-008 |

---

## Historia

**Como** barbero o administrador,  
**quiero** marcar una cita como Pendiente, En Atención o Completada,  
**para** reflejar el avance del servicio en tiempo real.

---

## Criterios de Aceptación

### CA-HU-015.1 — Validación de datos y precondiciones
- **Dado que** el barbero o administrador se encuentra en la vista de citas,
- **cuando** intenta realizar la acción con datos inválidos o incompletos,
- **entonces** el sistema debe mostrar mensajes de error descriptivos impidiendo la acción.

### CA-HU-015.2 — Flujo exitoso de operación
- **Dado que** se han ingresado los datos válidos requeridos,
- **cuando** el barbero o administrador confirma la operación,
- **entonces** el sistema procesa la solicitud, actualiza el estado en la base de datos MySQL y muestra una notificación de éxito.

### CA-HU-015.3 — Control de accesos y persistencia
- **Dado que** la acción se completa satisfactoriamente,
- **cuando** se consulta el módulo correspondiente,
- **entonces** la información debe reflejarse de forma consistente en el estado global de la aplicación (React Context API, `AppContext`) y en la interfaz.
