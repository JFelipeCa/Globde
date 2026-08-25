# HU-018 — Calificación del servicio recibido

<!--
  ¿Qué? Historia de usuario que describe el requerimiento de calificación del servicio recibido.
  ¿Para qué? Formalizar la necesidad del cliente con cita completada en el sistema GLOBDE.
  ¿Impacto? Garantiza la correcta implementación de la funcionalidad y su trazabilidad con RF-011.
-->

---

## Identificación

| Campo | Valor |
| :--- | :--- |
| **ID** | HU-018 |
| **Título** | Calificación del servicio recibido |
| **Módulo** | Calificaciones |
| **Prioridad** | Media |
| **Estado** | Implementada |
| **RF Asociados** | RF-011 |

---

## Historia

**Como** cliente con cita completada,  
**quiero** calificar de 1 a 5 estrellas la atención del barbero,  
**para** retroalimentar la calidad del servicio.

---

## Criterios de Aceptación

### CA-HU-018.1 — Validación de datos y precondiciones
- **Dado que** el cliente con cita completada se encuentra en la vista de calificaciones,
- **cuando** intenta realizar la acción con datos inválidos o incompletos,
- **entonces** el sistema debe mostrar mensajes de error descriptivos impidiendo la acción.

### CA-HU-018.2 — Flujo exitoso de operación
- **Dado que** se han ingresado los datos válidos requeridos,
- **cuando** el cliente con cita completada confirma la operación,
- **entonces** el sistema procesa la solicitud, actualiza el estado en la base de datos MySQL y muestra una notificación de éxito.

### CA-HU-018.3 — Control de accesos y persistencia
- **Dado que** la acción se completa satisfactoriamente,
- **cuando** se consulta el módulo correspondiente,
- **entonces** la información debe reflejarse de forma consistente en el estado global de la aplicación (React Context API, `AppContext`) y en la interfaz.
