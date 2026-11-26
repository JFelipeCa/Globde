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
| **Estado** | Implementado en código |
| **HUs Asociadas** | HU-29, HU-30, HU-31, HU-32 |
| **Fecha** | Febrero 2026 |

Los reportes y la exportación CSV están implementados. La descarga se genera en
el frontend para los reportes de ingresos/facturación, citas y clientes/puntos;
no hay exportación XLSX.

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
2. El frontend consulta los endpoints de `/api/reportes` y `/api/facturas`.
3. La base de datos calcula los agregados agrupando los registros disponibles.
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
| `GET` | `/api/reportes/ingresos` | Sí (Admin) | Retorna ingresos por período |
| `GET` | `/api/reportes/ingresos/barberos` | Sí (Admin) | Desglosa ingresos por barbero |
| `GET` | `/api/reportes/servicios-populares` | Sí (Admin) | Ranking de servicios |
| `GET` | `/api/reportes/citas` | Sí (Admin) | Consulta citas reportables |
| `GET` | `/api/reportes/ocupacion` | Sí (Admin) | Consulta ocupación |
| `GET` | `/api/reportes/fidelizacion` | Sí (Admin) | Consulta fidelización |

---

## Reglas de Negocio

- **RN-016.1**: Solo los usuarios con rol Administrador (`id_rol = 1`) pueden visualizar datos consolidados de facturación.
- **RN-016.2**: Los reportes solo contabilizan citas en estado `'Completada'`.
