# HU-029 — Reporte analítico de ingresos

<!--
  ¿Qué? Historia de usuario que describe el requerimiento de reporte analítico de ingresos.
  ¿Para qué? Formalizar la necesidad del administrador en el sistema GLOBDE.
  ¿Impacto? Garantiza la correcta implementación de la funcionalidad y su trazabilidad con RF-016.
-->

---

## Identificación

| Campo | Valor |
| :--- | :--- |
| **ID** | HU-029 |
| **Título** | Reporte analítico de ingresos |
| **Módulo** | Reportes |
| **Prioridad** | Alta |
| **Estado** | Implementada |
| **RF Asociados** | RF-016 |

---

## Historia

**Como** administrador,  
**quiero** ver los ingresos brutos generados por mes y año,  
**para** controlar las finanzas del negocio.

---

## Criterios de Aceptación

### CA-HU-029.1 — Validación de datos y precondiciones
- **Dado que** el administrador se encuentra en la vista de reportes,
- **cuando** intenta realizar la acción con datos inválidos o incompletos,
- **entonces** el sistema debe mostrar mensajes de error descriptivos impidiendo la acción.

### CA-HU-029.2 — Flujo exitoso de operación
- **Dado que** se han ingresado los datos válidos requeridos,
- **cuando** el administrador confirma la operación,
- **entonces** el sistema procesa la solicitud, actualiza el estado en la base de datos MySQL y muestra una notificación de éxito.

### CA-HU-029.3 — Control de accesos y persistencia
- **Dado que** la acción se completa satisfactoriamente,
- **cuando** se consulta el módulo correspondiente,
- **entonces** la información debe reflejarse de forma consistente en el estado global de la aplicación (React Context API, `AppContext`) y en la interfaz.
