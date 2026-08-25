# Arquitectura del Sistema — GLOBDE

<!--
  ¿Qué? Documentación exhaustiva de la arquitectura de software de GLOBDE.
  ¿Para qué? Proveer un entendimiento integral de la estructura en 3 capas, el flujo de peticiones,
             la gestión de estado con React Context API, la conexión con MySQL y las decisiones de diseño.
  ¿Impacto? Facilita el mantenimiento, escalabilidad, sustentación formativa y onboarding de nuevos desarrolladores.
-->

> **Proyecto**: GLOBDE — Sistema de Gestión de Citas y Barbería  
> **Patrón Principal**: Arquitectura Cliente–Servidor desacoplada en 3 Capas (SPA + API REST + RDBMS)  
> **Backend**: FastAPI (Python 3.13) con ASGI Uvicorn  
> **Frontend**: React 19 + TypeScript + Vite 7 + React Context API  
> **Base de Datos**: MySQL 8.0+ / MariaDB con Connection Pooling  

---

## 1. Vista General del Sistema (Arquitectura en 3 Capas)

GLOBDE implementa una arquitectura desacoplada donde cada capa tiene responsabilidades únicas y delimitadas:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  CAPA 1 — CLIENTE / FRONTEND (Single Page Application - SPA)                │
│                                                                             │
│  React 19 + TypeScript + Vite 7 + Tailwind CSS v4 + React Context API       │
│  http://localhost:5173                                                      │
│                                                                             │
│  ┌──────────────┐   ┌─────────────────┐   ┌──────────────────────────────┐  │
│  │   Paneles    │   │   Componentes   │   │      AppContext (Context)    │  │
│  │ (PanelAdmin, │   │  (Navbar, UI,   │   │  Estado global de sesión,    │  │
│  │  Barbero,    │   │   Modales,      │   │  vista activa y datos        │  │
│  │  Cliente)    │   │   Wizard)       │   │  (useContext/useState)       │  │
│  └──────┬───────┘   └────────┬────────┘   └──────────────┬───────────────┘  │
│         │                    │                           │                  │
│         └────────────────────┼───────────────────────────┘                  │
│                              ▼                                              │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │   Cliente HTTP `utils/apiClient.ts` (fetch nativo, VITE_API_URL)      │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ Peticiones HTTP / JSON (CORS)
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  CAPA 2 — SERVIDOR / BACKEND (RESTful Web API)                              │
│                                                                             │
│  FastAPI (Python 3.13) + Uvicorn ASGI Server                                │
│  http://localhost:8000                                                      │
│                                                                             │
│  ┌──────────────────┐   ┌───────────────────┐   ┌────────────────────────┐  │
│  │  CORS Middleware │──▶│  Validación DTO   │──▶│ Endpoints / Control    │  │
│  │  y Enrutador     │   │  (Pydantic v2)    │   │ (Auth, Citas, Reportes)│  │
│  └──────────────────┘   └───────────────────┘   └───────────┬────────────┘  │
│                                                             │               │
│                                                             ▼               │
│                         ┌──────────────────────────────────────────────┐    │
│                         │ Criptografía (`bcrypt`), SMTP Mail & Helpers │    │
│                         └──────────────────────────────────────────────┘    │
│                                                             │               │
│                                                             ▼               │
│                         ┌──────────────────────────────────────────────┐    │
│                         │ Gestor de Conexiones (`mysql.connector`)     │    │
│                         └──────────────────────────────────────────────┘    │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ Consultas SQL Parametrizadas (TCP 3306)
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  CAPA 3 — PERSISTENCIA / BASE DE DATOS (RDBMS Relacional)                   │
│                                                                             │
│  MySQL 8.0+ / MariaDB (`globde` schema)                                     │
│                                                                             │
│  ┌─────────────────────────────────┐   ┌────────────────────────────────┐  │
│  │ 12 Tablas con Claves Foráneas   │   │ 3 Vistas SQL Precompiladas     │  │
│  │ (`usuarios`, `citas`, etc.)     │   │ (`vista_citas_detalle`, etc.)  │  │
│  └─────────────────────────────────┘   └────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Flujo de Vida de una Petición (Request-Response Lifecycle)

A continuación se detalla el ciclo completo cuando un cliente agenda una nueva cita:

```
[Cliente en React UI]
        │ 1. Completa formulario en CitasPage.tsx
        ▼
[AppContext / apiClient.ts]
        │ 2. Ejecuta llamada POST a http://localhost:8000/api/citas con JSON
        ▼
[FastAPI Router]
        │ 3. Valida tipos y restricciones con Pydantic (CitaCreate schema)
        ▼
[Lógica de Negocio / main.py]
        │ 4. Verifica disponibilidad: consulta traslapes de horario para ese barbero
        ▼
[MySQL Database]
        │ 5. Ejecuta: INSERT INTO citas (id_cliente, id_barbero, id_servicio, fecha, hora, estado)
        │ 6. Retorna `lastrowid` generado
        ▼
[Servicio SMTP] (Opcional en segundo plano)
        │ 7. Envía correo electrónico de confirmación al cliente
        ▼
[FastAPI Response]
        │ 8. Retorna JSON con HTTP 201 Created y objeto serializado
        ▼
[React / AppContext]
        │ 9. Actualiza `dataSlice` e inserta la cita en el estado global
        │ 10. Muestra mensaje toast de éxito y actualiza el calendario en pantalla
```

---

## 3. Decisiones Técnicas y Justificación

| Decisión Arquitectónica | Alternativa Descartada | Justificación Técnica |
| :--- | :--- | :--- |
| **FastAPI en Backend** | Spring Boot / Django | FastAPI ofrece una velocidad de ejecución asíncrona superior, documentación Swagger OpenAPI automática sin configuración extra y sintaxis limpia en Python. |
| **MySQL como RDBMS** | MongoDB (NoSQL) | El dominio de agendamiento de citas exige estricta consistencia ACID, integridad referencial mediante claves foráneas y relaciones relacionales bien definidas. |
| **React Context API en Frontend** | Redux Toolkit / estado local suelto | Permite compartir sesión, vista activa y datos entre paneles sin prop drilling, con mucho menos boilerplate que Redux para el tamaño actual de la aplicación. |
| **Consultas con Vistas SQL** | Múltiples JOINs en código | Las vistas `vista_citas_detalle` e `vista_ingresos_barbero` trasladan la agregación a la base de datos, reduciendo el tráfico de red y el uso de memoria en el backend. |
| **Docker Compose** | Despliegue manual local | Garantiza que cualquier miembro del equipo o instructor pueda levantar la base de datos y backend con un solo comando (`docker compose up -d`). |

---

## 4. Estructura de Módulos del Backend

```
backend/
├── app/
│   ├── main.py          # Enrutamiento de endpoints, modelos Pydantic, lógica de BD y SMTP
│   └── __init__.py
├── .env.example         # Variables de entorno template
├── Dockerfile           # Imagen de despliegue para FastAPI
└── pyproject.toml       # Dependencias (uv): fastapi, uvicorn, pydantic, bcrypt, mysql-connector-python
```

---

## 5. Estructura de Módulos del Frontend

```
frontend/
├── src/
│   ├── App.tsx                      # Composición raíz y enrutado por estado (sin React Router)
│   ├── main.tsx                     # Punto de entrada; monta <App/> dentro del provider
│   ├── index.css                    # Tailwind CSS v4 (@import "tailwindcss") y tokens @theme
│   ├── context/
│   │   └── AppContext.tsx           # Estado global: sesión, rol, vista activa, datos
│   ├── components/
│   │   ├── paneles/                 # PanelAdmin, PanelBarbero, PanelCliente
│   │   ├── sections/                # Landing
│   │   └── ui/                      # Navbar, AuthModal, BookingWizard, TicketModal, Extras
│   ├── data/
│   │   └── mockData.ts              # Datos de demostración (aún en uso por varios paneles)
│   ├── types/index.ts, types.ts     # Interfaces TypeScript
│   └── utils/
│       ├── apiClient.ts             # Cliente HTTP sobre fetch (lee VITE_API_URL)
│       ├── cn.ts                    # clsx + tailwind-merge
│       ├── formatters.ts            # Fecha, moneda, estado
│       └── helpers.ts
```

> [!NOTE]
> La navegación **no usa React Router**: `App.tsx` conmuta la vista a partir del estado
> global de `AppContext`. Tampoco se usa Axios; `apiClient.ts` está construido sobre `fetch`.
