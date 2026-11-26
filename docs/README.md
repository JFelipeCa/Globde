<!--
  ¿Qué? Índice central de la documentación funcional, técnica y operativa de GLOBDE.
  ¿Para qué? Conectar requisitos, arquitectura, operación y evidencias de calidad.
  ¿Impacto? Permite revisar el estado real del proyecto sin depender de documentos obsoletos.
-->

# 📚 Documentación de GLOBDE

Índice general de toda la documentación del proyecto. Todo lo que hay aquí describe
el estado **real** del código en la rama de trabajo, no el plan inicial.

[⬅ Volver al README principal](../README.md)

---

## 📌 Estado y evolución

El [estado general del proyecto](estado-proyecto.md) resume las capacidades
implementadas, resultados de verificaciones y próximos pasos. Los documentos
específicos de cada área se encuentran enlazados en las secciones siguientes.

---

## 🚀 Puesta en marcha

| Documento | Qué contiene |
| :--- | :--- |
| [`setup/con-docker.md`](setup/con-docker.md) | **Vía recomendada.** Levanta frontend y backend con Docker Compose; conecta a TiDB Cloud remota mediante `.env` |
| [`setup/sin-docker.md`](setup/sin-docker.md) | Instalación manual: MySQL local, `uv sync`, `alembic upgrade head`, `pnpm install` |
| [`../database/README_DB.md`](../database/README_DB.md) | Cómo se gestiona el esquema; TiDB Cloud es remota y no se inicia con Docker |
| [`../backend/alembic/README.md`](../backend/alembic/README.md) | Uso diario de Alembic, crear migraciones y detalles del motor compatible con MySQL/TiDB |

---

## 🏗️ Referencia técnica

| Documento | Qué contiene |
| :--- | :--- |
| [`referencia-tecnica/architecture.md`](referencia-tecnica/architecture.md) | Arquitectura en 3 capas, flujo de una petición, estructura real de carpetas, decisiones de diseño |
| [`referencia-tecnica/api-endpoints.md`](referencia-tecnica/api-endpoints.md) | Catálogo de OpenAPI: 129 operaciones por defecto y 131 con compatibilidad v1 |
| [`referencia-tecnica/database-schema.md`](referencia-tecnica/database-schema.md) | Diccionario de datos: **26 tablas y 4 vistas** según las migraciones |
| [`referencia-tecnica/design-system.md`](referencia-tecnica/design-system.md) | Tokens de Tailwind v4, paleta, clases propias y deuda técnica de estilos |
| [`referencia-tecnica/alternativas-backend.md`](referencia-tecnica/alternativas-backend.md) | Comparación cualitativa de FastAPI, Django REST Framework, Flask y Express; selección actual de FastAPI |

---

## 📋 Requisitos

| Documento | Qué contiene |
| :--- | :--- |
| [`requisitos.md`](requisitos.md) | **Índice principal**: 33 Historias de Usuario ↔ 33 Casos de Uso, por módulo |
| [`restricciones.md`](restricciones.md) | Resumen de restricciones técnicas, de hardware, organizacionales, de seguridad y diseño |
| [`requisitos/restricciones.md`](requisitos/restricciones.md) | Versión detallada de las restricciones, con justificación |

### Historias de Usuario y Casos de Uso

- [`requisitos/HUs/`](requisitos/HUs/) — 33 historias de usuario (`HU-001` … `HU-033`).
- [`requisitos/CUs/`](requisitos/CUs/) — 33 casos de uso (`CU-01` … `CU-33`).

Ambas colecciones están enlazadas una a una desde [`requisitos.md`](requisitos.md).

### Requisitos funcionales

- [`requisitos/RFs/`](requisitos/RFs/) — **16 requisitos funcionales** (`RF-001` … `RF-016`),
  agrupados por módulo. Cada uno declara módulo, prioridad, HUs asociadas y reglas de negocio.

La trazabilidad completa RF → HU → CU está en
[`requisitos/matriz-trazabilidad.md`](requisitos/matriz-trazabilidad.md).

La colección vigente usa una sola serie de 16 requisitos funcionales agrupados.
Las propuestas de requisitos anteriores no forman parte del alcance activo.

### Requisitos no funcionales

[`requisitos/RNFs/`](requisitos/RNFs/) — **6 requisitos no funcionales**:

| RNF | Archivo |
| :--- | :--- |
| RNF-001 | [`RNF-001_seguridad.md`](requisitos/RNFs/RNF-001_seguridad.md) |
| RNF-002 | [`RNF-002_rendimiento.md`](requisitos/RNFs/RNF-002_rendimiento.md) |
| RNF-003 | [`RNF-003_usabilidad_ux_ui.md`](requisitos/RNFs/RNF-003_usabilidad_ux_ui.md) |
| RNF-004 | [`RNF-004_accesibilidad.md`](requisitos/RNFs/RNF-004_accesibilidad.md) |
| RNF-005 | [`RNF-005_mantenibilidad_calidad.md`](requisitos/RNFs/RNF-005_mantenibilidad_calidad.md) |
| RNF-006 | [`RNF-006_compatibilidad_portabilidad.md`](requisitos/RNFs/RNF-006_compatibilidad_portabilidad.md) |

Cada RNF tiene una ficha vigente en esta carpeta.

---

## 🧪 Pruebas y calidad

| Documento | Qué contiene |
| :--- | :--- |
| [`pruebas/plan-pruebas.md`](pruebas/plan-pruebas.md) | Alcance, niveles, criterios de entrada/salida y uso de base aislada |
| [`pruebas/informe-ejecucion.md`](pruebas/informe-ejecucion.md) | Resultados ejecutados, revisión visual reportada, evidencias seleccionadas y verificaciones pendientes |

---

## 🎓 Conceptos y buenas prácticas

Material de apoyo formativo, no específico de GLOBDE:

| Documento | Qué contiene |
| :--- | :--- |
| [`conceptos/owasp-top-10.md`](conceptos/owasp-top-10.md) | Riesgos OWASP y cómo se mitigan en el proyecto |
| [`conceptos/accesibilidad-aria-wcag.md`](conceptos/accesibilidad-aria-wcag.md) | Pautas WCAG y atributos ARIA |
| [`conceptos/patrones-arquitectonicos.md`](conceptos/patrones-arquitectonicos.md) | Patrones de arquitectura aplicables |

---

## 📎 Anexos

Entregables formativos en formato binario (no editables desde git):

| Archivo | Contenido |
| :--- | :--- |
| `anexos/PROPUESTA_TECNICA.pdf` | Propuesta técnica del proyecto |
| `anexos/Globde_Casos_de_Uso_V2.docx.pdf` | Casos de uso, versión 2 |
| `anexos/Globde_Diagramas_de_Uso_V2.docx.pdf` | Diagramas de casos de uso, versión 2 |
| `anexos/Globde_HU_V2.xlsx` | Matriz de historias de usuario, versión 2 |

---

## 🔧 Estado de la documentación

| Aspecto | Estado |
| :--- | :--- |
| Requisitos funcionales | Revisados contra el código; ver estados y límites en la matriz |
| Esquema de base de datos | Actualizado contra las revisiones vigentes de Alembic |
| Catálogo de endpoints | Conteos y rutas contrastados con OpenAPI; `/docs` es la fuente contractual |
| Arquitectura | Describe la separación real router/service/db y el frontend actual |
| Calidad | Reporta ejecuciones parciales; la integración aún requiere ambiente MySQL aislado |
