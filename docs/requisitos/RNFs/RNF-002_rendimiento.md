# RNF-002 — Rendimiento y Tiempos de Respuesta

<!--
  ¿Qué? Requisito no funcional que define las métricas de eficiencia temporal y utilización de recursos del sistema.
  ¿Para qué? Asegurar una experiencia de usuario fluida y evitar cuellos de botella en la consulta de citas y reportes.
  ¿Impacto? Tiempos de respuesta lentos generan abandono en el agendamiento y frustración en el personal de la barbería.
-->

---

## Identificación

| Campo | Valor |
| :--- | :--- |
| **ID** | RNF-002 |
| **Nombre** | Rendimiento y Tiempos de Respuesta |
| **Categoría** | Rendimiento (ISO/IEC 25010 - Time Behaviour, Resource Utilization) |
| **Prioridad** | Alta |
| **Estado** | Implementado |

---

## Especificación de Requisitos

### RNF-002.1 — Tiempo de Respuesta de la API REST
- El 95% de las peticiones a endpoints de lectura (`GET /api/servicios`, `GET /api/clientes`, `GET /api/citas`) deben responder en **menos de 300 ms** bajo condiciones normales de red local.
- Las consultas complejas de agregación y reportes ejecutadas sobre Vistas SQL (`vista_ingresos_barbero`, `vista_citas_detalle`) no deben superar **1 segundo**.

### RNF-002.2 — Optimización de Consultas con Vistas SQL
Para evitar joins redundantes y sobrecarga en el servidor de base de datos, el backend debe aprovechar las vistas precompiladas de MySQL:
- `vista_citas_detalle` para consultas tabulares de citas con datos de clientes, barberos y servicios.
- `vista_clientes_resumen` para métricas de clientes y puntos acumulados.
- `vista_ingresos_barbero` para el panel administrativo financiero.

### RNF-002.3 — Carga Inicial y Renderizado Frontend (Vite)
- La aplicación SPA en React debe servirse mediante el empaquetador **Vite**, logrando tiempos de compilación y recarga en caliente (HMR) inferiores a **200 ms** en desarrollo.
- El First Contentful Paint (FCP) en navegadores de escritorio no debe superar **1.5 segundos**.
