# HU-023 — Acumulación automática de puntos

<!--
  ¿Qué? Historia de usuario que describe el requerimiento de acumulación automática de puntos.
  ¿Para qué? Formalizar la necesidad del cliente en el sistema GLOBDE.
  ¿Impacto? Garantiza la correcta implementación de la funcionalidad y su trazabilidad con RF-014.
-->

---

## Identificación

| Campo | Valor |
| :--- | :--- |
| **ID** | HU-023 |
| **Título** | Acumulación automática de puntos |
| **Módulo** | Fidelización |
| **Prioridad** | Alta |
| **Estado** | Implementada |
| **RF Asociados** | RF-014 |

---

## Historia

**Como** cliente,  
**quiero** ganar puntos cada vez que completo un servicio,  
**para** acumular saldo de lealtad.

---

## Criterios de Aceptación

### CA-HU-023.1 — Validación de datos y precondiciones
- **Dado que** el cliente se encuentra en la vista de fidelización,
- **cuando** intenta realizar la acción con datos inválidos o incompletos,
- **entonces** el sistema debe mostrar mensajes de error descriptivos impidiendo la acción.

### CA-HU-023.2 — Flujo exitoso de operación
- **Dado que** se han ingresado los datos válidos requeridos,
- **cuando** el cliente confirma la operación,
- **entonces** el sistema procesa la solicitud, actualiza el estado en la base de datos MySQL y muestra una notificación de éxito.

### CA-HU-023.3 — Control de accesos y persistencia
- **Dado que** la acción se completa satisfactoriamente,
- **cuando** se consulta el módulo correspondiente,
- **entonces** la información debe reflejarse de forma consistente en el estado global de la aplicación (React Context API, `AppContext`) y en la interfaz.
