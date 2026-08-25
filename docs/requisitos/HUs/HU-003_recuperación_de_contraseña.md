# HU-003 — Recuperación de contraseña

<!--
  ¿Qué? Historia de usuario que describe el requerimiento de recuperación de contraseña.
  ¿Para qué? Formalizar la necesidad del usuario con contraseña olvidada en el sistema GLOBDE.
  ¿Impacto? Garantiza la correcta implementación de la funcionalidad y su trazabilidad con RF-002.
-->

---

## Identificación

| Campo | Valor |
| :--- | :--- |
| **ID** | HU-003 |
| **Título** | Recuperación de contraseña |
| **Módulo** | Autenticación |
| **Prioridad** | Alta |
| **Estado** | Implementada |
| **RF Asociados** | RF-002 |

---

## Historia

**Como** usuario con contraseña olvidada,  
**quiero** solicitar un enlace seguro a mi correo,  
**para** restablecer mi clave de acceso de manera autónoma.

---

## Criterios de Aceptación

### CA-HU-003.1 — Validación de datos y precondiciones
- **Dado que** el usuario con contraseña olvidada se encuentra en la vista de autenticación,
- **cuando** intenta realizar la acción con datos inválidos o incompletos,
- **entonces** el sistema debe mostrar mensajes de error descriptivos impidiendo la acción.

### CA-HU-003.2 — Flujo exitoso de operación
- **Dado que** se han ingresado los datos válidos requeridos,
- **cuando** el usuario con contraseña olvidada confirma la operación,
- **entonces** el sistema procesa la solicitud, actualiza el estado en la base de datos MySQL y muestra una notificación de éxito.

### CA-HU-003.3 — Control de accesos y persistencia
- **Dado que** la acción se completa satisfactoriamente,
- **cuando** se consulta el módulo correspondiente,
- **entonces** la información debe reflejarse de forma consistente en el estado global de la aplicación (React Context API, `AppContext`) y en la interfaz.
