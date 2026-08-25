# HU-014 — Visualización de agenda del barbero

<!--
  ¿Qué? Historia de usuario que describe el requerimiento de visualización de agenda del barbero.
  ¿Para qué? Formalizar la necesidad del barbero en el sistema GLOBDE.
  ¿Impacto? Garantiza la correcta implementación de la funcionalidad y su trazabilidad con RF-008.
-->

---

## Identificación

| Campo | Valor |
| :--- | :--- |
| **ID** | HU-014 |
| **Título** | Visualización de agenda del barbero |
| **Módulo** | Citas |
| **Prioridad** | Alta |
| **Estado** | Implementada |
| **RF Asociados** | RF-008 |

---

## Historia

**Como** barbero,  
**quiero** consultar mi agenda diaria de citas,  
**para** atender puntualmente a mis clientes.

---

## Criterios de Aceptación

### CA-HU-014.1 — Validación de datos y precondiciones
- **Dado que** el barbero se encuentra en la vista de citas,
- **cuando** intenta realizar la acción con datos inválidos o incompletos,
- **entonces** el sistema debe mostrar mensajes de error descriptivos impidiendo la acción.

### CA-HU-014.2 — Flujo exitoso de operación
- **Dado que** se han ingresado los datos válidos requeridos,
- **cuando** el barbero confirma la operación,
- **entonces** el sistema procesa la solicitud, actualiza el estado en la base de datos MySQL y muestra una notificación de éxito.

### CA-HU-014.3 — Control de accesos y persistencia
- **Dado que** la acción se completa satisfactoriamente,
- **cuando** se consulta el módulo correspondiente,
- **entonces** la información debe reflejarse de forma consistente en el estado global de la aplicación (React Context API, `AppContext`) y en la interfaz.
