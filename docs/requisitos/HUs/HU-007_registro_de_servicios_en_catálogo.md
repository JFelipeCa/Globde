# HU-007 — Registro de servicios en catálogo

<!--
  ¿Qué? Historia de usuario que describe el requerimiento de registro de servicios en catálogo.
  ¿Para qué? Formalizar la necesidad del administrador en el sistema GLOBDE.
  ¿Impacto? Garantiza la correcta implementación de la funcionalidad y su trazabilidad con RF-006.
-->

---

## Identificación

| Campo | Valor |
| :--- | :--- |
| **ID** | HU-007 |
| **Título** | Registro de servicios en catálogo |
| **Módulo** | Servicios |
| **Prioridad** | Alta |
| **Estado** | Implementada |
| **RF Asociados** | RF-006 |

---

## Historia

**Como** administrador,  
**quiero** crear nuevos servicios con nombre, precio, duración y puntos,  
**para** ofrecerlos a los clientes en la plataforma.

---

## Criterios de Aceptación

### CA-HU-007.1 — Validación de datos y precondiciones
- **Dado que** el administrador se encuentra en la vista de servicios,
- **cuando** intenta realizar la acción con datos inválidos o incompletos,
- **entonces** el sistema debe mostrar mensajes de error descriptivos impidiendo la acción.

### CA-HU-007.2 — Flujo exitoso de operación
- **Dado que** se han ingresado los datos válidos requeridos,
- **cuando** el administrador confirma la operación,
- **entonces** el sistema procesa la solicitud, actualiza el estado en la base de datos MySQL y muestra una notificación de éxito.

### CA-HU-007.3 — Control de accesos y persistencia
- **Dado que** la acción se completa satisfactoriamente,
- **cuando** se consulta el módulo correspondiente,
- **entonces** la información debe reflejarse de forma consistente en el estado global de la aplicación (React Context API, `AppContext`) y en la interfaz.
