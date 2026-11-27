# HU-033 — Gestión de lista de espera

<!--
  ¿Qué? Historia de usuario que describe el requerimiento de gestión de lista de espera.
  ¿Para qué? Formalizar la necesidad del cliente y administrador en el sistema GLOBDE.
  ¿Impacto? Garantiza la correcta implementación de la funcionalidad y su trazabilidad con RF-016.
-->

---

## Identificación

| Campo | Valor |
| :--- | :--- |
| **ID** | HU-033 |
| **Título** | Gestión de lista de espera |
| **Módulo** | Citas |
| **Prioridad** | Baja |
| **Estado** | Implementada en código |
| **RF Asociados** | RF-007 |

La funcionalidad tiene persistencia en `lista_espera`, endpoints en
`/api/lista-espera`, vistas de cliente/administrador y procesamiento periódico
de ofertas compatibles. Los invitados solicitan un código y confirman su
solicitud tras verificar el correo.

---

## Historia

**Como** cliente y administrador,  
**quiero** inscribir solicitudes en lista de espera cuando la agenda esté llena,  
**para** cubrir cancelaciones de último momento.

---

## Criterios de Aceptación

### CA-HU-033.1 — Validación de datos y precondiciones
- **Dado que** el cliente y administrador se encuentra en la vista de citas,
- **cuando** intenta realizar la acción con datos inválidos o incompletos,
- **entonces** el sistema debe mostrar mensajes de error descriptivos impidiendo la acción.

### CA-HU-033.2 — Flujo exitoso de operación
- **Dado que** se han ingresado los datos válidos requeridos,
- **cuando** el cliente y administrador confirma la operación,
- **entonces** el sistema procesa la solicitud, actualiza el estado en la base de datos MySQL y muestra una notificación de éxito.

### CA-HU-033.3 — Control de accesos y persistencia
- **Dado que** la acción se completa satisfactoriamente,
- **cuando** se consulta el módulo correspondiente,
- **entonces** la información debe reflejarse de forma consistente en el estado global de la aplicación (React Context API, `AppContext`) y en la interfaz.
