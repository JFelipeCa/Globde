# HU-011 — Visualización de perfil de barbero

<!--
  ¿Qué? Historia de usuario que describe el requerimiento de visualización de perfil de barbero.
  ¿Para qué? Formalizar la necesidad del cliente en el sistema GLOBDE.
  ¿Impacto? Garantiza la correcta implementación de la funcionalidad y su trazabilidad con RF-005.
-->

---

## Identificación

| Campo | Valor |
| :--- | :--- |
| **ID** | HU-011 |
| **Título** | Visualización de perfil de barbero |
| **Módulo** | Personal |
| **Prioridad** | Media |
| **Estado** | Implementada |
| **RF Asociados** | RF-005 |

---

## Historia

**Como** cliente,  
**quiero** ver el perfil, especialidad y calificación promedio del barbero,  
**para** elegir al barbero de mi preferencia.

---

## Criterios de Aceptación

### CA-HU-011.1 — Validación de datos y precondiciones
- **Dado que** el cliente se encuentra en la vista de personal,
- **cuando** intenta realizar la acción con datos inválidos o incompletos,
- **entonces** el sistema debe mostrar mensajes de error descriptivos impidiendo la acción.

### CA-HU-011.2 — Flujo exitoso de operación
- **Dado que** se han ingresado los datos válidos requeridos,
- **cuando** el cliente confirma la operación,
- **entonces** el sistema procesa la solicitud, actualiza el estado en la base de datos MySQL y muestra una notificación de éxito.

### CA-HU-011.3 — Control de accesos y persistencia
- **Dado que** la acción se completa satisfactoriamente,
- **cuando** se consulta el módulo correspondiente,
- **entonces** la información debe reflejarse de forma consistente en el estado global de la aplicación (React Context API, `AppContext`) y en la interfaz.
