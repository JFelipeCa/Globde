# RF-015 — Configuración de Horarios del Negocio y Festivos

<!--
  ¿Qué? Requisito funcional para parametrizar los horarios de apertura/cierre del salón y registrar días no laborales.
  ¿Para qué? Evitar que se agenden citas en días festivos, vacaciones o fuera del horario comercial.
  ¿Impacto? Asegura que la agenda digital refleje con exactitud la disponibilidad real de las instalaciones.
-->

---

## Identificación

| Campo | Valor |
| :--- | :--- |
| **ID** | RF-015 |
| **Nombre** | Configuración de Horarios del Negocio y Festivos |
| **Módulo** | Configuración del Sistema |
| **Prioridad** | Media |
| **Estado** | Implementado en código |
| **HUs Asociadas** | HU-27, HU-28 |
| **Fecha** | Febrero 2026 |

El backend persiste horarios globales y cierres de día completo en
`horarios_negocio` y `cierres_negocio`. El panel administrativo permite
gestionarlos y el flujo de disponibilidad respeta las fechas cerradas.

---

## Descripción

El sistema debe permitir configurar la franja horaria general de atención (hora de inicio y hora de fin por día de la semana) y registrar fechas de cierre especial o feriados, bloqueando el calendario para reservas en dichos períodos.

---

## Entradas

| Campo | Tipo | Obligatorio | Validaciones |
| :--- | :--- | :--- | :--- |
| `dia_semana` | Entero / Texto | Sí | Lunes a Domingo |
| `hora_apertura` | Hora (HH:MM) | Sí | Formato de 24 horas |
| `hora_cierre` | Hora (HH:MM) | Sí | Mayor a la hora de apertura |
| `fecha_festivo` | Fecha (YYYY-MM-DD) | Sí | Fecha específica no laboral |

---

## Proceso

1. El administrador accede a la sección de Configuración de Horarios en su panel.
2. Define las horas hábiles o añade un día festivo a la lista de bloqueos.
3. El frontend y backend consultan esta parametrización antes de habilitar slots en el agendamiento.

---

## Endpoints Asociados

| Método | Ruta | Auth Requerida | Descripción |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/agenda/horarios-negocio` | No | Consulta horario semanal |
| `PUT` | `/api/agenda/horarios-negocio` | Sí (Admin) | Actualiza horario semanal |
| `GET` | `/api/agenda/cierres` | No | Consulta cierres especiales |
| `POST` | `/api/agenda/cierres` | Sí (Admin) | Registra cierre de día |
| `DELETE` | `/api/agenda/cierres/{id_cierre}` | Sí (Admin) | Elimina cierre |
