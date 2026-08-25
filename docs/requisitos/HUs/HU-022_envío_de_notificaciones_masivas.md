# HU-022 — Envío de notificaciones masivas

<!--
  ¿Qué? Historia de usuario que describe el requerimiento de envío de notificaciones masivas.
  ¿Para qué? Formalizar la necesidad del administrador en el sistema GLOBDE.
  ¿Impacto? Garantiza la correcta implementación de la funcionalidad y su trazabilidad con RF-013.
-->

---

## Identificación

| Campo | Valor |
| :--- | :--- |
| **ID** | HU-022 |
| **Título** | Envío de notificaciones masivas |
| **Módulo** | Notificaciones |
| **Prioridad** | Baja |
| **Estado** | Implementada |
| **RF Asociados** | RF-013 |

---

## Historia

**Como** administrador,  
**quiero** enviar comunicados o promociones a los clientes,  
**para** impulsar la demanda del salón.

---

## Criterios de Aceptación

### CA-HU-022.1 — Validación de datos y precondiciones
- **Dado que** el administrador se encuentra en la vista de notificaciones,
- **cuando** intenta realizar la acción con datos inválidos o incompletos,
- **entonces** el sistema debe mostrar mensajes de error descriptivos impidiendo la acción.

### CA-HU-022.2 — Flujo exitoso de operación
- **Dado que** se han ingresado los datos válidos requeridos,
- **cuando** el administrador confirma la operación,
- **entonces** el sistema procesa la solicitud, actualiza el estado en la base de datos MySQL y muestra una notificación de éxito.

### CA-HU-022.3 — Control de accesos y persistencia
- **Dado que** la acción se completa satisfactoriamente,
- **cuando** se consulta el módulo correspondiente,
- **entonces** la información debe reflejarse de forma consistente en el estado global de la aplicación (React Context API, `AppContext`) y en la interfaz.
