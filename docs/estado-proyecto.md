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

## Verificaciones registradas

| Área | Resultado registrado | Alcance |
|---|---|---|
| Pruebas unitarias backend | 67 aprobadas | Ejecutadas localmente sin conexión a la base de datos. |
| Suite backend completa | 160 aprobadas, 0 omitidas; cobertura 69% | Ejecutada el 26 de noviembre de 2026 contra MySQL 8.0.46 desechable, con migraciones y semillas. |
| CI GitHub Actions | **Aprobado** en `1f48d06` | [Run #45907047850](https://github.com/JFelipeCa/Globde/actions/runs/45907047850): jobs de backend y frontend verdes; incluye migraciones, 160 pruebas, tipos, build y auditorías configuradas. En frontend queda una alerta moderada bajo el umbral de bloqueo. |
| Migraciones | `upgrade` y `downgrade` aprobados | La reversión a `base` dejó cero objetos; después se reaplicó hasta `h8b9c0d1e2f3`. |
| Frontend | TypeScript, ESLint, build y preview HTTP aprobados | El equipo reporta revisión visual 10/10; no hay runner E2E configurado. |
| OpenAPI | 129 operaciones por defecto; 131 con compatibilidad v1 | Contrato generado desde la aplicación. |
| Inicio de API y persistencia | `/api/health` y `/docs`: HTTP 200 | Arranque local de Uvicorn con conexión a la base MySQL desechable. |
| TiDB Cloud | El equipo reporta que la aplicación carga usuarios y datos | Se adjuntan capturas del clúster activo y una consulta agregada que contó 11 usuarios en 9 ms; no es una medición de la API ni reemplaza pruebas aisladas. |
| Correo SMTP | **Pendiente: autenticación y recepción** | La comprobación autorizada conectó con Gmail y negoció TLS, pero el servidor cerró la conexión durante AUTH tanto en 587 como en 465. No se envió ningún correo. Un compañero revisará la cuenta/credencial SMTP y luego se confirmará la recepción de un mensaje de prueba. |
| Rendimiento web | Diagnóstico de carga en curso | Se conservaron las imágenes originales y se ajustó la prioridad de carga. Las mediciones realizadas en desarrollo y las siguientes validaciones están contextualizadas en el [informe técnico](pruebas/informe-ejecucion.md); no se presentan como métricas de producción. |
| Configuración de despliegue | Compose válido; `.env` ignorado | El parseo no inicia Docker ni confirma despliegue con TiDB. |
| Experiencia visual | Revisión manual reportada como completada por el equipo (10/10) | Se adjuntan capturas seleccionadas en el [informe de ejecución](pruebas/informe-ejecucion.md); esto no equivale a E2E automatizado ni acredita cada escenario funcional. |
| Alternativas de backend | Comparación cualitativa documentada | Se comparan FastAPI, Django REST Framework, Flask y Express; FastAPI es el framework implementado. |
| Colaboración en GitHub | PR #23 está fusionado a `develop`; hay ramas `main`, `develop` y `feature/*` | La consulta de protección de ramas no fue autorizada; falta comprobar revisiones y reglas en la configuración del repositorio. |

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
3. **Rendimiento:** validar una compilación de producción con Lighthouse antes
   de presentar métricas representativas del despliegue; no inferir el
   rendimiento de la aplicación desde una consulta SQL aislada.
4. **Datos de despliegue:** definir cómo separar las semillas de prueba antes
   de desplegar con datos reales; actualmente forman parte de la cadena de
   migraciones aplicada con `upgrade head`.
5. **TiDB:** si se requiere una verificación técnica independiente, ejecutar
   pruebas de integración solo en una instancia aislada, no en la base
   compartida.
6. **Gestión del trabajo:** reunir backlog priorizado, actas de sprint,
   estimaciones/planning poker, responsables, retrospectivas y feedback del
   equipo. El historial de commits por sí solo no acredita estas prácticas;
   las revisiones de PR #23 y las reglas de ramas también deben comprobarse en
   GitHub; la consulta de protección de ramas no estuvo autorizada.
7. **Seguimiento de defectos:** distinguir incidencias confirmadas de mejoras
   del backlog y definir severidad, estado y responsable para cada defecto.

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
