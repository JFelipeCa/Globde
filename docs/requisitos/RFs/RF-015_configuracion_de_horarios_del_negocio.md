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
| **Estado** | Parcial |
| **HUs Asociadas** | HU-27, HU-28 |
| **Fecha** | Febrero 2026 |

> [!WARNING]
> **Estado real (verificado contra el código, agosto 2026): parcial.**
> Implementado el horario **por barbero** (`horarios_barbero`, `bloqueos_agenda`).
> Pendiente el horario **comercial global** del negocio (HU-027) y los cierres de
> día completo por festivo (HU-028).

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
| `GET` | `/api/datos` | No | Retorna configuración general y catálogos |
