# RNF-005 — Mantenibilidad y Calidad de Código

<!--
  ¿Qué? Requisito no funcional que define las normas de arquitectura limpia, modularidad y legibilidad del código.
  ¿Para qué? Facilitar la corrección de errores, la incorporación de nuevas características y la transferencia de conocimiento.
  ¿Impacto? Un código acoplado y desorganizado eleva los costos de mantenimiento y genera deuda técnica insostenible.
-->

---

## Identificación

| Campo | Valor |
| :--- | :--- |
| **ID** | RNF-005 |
| **Nombre** | Mantenibilidad y Calidad de Código |
| **Categoría** | Mantenibilidad (ISO/IEC 25010 - Modularity, Reusability, Analysability, Modifiability) |
| **Prioridad** | Alta |
| **Estado** | Implementado |

---

## Especificación de Requisitos

### RNF-005.1 — Tipado Estático Estricto
- En el frontend, TypeScript debe operar con validación estricta en `tsconfig.json` para garantizar que todos los modelos de dominio (`Cita`, `Usuario`, `Cliente`, `Servicio`) estén formalmente tipados en `src/types/index.ts`.
- En el backend, Python debe utilizar type hints en todas las funciones y clases con esquemas `Pydantic` validados.

### RNF-005.2 — Modularidad en Capas
El proyecto debe mantener una clara separación de responsabilidades:
- `backend/app/main.py`: Punto de entrada de la API y registro de routers.
- `backend/app/routers/`: Definición de endpoints y validación de entrada/salida con Pydantic.
- `backend/app/services/`: Lógica de negocio y consultas parametrizadas a MySQL.
- `backend/app/schemas/`, `backend/app/core/`, `backend/app/utils/`: contratos, configuración y utilidades.
- `backend/alembic/versions/`: Migraciones versionadas del esquema de base de datos.
- `frontend/src/utils/apiClient.ts`: Cliente HTTP centralizado sobre `fetch`.
- `frontend/src/context/AppContext.tsx`: Gestión centralizada de estado con React Context API.
- `frontend/src/components/`: Componentes de presentación desacoplados (`ui/`, `paneles/`, `sections/`).

### RNF-005.3 — Documentación Interna Homogénea
Todos los módulos y archivos deben contar con comentarios explicativos claros, documentando los parámetros de entrada, el propósito de cada función y los posibles códigos de error.
