# HU-025 — Configuración de puntos por servicio

<!--
  ¿Qué? Historia de usuario que describe el requerimiento de configuración de puntos por servicio.
  ¿Para qué? Formalizar la necesidad del administrador en el sistema GLOBDE.
  ¿Impacto? Garantiza la correcta implementación de la funcionalidad y su trazabilidad con RF-014.
-->

---

## Identificación

| Campo | Valor |
| :--- | :--- |
| **ID** | HU-025 |
| **Título** | Configuración de puntos por servicio |
| **Módulo** | Fidelización |
| **Prioridad** | Media |
| **Estado** | Implementada |
| **RF Asociados** | RF-014 |

---

## Historia

**Como** administrador,  
**quiero** definir la cantidad de puntos que otorga cada servicio,  
**para** incentivar servicios estratégicos.

---

## Criterios de Aceptación

### CA-HU-025.1 — Validación de datos y precondiciones
- **Dado que** el administrador se encuentra en la vista de fidelización,
- **cuando** intenta realizar la acción con datos inválidos o incompletos,
- **entonces** el sistema debe mostrar mensajes de error descriptivos impidiendo la acción.

### CA-HU-025.2 — Flujo exitoso de operación
- **Dado que** se han ingresado los datos válidos requeridos,
- **cuando** el administrador confirma la operación,
- **entonces** el sistema procesa la solicitud, actualiza el estado en la base de datos MySQL y muestra una notificación de éxito.

### CA-HU-025.3 — Control de accesos y persistencia
- **Dado que** la acción se completa satisfactoriamente,
- **cuando** se consulta el módulo correspondiente,
- **entonces** la información debe reflejarse de forma consistente en el estado global de la aplicación (React Context API, `AppContext`) y en la interfaz.
