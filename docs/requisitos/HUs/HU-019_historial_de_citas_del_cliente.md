# HU-019 — Historial de citas del cliente

<!--
  ¿Qué? Historia de usuario que describe el requerimiento de historial de citas del cliente.
  ¿Para qué? Formalizar la necesidad del cliente en el sistema GLOBDE.
  ¿Impacto? Garantiza la correcta implementación de la funcionalidad y su trazabilidad con RF-012.
-->

---

## Identificación

| Campo | Valor |
| :--- | :--- |
| **ID** | HU-019 |
| **Título** | Historial de citas del cliente |
| **Módulo** | Clientes |
| **Prioridad** | Media |
| **Estado** | Implementada |
| **RF Asociados** | RF-012 |

---

## Historia

**Como** cliente,  
**quiero** consultar el histórico de todas mis visitas y pagos,  
**para** llevar control de mis servicios.

---

## Criterios de Aceptación

### CA-HU-019.1 — Validación de datos y precondiciones
- **Dado que** el cliente se encuentra en la vista de clientes,
- **cuando** intenta realizar la acción con datos inválidos o incompletos,
- **entonces** el sistema debe mostrar mensajes de error descriptivos impidiendo la acción.

### CA-HU-019.2 — Flujo exitoso de operación
- **Dado que** se han ingresado los datos válidos requeridos,
- **cuando** el cliente confirma la operación,
- **entonces** el sistema procesa la solicitud, actualiza el estado en la base de datos MySQL y muestra una notificación de éxito.

### CA-HU-019.3 — Control de accesos y persistencia
- **Dado que** la acción se completa satisfactoriamente,
- **cuando** se consulta el módulo correspondiente,
- **entonces** la información debe reflejarse de forma consistente en el estado global de la aplicación (React Context API, `AppContext`) y en la interfaz.
