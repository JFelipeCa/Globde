# HU-032 — Exportación de reportes a Excel/CSV

<!--
  ¿Qué? Historia de usuario que describe el requerimiento de exportación de reportes a excel/csv.
  ¿Para qué? Formalizar la necesidad del administrador en el sistema GLOBDE.
  ¿Impacto? Garantiza la correcta implementación de la funcionalidad y su trazabilidad con RF-016.
-->

---

## Identificación

| Campo | Valor |
| :--- | :--- |
| **ID** | HU-032 |
| **Título** | Exportación de reportes a Excel/CSV |
| **Módulo** | Reportes |
| **Prioridad** | Media |
| **Estado** | Implementada para CSV |
| **RF Asociados** | RF-016 |

El frontend genera y descarga reportes CSV de ingresos/facturación, citas y
clientes/puntos desde `AppContext`. No se encontró exportación a formato XLSX;
el alcance disponible es CSV en el cliente, no un endpoint de descarga en el backend.

---

## Historia

**Como** administrador,  
**quiero** descargar reportes tabulares,  
**para** realizar análisis contables externos.

---

## Criterios de Aceptación

### CA-HU-032.1 — Validación de datos y precondiciones
- **Dado que** el administrador se encuentra en la vista de reportes,
- **cuando** intenta realizar la acción con datos inválidos o incompletos,
- **entonces** el sistema debe mostrar mensajes de error descriptivos impidiendo la acción.

### CA-HU-032.2 — Flujo exitoso de operación
- **Dado que** se han ingresado los datos válidos requeridos,
- **cuando** el administrador confirma la operación,
- **entonces** el sistema procesa la solicitud, actualiza el estado en la base de datos MySQL y muestra una notificación de éxito.

### CA-HU-032.3 — Control de accesos y persistencia
- **Dado que** la acción se completa satisfactoriamente,
- **cuando** se consulta el módulo correspondiente,
- **entonces** la información debe reflejarse de forma consistente en el estado global de la aplicación (React Context API, `AppContext`) y en la interfaz.
