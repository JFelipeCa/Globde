# HU-026 — Canje de puntos por descuentos

<!--
  ¿Qué? Historia de usuario que describe el requerimiento de canje de puntos por descuentos.
  ¿Para qué? Formalizar la necesidad del cliente y cajero en el sistema GLOBDE.
  ¿Impacto? Garantiza la correcta implementación de la funcionalidad y su trazabilidad con RF-014.
-->

---

## Identificación

| Campo | Valor |
| :--- | :--- |
| **ID** | HU-026 |
| **Título** | Canje de puntos por descuentos |
| **Módulo** | Fidelización |
| **Prioridad** | Alta |
| **Estado** | Implementada |
| **RF Asociados** | RF-014 |

---

## Historia

**Como** cliente y cajero,  
**quiero** aplicar mis puntos acumulados como forma de pago,  
**para** obtener beneficios exclusivos.

---

## Criterios de Aceptación

### CA-HU-026.1 — Validación de datos y precondiciones
- **Dado que** el cliente y cajero se encuentra en la vista de fidelización,
- **cuando** intenta realizar la acción con datos inválidos o incompletos,
- **entonces** el sistema debe mostrar mensajes de error descriptivos impidiendo la acción.

### CA-HU-026.2 — Flujo exitoso de operación
- **Dado que** se han ingresado los datos válidos requeridos,
- **cuando** el cliente y cajero confirma la operación,
- **entonces** el sistema procesa la solicitud, actualiza el estado en la base de datos MySQL y muestra una notificación de éxito.

### CA-HU-026.3 — Control de accesos y persistencia
- **Dado que** la acción se completa satisfactoriamente,
- **cuando** se consulta el módulo correspondiente,
- **entonces** la información debe reflejarse de forma consistente en el estado global de la aplicación (React Context API, `AppContext`) y en la interfaz.
