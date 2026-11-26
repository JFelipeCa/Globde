# HU-027 — Configuración de horario comercial

<!--
  ¿Qué? Historia de usuario que describe el requerimiento de configuración de horario comercial.
  ¿Para qué? Formalizar la necesidad del administrador en el sistema GLOBDE.
  ¿Impacto? Garantiza la correcta implementación de la funcionalidad y su trazabilidad con RF-015.
-->

---

## Identificación

| Campo | Valor |
| :--- | :--- |
| **ID** | HU-027 |
| **Título** | Configuración de horario comercial |
| **Módulo** | Configuración |
| **Prioridad** | Media |
| **Estado** | Implementada en código |
| **RF Asociados** | RF-015 |

El horario global se guarda en `horarios_negocio`, se administra desde el panel
de agenda y se consulta por `/api/agenda/horarios-negocio`.

---

## Historia

**Como** administrador,  
**quiero** definir horas de apertura y cierre del negocio,  
**para** restringir las franjas de agendamiento.

---

## Criterios de Aceptación

### CA-HU-027.1 — Validación de datos y precondiciones
- **Dado que** el administrador se encuentra en la vista de configuración,
- **cuando** intenta realizar la acción con datos inválidos o incompletos,
- **entonces** el sistema debe mostrar mensajes de error descriptivos impidiendo la acción.

### CA-HU-027.2 — Flujo exitoso de operación
- **Dado que** se han ingresado los datos válidos requeridos,
- **cuando** el administrador confirma la operación,
- **entonces** el sistema procesa la solicitud, actualiza el estado en la base de datos MySQL y muestra una notificación de éxito.

### CA-HU-027.3 — Control de accesos y persistencia
- **Dado que** la acción se completa satisfactoriamente,
- **cuando** se consulta el módulo correspondiente,
- **entonces** la información debe reflejarse de forma consistente en el estado global de la aplicación (React Context API, `AppContext`) y en la interfaz.
