# HU-021 — Alerta de cancelación al administrador

<!--
  ¿Qué? Historia de usuario que describe el requerimiento de alerta de cancelación al administrador.
  ¿Para qué? Formalizar la necesidad del administrador en el sistema GLOBDE.
  ¿Impacto? Garantiza la correcta implementación de la funcionalidad y su trazabilidad con RF-013.
-->

---

## Identificación

| Campo | Valor |
| :--- | :--- |
| **ID** | HU-021 |
| **Título** | Alerta de cancelación al administrador |
| **Módulo** | Notificaciones |
| **Prioridad** | Media |
| **Estado** | Implementada |
| **RF Asociados** | RF-013 |

---

## Historia

**Como** administrador,  
**quiero** recibir alertas cuando un cliente cancela,  
**para** reorganizar el turno disponible.

---

## Criterios de Aceptación

### CA-HU-021.1 — Validación de datos y precondiciones
- **Dado que** el administrador se encuentra en la vista de notificaciones,
- **cuando** intenta realizar la acción con datos inválidos o incompletos,
- **entonces** el sistema debe mostrar mensajes de error descriptivos impidiendo la acción.

### CA-HU-021.2 — Flujo exitoso de operación
- **Dado que** se han ingresado los datos válidos requeridos,
- **cuando** el administrador confirma la operación,
- **entonces** el sistema procesa la solicitud, actualiza el estado en la base de datos MySQL y muestra una notificación de éxito.

### CA-HU-021.3 — Control de accesos y persistencia
- **Dado que** la acción se completa satisfactoriamente,
- **cuando** se consulta el módulo correspondiente,
- **entonces** la información debe reflejarse de forma consistente en el estado global de la aplicación (React Context API, `AppContext`) y en la interfaz.
