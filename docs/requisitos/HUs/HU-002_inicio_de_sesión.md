# HU-002 — Inicio de sesión

<!--
  ¿Qué? Historia de usuario que describe el requerimiento de inicio de sesión.
  ¿Para qué? Formalizar la necesidad del usuario registrado en el sistema GLOBDE.
  ¿Impacto? Garantiza la correcta implementación de la funcionalidad y su trazabilidad con RF-001.
-->

---

## Identificación

| Campo | Valor |
| :--- | :--- |
| **ID** | HU-002 |
| **Título** | Inicio de sesión |
| **Módulo** | Autenticación |
| **Prioridad** | Alta |
| **Estado** | Implementada |
| **RF Asociados** | RF-001 |

---

## Historia

**Como** usuario registrado,  
**quiero** iniciar sesión con mi correo y contraseña,  
**para** acceder a las funcionalidades correspondientes a mi rol.

---

## Criterios de Aceptación

### CA-HU-002.1 — Validación de datos y precondiciones
- **Dado que** el usuario registrado se encuentra en la vista de autenticación,
- **cuando** intenta realizar la acción con datos inválidos o incompletos,
- **entonces** el sistema debe mostrar mensajes de error descriptivos impidiendo la acción.

### CA-HU-002.2 — Flujo exitoso de operación
- **Dado que** se han ingresado los datos válidos requeridos,
- **cuando** el usuario registrado confirma la operación,
- **entonces** el sistema procesa la solicitud, actualiza el estado en la base de datos MySQL y muestra una notificación de éxito.

### CA-HU-002.3 — Control de accesos y persistencia
- **Dado que** la acción se completa satisfactoriamente,
- **cuando** se consulta el módulo correspondiente,
- **entonces** la información debe reflejarse de forma consistente en el estado global de la aplicación (React Context API, `AppContext`) y en la interfaz.
