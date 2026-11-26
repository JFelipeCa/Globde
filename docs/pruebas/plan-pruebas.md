<!--
  ¿Qué? Define el alcance y las condiciones para probar GLOBDE.
  ¿Para qué? Separar verificaciones repetibles de pruebas que necesitan base de datos o navegador.
  ¿Impacto? Evita presentar resultados parciales como validación integral del sistema.
-->

# Plan de pruebas — GLOBDE

> **Versión:** 1.0 · **Corte:** 26 de noviembre de 2026<br>
> **Alcance:** API backend y frontend de la rama de trabajo actual.

## Alcance y niveles

| Nivel | Qué verifica | Evidencia automatizada |
|---|---|---|
| Unitario backend | Seguridad, configuración, validaciones y lógica que no necesita MySQL | `backend/tests/test_unitarias.py` — 67 casos recopilados |
| Integración backend | Rutas, permisos, reglas de negocio, persistencia, semillas y compatibilidad | `test_api.py`, `test_reglas_negocio.py`, `test_legacy.py` — 93 casos recopilados |
| Integración continua | Migraciones, MySQL real, backend completo, tipos, lint y build | [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml) |
| Verificación estática frontend | Tipos TypeScript y reglas ESLint | `pnpm exec tsc -b --force`, `pnpm run lint` |
| Build frontend | Compilación de producción con Vite | `pnpm run build` |
| Rendimiento web | Lighthouse en navegador; registrar puntuación, FCP, LCP, TBT y CLS | Línea base actual en el [informe de ejecución](informe-ejecucion.md); repetir tras optimizaciones |
| Aceptación manual | Flujos visibles por rol, navegación, responsive, mensajes, colores y accesibilidad | El equipo reporta revisión visual completada; el informe identifica las capturas disponibles y los límites de esa evidencia |

La suite de backend recopila 160 casos en total: 67 unitarios y 93 de
integración. El frontend no tiene un runner de pruebas de componentes o E2E
configurado; lint y build no sustituyen esas pruebas.

## Ambiente requerido

1. Usar una base MySQL compatible **aislada para pruebas**, con nombre y
   credenciales distintos a los del entorno de desarrollo compartido.
2. Aplicar las migraciones con `uv run alembic upgrade head` y cargar los datos
   semilla requeridos por los tests.
3. Configurar `APP_ENV=testing`, `EMAIL_ENABLED=false` y valores de prueba para
   `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` y `JWT_SECRET`.
4. No ejecutar pruebas de integración contra TiDB compartida o producción:
   las pruebas escriben datos y limpian intentos de login.

En CI, GitHub Actions provisiona MySQL efímero, aplica Alembic y falla si las
pruebas de integración se omiten.

## Comandos

```bash
# Backend: desde backend/
uv run pytest --collect-only -q
uv run pytest tests/test_unitarias.py
uv run pytest -m "not integracion"
uv run pytest --cov=app --cov-report=term-missing

# Frontend: desde frontend/
pnpm exec tsc -b --force
pnpm run lint
pnpm run build
```

El comando de suite completa requiere el ambiente MySQL aislado descrito arriba.

## Criterios de entrada y salida

**Entrada:** dependencias instaladas desde los lockfiles; variables de prueba
configuradas; base desechable creada y migrada.

**Salida backend:** ejecutar los 160 casos recopilados, revisar y justificar
cualquier omisión condicional, cero fallos inesperados y migración en `head`.
El mínimo de 20 pruebas unitarias se cumple cuando pasan al menos 20 casos de
`test_unitarias.py`.

**Salida frontend:** verificación de tipos, ESLint y build terminan con código 0.

**Salida aceptación manual:** registrar escenario, rol, resultado, captura o
grabación y defecto asociado en el sistema de seguimiento.

La revisión visual reportada por el equipo no equivale a una ejecución E2E
automatizada ni confirma por sí sola cada escenario funcional de esta lista.
El estado y la evidencia disponible se registran en el
[informe de ejecución](informe-ejecucion.md).

## Escenarios manuales prioritarios

1. Cliente: registro/inicio de sesión, reserva y cancelación.
2. Invitado: verificación de correo y reserva o solicitud de lista de espera.
3. Administrador: gestionar horario/cierre y comprobar que una fecha cerrada no
   ofrece turnos.
4. Cliente y administrador: abrir/cancelar solicitudes y comprobar una oferta
   de turno compatible.
5. Administrador: descargar los reportes CSV de ingresos, citas y clientes.
6. Confirmar navegación por rol, estados de carga/error, legibilidad de colores
   y vista móvil.
