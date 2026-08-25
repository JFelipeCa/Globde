# RNF-006 — Compatibilidad y Portabilidad

<!--
  ¿Qué? Requisito no funcional que define el soporte multiplataforma y la portabilidad del entorno de ejecución.
  ¿Para qué? Garantizar que el sistema funcione uniformemente en diferentes sistemas operativos y navegadores.
  ¿Impacto? Sin portabilidad, el despliegue falla en entornos heterogéneos y los clientes experimentan errores según su navegador.
-->

---

## Identificación

| Campo | Valor |
| :--- | :--- |
| **ID** | RNF-006 |
| **Nombre** | Compatibilidad y Portabilidad |
| **Categoría** | Portabilidad (ISO/IEC 25010 - Adaptability, Installability, Replaceability) |
| **Prioridad** | Alta |
| **Estado** | Implementado |

---

## Especificación de Requisitos

### RNF-006.1 — Compatibilidad de Navegadores (Cross-Browser)
La aplicación web frontend debe ser 100% funcional y visualmente idéntica en las dos últimas versiones estables de los siguientes navegadores:
- Google Chrome / Chromium
- Mozilla Firefox
- Microsoft Edge
- Apple Safari (macOS e iOS)

### RNF-006.2 — Contenedorización con Docker y Docker Compose
Todo el backend y la base de datos MySQL deben poder ejecutarse de forma idéntica en Linux, macOS y Windows a través de `docker compose up -d`, sin requerir la instalación manual de MySQL o librerías del sistema operativo anfitrión.

### RNF-006.3 — Portabilidad de Base de Datos
El esquema debe ser reproducible sobre cualquier instancia MySQL 8.0+ / MariaDB 10.5+, sea local, remota o en la nube (AWS RDS, GCP Cloud SQL, PlanetScale o VPS local), sin pasos manuales.

Se cumple mediante las **migraciones de Alembic** en `backend/alembic/versions/`: apuntando las variables `DB_*` a la instancia destino, `alembic upgrade head` reconstruye las 20 tablas, las 4 vistas y los datos semilla de forma idéntica. Las migraciones usan tipos y sintaxis soportados por MySQL 8.0+ y MariaDB 10.5+, y son reversibles vía `downgrade()`.

> El archivo `database/database.sql` se conserva únicamente como referencia histórica del modelo; no es el mecanismo de despliegue.
