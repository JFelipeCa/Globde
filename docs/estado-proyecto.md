<!--
  ¿Qué? Resume las capacidades, evidencias técnicas y trabajo pendiente de GLOBDE.
  ¿Para qué? Presentar una visión clara del estado actual del producto y orientar su evolución.
  ¿Impacto? Ayuda a priorizar validaciones y evita confundir implementación con aceptación completa.
-->

# Estado general del proyecto — GLOBDE

> **Corte de información:** 26 de noviembre de 2026<br>
> **Alcance:** revisión del código, las migraciones, la documentación, las verificaciones locales y la evidencia compartida por el equipo.

GLOBDE es una aplicación web para administrar reservas, barberos, clientes,
servicios y fidelización. El frontend React se comunica con una API FastAPI;
los datos del entorno del equipo se almacenan en una instancia **TiDB Cloud
remota**. Docker inicia el frontend y el backend, no la base de datos.

## Capacidades implementadas

- Registro e inicio de sesión con JWT, roles de administrador, barbero y cliente.
- Catálogo, disponibilidad, reservas, agenda, cancelaciones y lista de espera.
- Horarios generales y cierres del negocio.
- Historial, reseñas, puntos de fidelización, reportes y exportación CSV.
- API REST documentada con OpenAPI; 129 operaciones por defecto y 131 con las
  rutas opcionales de compatibilidad v1.
- Migraciones Alembic para el esquema vigente de 26 tablas y 4 vistas.

La [matriz de trazabilidad](requisitos/matriz-trazabilidad.md) identifica una
implementación en código para las 33 historias de usuario. Esto describe el
alcance implementado; no significa que cada flujo haya pasado pruebas de
aceptación integrales. La exportación disponible es CSV, no XLSX. El envío
efectivo de correo depende de la configuración SMTP.

## Estado de validación y seguimiento

| Área | Estado | Evidencia y alcance / siguiente paso |
|---|---|---|
| Documentación de producto y modelos | **Documentada** | Requisitos, casos de uso, arquitectura, modelo ER, clases y diccionario de datos están en el [índice documental](README.md). |
| Metodología ágil | **Documentada parcialmente** | Organizar en un solo lugar las evidencias disponibles de backlog, sprints, estimaciones y retrospectivas. |
| Feedback y distribución del trabajo | **Verificado por el equipo** | El equipo confirma que revisó feedback, distribución y asignación de tareas. |
| Backend e inicialización | **Verificado** | `/api/health` y `/docs` respondieron HTTP 200 en local; las pruebas y CI pasaron. El correo se sigue por separado. |
| Variables y despliegue | **Verificado por el equipo** | El equipo confirmó con las capturas compartidas que las variables y el despliegue de frontend/backend funcionan con el entorno TiDB. |
| Arquitectura | **Documentada** | El diagrama de componentes y flujos está en la [referencia de arquitectura](referencia-tecnica/architecture.md). |
| Plan de pruebas | **Disponible** | Define alcance, niveles, separación de entornos y procedimientos seguros en el [plan de pruebas](pruebas/plan-pruebas.md). |
| Pruebas automatizadas | **160 aprobadas; 0 omitidas** | 67 unitarias y 93 de integración en MySQL 8.0.46 desechable; cobertura total registrada: 69 %. |
| Ejecución y defectos | **Registrados; sin defectos abiertos conocidos** | El [informe de ejecución](pruebas/informe-ejecucion.md) registra FE-001 y FE-002 con severidad y estado corregido. [#21](https://github.com/JFelipeCa/Globde/issues/21) y [#31](https://github.com/JFelipeCa/Globde/issues/31) son mejoras de producto, no defectos. |
| Frontend y experiencia visual | **Verificado por el equipo** | TypeScript, ESLint y build aprobados; revisión visual manual completada y las imágenes de avatar cargan correctamente según el equipo. |
| README, API y backend | **Documentados** | Esta guía, la [referencia API](referencia-tecnica/api-endpoints.md) y la documentación técnica describen el sistema. |
| Ramas y colaboración en Git | **En integración** | El CI está verde en `docs/project-documentation`; integrar a `develop`/`main` y confirmar allí. Revisar reglas y protecciones de ramas. |
| Alternativas tecnológicas y deuda técnica | **Completadas según el alcance acordado** | Se comparan FastAPI, Django REST Framework, Flask y Express; la deuda técnica está priorizada. |
| Correo SMTP | **Pendiente: autenticación y recepción** | Gmail cerró la conexión durante AUTH tanto en 587 como en 465. No se envió ningún correo; un compañero revisará la cuenta y luego se confirmará la recepción de una prueba. |
| TiDB Cloud | **Operativa según el equipo** | La aplicación carga usuarios y datos; las pruebas automatizadas se ejecutaron en MySQL desechable. Una validación independiente de TiDB requeriría una instancia aislada. |
| Rendimiento web | **Diagnóstico conservado** | Lighthouse corresponde al entorno de desarrollo y no se presenta como métrica de producción; no hay otra medición comprometida actualmente. |

El detalle de resultados y defectos encontrados está en el
[informe de ejecución](pruebas/informe-ejecucion.md); el procedimiento
reproducible, en el [plan de pruebas](pruebas/plan-pruebas.md).

## Documentación del producto

| Área | Referencias |
|---|---|
| Necesidades y alcance | [Requisitos del sistema](requisitos.md), [matriz RF → HU → CU](requisitos/matriz-trazabilidad.md), [requisitos funcionales](requisitos/RFs/) e [historias de usuario](requisitos/HUs/). |
| Flujos y diseño | [Casos de uso](requisitos/CUs/), [arquitectura](referencia-tecnica/architecture.md) y [modelo ER, clases y diccionario de datos](referencia-tecnica/database-schema.md). |
| API, interfaz y backend | [Referencia de API REST](referencia-tecnica/api-endpoints.md), [sistema de diseño](referencia-tecnica/design-system.md) y [evaluación de alternativas backend](referencia-tecnica/alternativas-backend.md). |
| Operación | [Guía Docker](setup/con-docker.md), [base de datos](../database/README_DB.md) y [migraciones Alembic](../backend/alembic/README.md). |
| Calidad | [Plan de pruebas](pruebas/plan-pruebas.md) e [informe de ejecución](pruebas/informe-ejecucion.md). |

## Próximas validaciones y decisiones

1. **Integración de ramas:** integrar los cambios desde `docs/project-documentation`
   a `develop`/`main` según el flujo acordado y confirmar CI verde en la rama
   destino. El CI actual usa MySQL efímero; no valida TiDB compartida.
2. **Correo:** el compañero revisará la autenticación de la cuenta SMTP sin
   compartir credenciales; después, confirmar la recepción de un mensaje de
   prueba dirigido a una cuenta autorizada.
3. **Datos de despliegue:** definir cómo separar las semillas de prueba antes
   de desplegar con datos reales; actualmente forman parte de la cadena de
   migraciones aplicada con `upgrade head`.
4. **TiDB:** si se requiere una verificación técnica independiente, ejecutar
   pruebas de integración solo en una instancia aislada, no en la base
   compartida.
5. **Metodología ágil:** reunir en la documentación las evidencias disponibles
   de backlog, sprints, estimaciones y retrospectivas. Las revisiones de PR #23
   y las reglas de ramas también deben comprobarse en GitHub.
6. **Seguimiento de defectos:** si se detectan nuevos defectos, registrarlos
   con severidad y estado; mantener separadas las incidencias de las mejoras
   del backlog.

## Riesgos y límites conocidos

- La base remota compartida puede ser modificada por las migraciones al iniciar
  el backend; revisar cada cambio de esquema y usar credenciales autorizadas.
- Las pruebas de integración escriben datos y deben ejecutarse solo en una base
  aislada.
- La UI contiene colores literales y reglas CSS de compatibilidad pendientes de
  normalización gradual.
- El workflow de CI valida migraciones en MySQL 8.0; el último run verde está
  en `docs/project-documentation`. Falta confirmar CI tras integrar los cambios
  a `develop`/`main`. La validación en una instancia TiDB aislada también queda
  pendiente.
