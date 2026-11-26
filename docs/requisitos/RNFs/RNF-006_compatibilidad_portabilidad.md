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
| **Estado** | Parcial; falta validación de navegadores y despliegue |

---

## Especificación de Requisitos

### RNF-006.1 — Compatibilidad de Navegadores (Cross-Browser)
La aplicación web frontend debe ser 100% funcional y visualmente idéntica en las dos últimas versiones estables de los siguientes navegadores:
- Google Chrome / Chromium
- Mozilla Firefox
- Microsoft Edge
- Apple Safari (macOS e iOS)

### RNF-006.2 — Contenedorización con Docker y Docker Compose
El backend y el frontend deben poder ejecutarse de forma idéntica en Linux, macOS y Windows a través de Docker Compose, sin requerir la instalación manual de dependencias del sistema anfitrión. En el despliegue vigente, Compose inicia backend y frontend; la base de datos TiDB Cloud está alojada remotamente y se configura por variables privadas. Por tanto, este requisito no implica que Compose aloje TiDB.

### RNF-006.3 — Portabilidad de Base de Datos
El esquema debe reproducirse en TiDB Cloud, motor remoto del proyecto, y en MySQL 8.0, usado por CI. La compatibilidad con MariaDB u otros proveedores requiere validación independiente y no se presume.

La creación y evolución del esquema se implementa mediante las **migraciones de Alembic** en
`backend/alembic/versions/`: con las variables `DB_*` apuntando a una instancia
destino, `alembic upgrade head` crea el esquema vigente de 26 tablas, 4 vistas
y los datos semilla. El CI ejecuta `upgrade` y `downgrade` en MySQL 8.0. La
ejecución de integración en una base TiDB aislada y en navegadores objetivo
sigue pendiente; por eso la compatibilidad integral no se marca como verificada.

> El archivo `database/database.sql` se conserva únicamente como referencia histórica del modelo; no es el mecanismo de despliegue.
