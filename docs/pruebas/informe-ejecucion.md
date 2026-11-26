<!--
  ¿Qué? Registra resultados de las pruebas ejecutadas y defectos observados en GLOBDE.
  ¿Para qué? Distinguir resultados comprobados de verificaciones aún pendientes.
  ¿Impacto? Evita presentar la compilación o una prueba parcial como garantía de producción.
-->

# Informe de ejecución de pruebas — GLOBDE

> **Fecha de ejecución:** 26 de noviembre de 2026<br>
> **Rama local:** `docs/project-documentation`<br>
> **Ambiente de pruebas automatizadas:** MySQL 8.0.46 desechable en localhost; TiDB compartida no utilizada en esa ejecución.

## Resumen

| Componente / ejecución | Resultado | Evidencia y límite |
|---|---|---|
| Recopilación de backend | **160 casos recopilados** | 67 unitarios + 93 de integración |
| Backend unitario | **67 passed** | `uv run --group dev pytest tests/test_unitarias.py` desde `backend/` |
| Backend integración | **93 passed** | Ejecutadas en MySQL 8.0.46 temporal con esquema y semillas; no se apuntó a la base externa |
| Suite completa | **160 passed, 0 skipped** | `uv run pytest --cov=app --cov-report=term-missing`; cobertura total: **69%** |
| CI GitHub Actions | **Passed** en [`0cd0bb5`](https://github.com/JFelipeCa/Globde/commit/0cd0bb518f2d69da31075bbf8d0c40c9b2725ad4) | [Run #45906866540](https://github.com/JFelipeCa/Globde/actions/runs/45906866540): backend y frontend verdes; migraciones `upgrade`/`downgrade`, 160 pruebas en MySQL efímero, tipos, build y auditorías. La auditoría frontend conserva una alerta moderada por debajo del umbral `high`. |
| Migraciones | **Passed** | `upgrade head` → `downgrade base` (cero objetos remanentes) → `upgrade head`; revisión final `h8b9c0d1e2f3` |
| Inicio real de API + conexión de BD | **Passed** | Uvicorn en localhost; `/api/health` y `/docs` respondieron HTTP 200; DB conectada a MySQL 8.0.46 |
| TypeScript frontend | **Passed** | `pnpm exec tsc -b --force` |
| ESLint frontend | **Passed** | `pnpm run lint` |
| Build frontend | **Passed** | `pnpm run build` |
| Preview HTTP frontend | **Passed** | `vite preview` respondió HTTP 200 y sirvió el HTML de GLOBDE en localhost |
| Generación OpenAPI | **Passed** | 129 operaciones por defecto; 131 con compatibilidad v1 |
| Revisión visual manual | **Completada según el equipo** | El equipo reporta resultado 10/10; las capturas seleccionadas están en [evidencia](evidencia/). No existe runner frontend E2E configurado. |
| TiDB Cloud | **Funcionamiento básico reportado por el equipo** | La captura de clúster activo está en [evidencia](evidencia/tidb-cluster-activo.png); el equipo confirma que la aplicación carga usuarios y datos. Esto no sustituye pruebas automatizadas aisladas de escritura y migración contra TiDB. |
| Consulta agregada TiDB | **11 usuarios; 9 ms** | Captura compartida por el equipo desde el editor SQL; lectura de solo consulta, no mide la latencia de la API ni de la página. |
| Rendimiento web | **Diagnóstico en desarrollo: 29/100 en línea base; 28/100 en repetición reportada** | FCP 14.0 s; LCP 27.1 s; TBT 1,480 ms; CLS 0.009; Speed Index 14.3 s en la línea base. Estas cifras no son una medición de producción. |
| Correo SMTP | **Pendiente** | Aún falta confirmar recepción de un correo de prueba con credenciales SMTP de prueba. |
| Configuración Docker y variables | **Passed** | `docker compose config` válido; servicios backend/frontend; 22 variables presentes en `.env.example`; `.env` ignorado por Git |

Las verificaciones de frontend se ejecutaron después de corregir dos errores de
tipado que impedían la compilación. El porcentaje de cobertura reportado
corresponde a esta ejecución local. La revisión visual fue realizada por el
equipo y no se presenta como una prueba automatizada ni como una inspección
independiente de todos los flujos.

## Evidencia visual seleccionada

- [Estado activo del clúster TiDB](evidencia/tidb-cluster-activo.png): acredita
  el estado mostrado en el panel en el momento de la captura, no una prueba
  independiente de conexión desde la API.
- [Conteo agregado de usuarios en TiDB](evidencia/tidb-cantidad-usuarios.png):
  muestra `COUNT(*) = 11` y una duración de 9 ms en el editor SQL. Es una
  consulta manual aislada; no mide una solicitud de la aplicación.
- [Resumen visual de calificación](evidencia/resumen-calificacion-visual.png):
  recorte parcial de la interfaz; es evidencia ilustrativa, no una cobertura
  completa de la revisión visual.

La captura del editor SQL con nombres reales de usuarios no se publica para
evitar exponer datos personales; se reemplazó por el conteo agregado anterior.
Otras capturas recibidas contienen nombres de clientes, información financiera,
recortes sin suficiente contexto o un icono de imagen cuyo origen no se puede
determinar; no se incluyen como evidencia pública de aprobación.

## Rendimiento web

Las mediciones compartidas por el equipo se ejecutaron con Lighthouse sobre la
aplicación servida desde Codespaces (servidor de desarrollo Vite, puerto 5173).
Son diagnósticos del entorno de desarrollo para detectar oportunidades; no son
un benchmark ni una evaluación de la compilación desplegada en producción:

| Métrica | Resultado |
|---|---:|
| Puntuación de rendimiento | **29/100** |
| First Contentful Paint (FCP) | 14.0 s |
| Largest Contentful Paint (LCP) | 27.1 s |
| Total Blocking Time (TBT) | 1,480 ms |
| Cumulative Layout Shift (CLS) | 0.009 |
| Speed Index | 14.3 s |

El CLS es bajo en esta corrida; FCP, LCP, TBT y Speed Index muestran
oportunidades claras para mejorar la carga inicial y el trabajo del hilo
principal. Lighthouse estima hasta **915 KiB** de ahorro potencial en entrega de
imágenes y **230 ms** en solicitudes que bloquean el renderizado. Son
estimaciones del informe, no ahorros ya obtenidos.

Capturas del resultado:

- [Puntuación](evidencia/lighthouse-puntaje.png)
- [Métricas](evidencia/lighthouse-metricas.png)
- [Oportunidades detectadas](evidencia/lighthouse-oportunidades.png)

La repetición compartida por el equipo registra **28/100**, frente a **29/100**
en la línea base. El dato recibido es la puntuación global; para comparar el
efecto de los ajustes y decidir el siguiente paso, conviene revisar también
FCP, LCP, TBT, CLS y las oportunidades del informe repetido. No se atribuye la
variación de un punto a un cambio específico. La repetición tampoco permite
caracterizar el rendimiento de producción; hace falta medir la compilación
productiva antes de presentar cifras como representativas del despliegue.

Se conservaron sin cambios las imágenes originales `barbero-1.png` y
`barbero-2.png`. Se configuró carga diferida para las fotos de barberos y las
imágenes de las tarjetas del catálogo, y prioridad alta para la imagen principal
del hero. La repetición global está registrada arriba; aún falta comparar sus
métricas detalladas con la línea base.

La duración de 9 ms de la consulta `COUNT(*)` corresponde al editor SQL de
TiDB y a esa consulta concreta. No representa el tiempo de una petición API ni
el tiempo hasta que la página queda lista para usarse.

La URL analizada corresponde al servidor de desarrollo de Vite; se conserva
esta corrida como línea base del entorno compartido. No se ejecutó una prueba
de carga intensiva ni una comparación de rendimiento entre frameworks.

La suite reportó 10 advertencias deprecadas relacionadas con `httpx` en
Starlette TestClient y `HTTP_422_UNPROCESSABLE_ENTITY`; no causaron fallos.

## Defectos encontrados y estado

| ID | Hallazgo | Severidad | Estado | Registro |
|---|---|---|---|---|
| FE-001 | El tipo de respuesta paginada del panel de administración no declaraba `total_paginas`, aunque la UI lo usa para solicitar páginas adicionales. | Alta: bloqueaba `tsc` | Corregido en la rama; tipos, lint y build pasan | Cambio local; no se abrió issue remoto porque quedó resuelto antes de registrar |
| FE-002 | El tipo de solicitud de lista de espera exigía campos exclusivos de la respuesta que el endpoint de creación no recibe ni necesita. | Alta: bloqueaba `tsc` | Corregido usando solo los campos de entrada del endpoint; tipos, lint y build pasan | Cambio local; no se abrió issue remoto porque quedó resuelto antes de registrar |

Las 160 pruebas pasaron sin reportar defectos funcionales en esta ejecución.
Esto no sustituye CI sobre el commit publicado, la prueba de correo ni la
validación automatizada en una instancia TiDB aislada.

## Issues abiertos del repositorio

Estos elementos son trabajo pendiente, no fallos descubiertos por esta
ejecución. No tienen etiquetas de severidad en GitHub:

| Issue | Estado | Tema | Etiqueta de severidad / responsable |
|---|---|---|---|
| [#21](https://github.com/JFelipeCa/Globde/issues/21) | Abierto | Decidir si migrar colores a tokens de Tailwind o simplificar la configuración | Sin etiqueta / sin asignar |
| [#31](https://github.com/JFelipeCa/Globde/issues/31) | Abierto | Añadir notificaciones de citas por WhatsApp | Sin etiqueta / sin asignar |

El run [CI #43103892565](https://github.com/JFelipeCa/Globde/actions/runs/43103892565)
falló el 11 de noviembre de 2026 en `feature/integration-test`; no correspondía
a esta rama. El run posterior [CI #45906866540](https://github.com/JFelipeCa/Globde/actions/runs/45906866540)
pasó en `docs/project-documentation` sobre `0cd0bb5`. Falta confirmar CI
después de integrar los cambios a `develop` o `main`.

## Próximas verificaciones

1. Integrar la rama en el destino acordado y confirmar que CI pasa allí;
   conservar los artefactos JUnit/cobertura del run.
2. Probar el envío SMTP con una cuenta de prueba y conservar evidencia sin
   mostrar credenciales ni datos personales.
3. Medir una compilación de producción con Lighthouse; registrar las métricas
   y condiciones antes de presentar resultados representativos del despliegue.
4. Si se requiere validación técnica independiente de TiDB, ejecutar pruebas
   automatizadas solo en una instancia aislada.
5. Registrar defectos nuevos en GitHub Issues con severidad y estado acordados;
   no convertir mejoras del backlog en defectos.
