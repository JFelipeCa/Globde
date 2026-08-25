# RF-016 — Reportes Financieros, Estadísticas y Exportación

<!--
  ¿Qué? Requisito funcional para la generación de métricas de negocio, ingresos por barbero, ranking de servicios y exportación.
  ¿Para qué? Proveer inteligencia de negocio y trazabilidad contable para la toma de decisiones del administrador.
  ¿Impacto? Permite auditar ingresos, calcular comisiones de barberos y definir estrategias comerciales informadas.
-->

---

## Identificación

| Campo | Valor |
| :--- | :--- |
| **ID** | RF-016 |
| **Nombre** | Reportes Financieros, Estadísticas y Exportación |
| **Módulo** | Reportes y Analítica |
| **Prioridad** | Alta |
| **Estado** | Parcial |
| **HUs Asociadas** | HU-29, HU-30, HU-31, HU-32, HU-33 |
| **Fecha** | Febrero 2026 |

> [!WARNING]
> **Estado real (verificado contra el código, agosto 2026): parcial.**
> Implementados los reportes de ingresos, ocupación, servicios populares,
> desempeño por barbero y fidelización. Pendiente la **exportación a CSV/Excel**
> (HU-032): no hay endpoint de descarga ni librería de generación de archivos.

---

## Descripción

El sistema debe proveer al Administrador un módulo de reportería analítica con gráficos y tablas que resuman:
1. Total de ingresos brutos por período (mensual/anual).
2. Ranking de los servicios más solicitados.
3. Desempeño y volumen de servicios completados por cada barbero.
4. Exportación de los datos a formatos de hoja de cálculo (Excel/CSV).
5. Monitoreo de solicitudes en lista de espera.

---

## Entradas (Filtros de Reporte)

| Parámetro | Tipo | Obligatorio | Descripción |
| :--- | :--- | :--- | :--- |
| `anio` | Entero | Sí | Año del reporte (ej. 2026) |
| `mes` | Entero | Sí | Mes del reporte (1 a 12) |
| `id_barbero` | Entero | No | Filtro por barbero específico |

---

## Proceso

1. El administrador ingresa a `/reportes` y selecciona el período a auditar.
2. El frontend ejecuta `GET /api/vistas/ingresos` y `GET /api/procedimientos/reporte/{anio}/{mes}`.
3. La base de datos calcula los agregados mediante `SUM(subtotal)` y `COUNT(id_cita)` agrupando por barbero y servicio.
4. La UI renderiza tarjetas con KPIs (Ingresos Totales, Citas Completadas, Ticket Promedio) y tablas interactivas.

---

## Salidas

| Escenario | Código HTTP | Respuesta JSON |
| :--- | :--- | :--- |
| Reporte Generado | 200 OK | `[{"barbero": "Carlos Perez", "total_citas": 45, "ingresos_generados": 1250000.0, "promedio_calificacion": 4.9}]` |

---

## Endpoints Asociados

| Método | Ruta | Auth Requerida | Descripción |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/vistas/ingresos` | Sí (Admin) | Retorna consolidado de ingresos por profesional |
| `GET` | `/api/procedimientos/reporte/{anio}/{mes}` | Sí (Admin) | Reporte analítico por año y mes |

---

## Reglas de Negocio

- **RN-016.1**: Solo los usuarios con rol Administrador (`id_rol = 1`) pueden visualizar datos consolidados de facturación.
- **RN-016.2**: Los reportes solo contabilizan citas en estado `'Completada'`.
