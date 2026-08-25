# HU-016 — Búsqueda y filtrado de citas

<!--
  ¿Qué? Historia de usuario que describe el requerimiento de búsqueda y filtrado de citas.
  ¿Para qué? Formalizar la necesidad del administrador en el sistema GLOBDE.
  ¿Impacto? Garantiza la correcta implementación de la funcionalidad y su trazabilidad con RF-009.
-->

---

## Identificación

| Campo | Valor |
| :--- | :--- |
| **ID** | HU-016 |
| **Título** | Búsqueda y filtrado de citas |
| **Módulo** | Citas |
| **Prioridad** | Media |
| **Estado** | Implementada |
| **RF Asociados** | RF-009 |

---

## Historia

**Como** administrador,  
**quiero** filtrar citas por fecha, barbero, cliente o estado,  
**para** auditar la operación del salón.

---

## Criterios de Aceptación

### CA-HU-016.1 — Validación de datos y precondiciones
- **Dado que** el administrador se encuentra en la vista de citas,
- **cuando** intenta realizar la acción con datos inválidos o incompletos,
- **entonces** el sistema debe mostrar mensajes de error descriptivos impidiendo la acción.

### CA-HU-016.2 — Flujo exitoso de operación
- **Dado que** se han ingresado los datos válidos requeridos,
- **cuando** el administrador confirma la operación,
- **entonces** el sistema procesa la solicitud, actualiza el estado en la base de datos MySQL y muestra una notificación de éxito.

### CA-HU-016.3 — Control de accesos y persistencia
- **Dado que** la acción se completa satisfactoriamente,
- **cuando** se consulta el módulo correspondiente,
- **entonces** la información debe reflejarse de forma consistente en el estado global de la aplicación (React Context API, `AppContext`) y en la interfaz.
