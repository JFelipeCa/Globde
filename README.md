> **Proyecto formativo** — SENA | Programa ADSO (Análisis y Desarrollo de Software) — Febrero 2026

# 💈 GLOBDE — Sistema Integral de Gestión de Citas y Barbería

Sistema web fullstack para la gestión integral de citas, barberos, clientes, fidelización por puntos y reportes analíticos para barberías modernas. Desarrollado con **FastAPI (Python 3.13)** en el backend, **React 19 + TypeScript + Vite (Context API)** en el frontend y **MySQL** como motor relacional.

---

## 📝 Antes de empezar

Este repositorio contiene la arquitectura completa, el backend API REST, el frontend SPA responsive y la base de datos relacional con vistas SQL del proyecto **GLOBDE**. Si es tu primer acercamiento al código, te recomendamos leer primero la [**Arquitectura**](docs/referencia-tecnica/architecture.md), que explica cómo se comunican las tres capas, y las [**historias de usuario y casos de uso**](docs/requisitos.md), que documentan qué se construyó y por qué.

---

## 📋 Tabla de Contenidos

* [💈 GLOBDE — Sistema Integral de Citas y Barbería](#-globde--sistema-integral-de-gestión-de-citas-y-barbería)
  * [📝 Antes de empezar](#-antes-de-empezar)
  * [📋 Tabla de Contenidos](#-tabla-de-contenidos)
  * [🛠️ Stack Tecnológico](#️-stack-tecnológico)
  * [✅ Prerrequisitos](#-prerrequisitos)
  * [🚀 Instalación y Puesta en Marcha](#-instalación-y-puesta-en-marcha)
    * [Opción 1: Con Docker y Docker Compose (Recomendada)](#opción-1-con-docker-y-docker-compose-recomendada)
    * [Opción 2: Instalación Manual (Sin Docker)](#opción-2-instalación-manual-sin-docker)
  * [▶️ Ejecución y Verificación](#️-ejecución-y-verificación)
  * [🧪 Testing y Calidad](#-testing-y-calidad)
  * [📁 Estructura del Proyecto](#-estructura-del-proyecto)
  * [📏 Convenciones y Estándares](#-convenciones-y-estándares)
  * [📚 Documentación Técnica y Requisitos](#-documentación-técnica-y-requisitos)
  * [👥 Roles y Capacidades del Sistema](#-roles-y-capacidades-del-sistema)
  * [🎨 Sistema de Diseño (Design System)](#-sistema-de-diseño-design-system)
  * [🎓 Propósito Educativo SENA](#-propósito-educativo-sena)
  * [⚠️ Exención de Responsabilidades](#️-exención-de-responsabilidades)
  * [📄 Licencia y Equipo](#-licencia-y-equipo)

---

## 🛠️ Stack Tecnológico

| Capa | Tecnologías | Propósito |
| :--- | :--- | :--- |
| **Backend** | Python 3.13+, FastAPI, Uvicorn, Pydantic v2, bcrypt | API REST de alto rendimiento, validación de esquemas y hashing seguro |
| **Frontend** | React 19, TypeScript, Vite, Context API, Tailwind CSS 4 | SPA reactiva, tipado estático estricto, gestión de estado y persistencia |
| **Base de Datos** | MySQL 8.0+ / MariaDB 10.5+, Alembic | Persistencia relacional (20 tablas, 4 vistas SQL, integridad referencial) y esquema versionado en migraciones |
| **Email (Dev/Prod)** | Python `smtplib` + MIME (Mailpit en local / SMTP TLS) | Envío de tokens seguros de recuperación de contraseña y alertas |
| **Contenedores** | Docker 24+, Docker Compose v2 | Entorno aislado y reproducible para base de datos, backend y frontend |
| **Estilos & UI** | Tailwind CSS v4 (`@tailwindcss/vite`), tokens `@theme`, `clsx` + `tailwind-merge` | Diseño responsive mobile-first con temática barbería premium |

---

## ✅ Prerrequisitos

Antes de comenzar, asegúrate de contar con el siguiente software instalado:

| Herramienta | Versión mínima recomendada | Comando de verificación |
| :--- | :--- | :--- |
| **Python** | 3.13+ | `python3 --version` o `python --version` |
| **uv** | 0.5+ | `uv --version` |
| **Node.js** | 22 LTS+ | `node --version` |
| **pnpm** | 11+ | `pnpm --version` |
| **Docker** | 24.0+ | `docker --version` |
| **Docker Compose** | 2.20+ | `docker compose version` |
| **MySQL Server** *(si no usas Docker)* | 8.0+ | `mysql --version` |
| **Git** | 2.40+ | `git --version` |

### Instalar `uv`

El backend usa [uv](https://docs.astral.sh/uv/) para gestionar el entorno y las
dependencias. No viene preinstalado en Codespaces ni en la mayoría de sistemas:

```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
source $HOME/.local/bin/env      # o abre una terminal nueva
uv --version
```

Si al correr `uv sync` obtienes `bash: uv: command not found`, es esto: falta
instalarlo, o falta el `source` para que la terminal actual lo encuentre.

> 🖥️ **Usuarios de Windows**: Se recomienda utilizar **Git Bash** o **WSL2** para ejecutar comandos con sintaxis bash uniforme.

---

## 🚀 Instalación y Puesta en Marcha

### Opción 1: Con Docker y Docker Compose (Recomendada)

Levanta los tres servicios (MySQL, backend FastAPI y frontend Vite) en contenedores coordinados.
El esquema de base de datos lo aplica **Alembic automáticamente** al arrancar el backend:

```bash
# 1. Clonar el repositorio
git clone https://github.com/JFelipeCa/Globde.git
cd Globde

# 2. Configurar variables de entorno del backend
cd backend
cp .env.example .env
# OBLIGATORIO: definir DB_PASSWORD y JWT_SECRET (vienen vacías a propósito).
#   python -c "import secrets; print(secrets.token_urlsafe(48))"   → JWT_SECRET
cd ..

# 3. Levantar contenedores
docker compose up -d --build
# El entrypoint del backend espera a MySQL y ejecuta 'alembic upgrade head',
# creando las 20 tablas, 4 vistas y los datos semilla. No hay que correr ningún .sql.

# 4. Listo
# → Frontend:  http://localhost:5173
# → API/Docs:  http://localhost:8000/docs
```

> [!IMPORTANT]
> `DB_PASSWORD` y `JWT_SECRET` no tienen valor por defecto: el repositorio no incluye contraseñas.
> Si `docker compose up` falla con *"define DB_PASSWORD en tu archivo .env"*, es que falta esa variable.
> Guía detallada y troubleshooting: [`docs/setup/con-docker.md`](docs/setup/con-docker.md).

### Opción 2: Instalación Manual (Sin Docker)

```bash
# 1. Base de datos MySQL local
# Crea la base vacía; el esquema lo generan las migraciones de Alembic:
mysql -u root -p -e "CREATE DATABASE globde CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# 2. Backend (FastAPI)
cd backend
uv sync                         # crea el entorno virtual e instala dependencias
cp .env.example .env            # Configurar DB_HOST=127.0.0.1 y DB_PASSWORD

uv run alembic upgrade head     # crea las 20 tablas, 4 vistas y los datos semilla

uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
# → API disponible en: http://localhost:8000
# → Documentación Swagger interactiva: http://localhost:8000/docs

# 3. Frontend (React + Vite)
cd ../frontend
pnpm install
pnpm run dev
# → Aplicación disponible en: http://localhost:5173
```

---

## ▶️ Ejecución y Verificación

| Servicio | URL Local | Descripción |
| :--- | :--- | :--- |
| **Frontend Web** | `http://localhost:5173` | Landing page, Catálogo, Login, Dashboards Cliente/Barbero/Admin |
| **Backend REST API** | `http://localhost:8000` | Punto de entrada FastAPI con endpoints versionados `/api/` |
| **Documentación Swagger** | `http://localhost:8000/docs` | Interfaz interactiva OpenAPI para pruebas de endpoints |
| **Documentación ReDoc** | `http://localhost:8000/redoc` | Especificación técnica OpenAPI en formato ReDoc |
| **Base de Datos MySQL** | `localhost:3307` | Base de datos `globde` (20 tablas + 4 vistas). El contenedor mapea `3307:3306` |

---

## 🧪 Testing y Calidad

### Backend (Python + pytest)

```bash
cd backend
uv sync                        # instala dependencias (incluye el grupo dev)
uv run pytest                  # 132 pruebas
uv run pytest --cov=app --cov-report=term-missing   # con cobertura (~70%)
```

Con Docker, sin instalar nada en el host:

```bash
docker compose exec backend uv run pytest
```

> [!NOTE]
> Las pruebas necesitan una base MySQL accesible. Sin ella, la mayoría se marcan como
> `skipped` en lugar de fallar.

### Frontend (React + TypeScript)

```bash
cd frontend
pnpm install --frozen-lockfile
pnpm exec tsc -b --force       # verificación de tipos estricta
pnpm run lint                  # ESLint
pnpm run build                 # build de producción
pnpm audit --audit-level high  # auditoría de vulnerabilidades
```

### Integración Continua

Cada push a `feature/act-seg` y cada PR hacia `main` ejecutan
[`.github/workflows/ci.yml`](.github/workflows/ci.yml): levantan MySQL como servicio,
aplican las migraciones, corren las 132 pruebas con cobertura y construyen el frontend.
El workflow **falla si alguna prueba queda en `skipped`**, para que no pasen inadvertidas.
El reporte HTML de cobertura queda como artifact `htmlcov` durante 14 días.

---

## 📁 Estructura del Proyecto

```
Globde/
├── .github/
│   └── copilot-instructions.md       # Reglas de arquitectura, código, seguridad y commits
├── .github/workflows/ci.yml          # CI: pruebas con MySQL, cobertura y build del frontend
├── .gitignore                        # Archivos y secretos ignorados por Git
├── docker-compose.yml                # Orquestación de MySQL (3307) + Backend (8000) + Frontend (5173)
├── README.md                         # Documento maestro del proyecto (este archivo)
├── database/
│   └── database.sql                  # Referencia histórica del modelo (el esquema lo crea Alembic)
├── backend/                          # Backend — FastAPI + Python 3.13
│   ├── app/
│   │   ├── main.py                   # Arranque de FastAPI, montaje de routers, CORS
│   │   ├── routers/                  # 14 routers, uno por dominio (auth, citas, clientes...)
│   │   ├── services/                 # Reglas de negocio + acceso a datos (SQL puro)
│   │   ├── schemas/                  # Modelos Pydantic de entrada/salida
│   │   └── core/                     # Config, seguridad (JWT/bcrypt), excepciones
│   ├── alembic/                      # Migraciones: fuente de verdad del esquema de BD
│   │   └── versions/                 # dd2ee59368e5 (20 tablas + 4 vistas) → b2c3d4e5f6a7 (semillas)
│   ├── alembic.ini                   # Configuración de Alembic
│   ├── docker-entrypoint.sh          # Espera a MySQL y ejecuta 'alembic upgrade head'
│   ├── tests/                        # pytest (132 tests: unitarias, reglas de negocio, API)
│   ├── .env.example                  # Plantilla de variables de entorno seguras
│   ├── Dockerfile                    # Imagen Docker de producción backend
│   ├── pyproject.toml                # Dependencias de Python (gestionadas con uv)
│   └── uv.lock                       # Lockfile reproducible
├── frontend/                         # Frontend — React 19 + Vite + TypeScript
│   ├── src/
│   │   ├── context/                  # AppContext: estado global vía React Context API
│   │   ├── components/ui/            # Navbar, modales (Auth, Ticket), wizard de reservas
│   │   ├── components/sections/      # Secciones de la landing (Hero, Servicios, Barberos...)
│   │   ├── components/paneles/       # Dashboards por rol (Cliente, Barbero, Admin)
│   │   ├── types/index.ts            # Contratos y tipos TypeScript globales
│   │   └── utils/                    # apiClient (fetch), formateadores de fecha y moneda
│   ├── package.json                  # Dependencias de Node.js
│   └── vite.config.ts                # Configuración del bundler Vite
└── docs/                             # Documentación Técnica Completa
    ├── requisitos.md                 # Índice Maestro y Matriz de Trazabilidad RF ↔ HU ↔ CU
    ├── requisitos/
    │   ├── RFs/                      # 16 Requisitos Funcionales Maestros estructurados
    │   ├── HUs/                      # 33 Historias de Usuario con Criterios Dado/Cuando/Entonces
    │   ├── CUs/                      # 33 Casos de Uso con diagramas de flujo Mermaid
    │   └── restricciones.md          # Restricciones técnicas, de negocio, legales y operativas
    ├── referencia-tecnica/
    │   ├── architecture.md           # Arquitectura en 3 capas, flujo de datos y diagramas
    │   ├── database-schema.md        # Esquema ER, diccionario de 20 tablas y 4 vistas SQL
    │   ├── api-endpoints.md          # Catálogo exhaustivo de endpoints, payloads y respuestas
    │   └── design-system.md          # Tokens de diseño, paleta, componentes y estados
    ├── conceptos/
    │   ├── patrones-arquitectonicos.md # 10 patrones arquitectónicos aplicados en Globde
    │   ├── owasp-top-10.md           # Mitigación del OWASP Top 10 aplicada al sistema
    │   └── accesibilidad-aria-wcag.md # Estándares WCAG 2.1 AA y ARIA en la UI
    ├── setup/
    │   ├── con-docker.md             # Guía detallada con Docker y Troubleshooting
    │   └── sin-docker.md             # Guía detallada manual paso a paso
    └── anexos/                       # Documentación inicial (Propuesta Técnica PDF/Excel)
```

---

## 📏 Convenciones y Estándares

| Aspecto | Convención adoptada |
| :--- | :--- |
| **Nomenclatura backend** | Endpoints REST en minúsculas en español/inglés estandarizado (`/api/citas`, `/api/auth/login`), variables snake_case |
| **Nomenclatura frontend** | Componentes en PascalCase (`PanelAdmin.tsx`), hooks en camelCase (`useApp`), tipos en PascalCase |
| **Encabezados pedagógicos** | Todos los archivos de documentación inician con `<!-- ¿Qué? ¿Para qué? ¿Impacto? -->` |
| **Commits** | Conventional Commits con formato semántico y justificación: `feat(citas): agregar validacion de traslape` |
| **Seguridad de contraseñas**| Hashing obligatorio con **bcrypt** (salt rounds integrados). Nunca en texto plano |
| **Variables de entorno** | Ningún secreto hardcodeado; uso estricto de `.env` ignorado por Git con plantilla `.env.example` |

---

## 📚 Documentación Técnica y Requisitos

Accede a la documentación completa según la necesidad:

| Documento | Ubicación | Descripción |
| :--- | :--- | :--- |
| **📚 Índice de documentación** | [`docs/README.md`](docs/README.md) | **Punto de entrada:** mapa de todos los documentos y su estado |
| **Índice de Requisitos** | [`docs/requisitos.md`](docs/requisitos.md) | Las 33 HUs enlazadas con sus 33 CUs, agrupadas por módulo |
| **Requisitos Funcionales (RFs)**| [`docs/requisitos/RFs/`](docs/requisitos/RFs/) | Requisitos funcionales con entradas, proceso, salidas y reglas ⚠️ dos series solapadas |
| **Historias de Usuario (HUs)** | [`docs/requisitos/HUs/`](docs/requisitos/HUs/) | 33 HUs con criterios de aceptación `Dado que / Cuando / Entonces` |
| **Casos de Uso (CUs)** | [`docs/requisitos/CUs/`](docs/requisitos/CUs/) | 33 CUs con secuencias normales, excepciones y diagramas Mermaid |
| **Restricciones del Sistema** | [`docs/requisitos/restricciones.md`](docs/requisitos/restricciones.md) | Restricciones normativas (Ley 1581 Habeas Data), técnicas y de negocio |
| **Migraciones de BD** | [`backend/alembic/README.md`](backend/alembic/README.md) | Uso diario de Alembic, crear migraciones y particularidades de MySQL |
| **Arquitectura de Software** | [`docs/referencia-tecnica/architecture.md`](docs/referencia-tecnica/architecture.md) | Arquitectura en 3 capas, flujo cliente-servidor y decisiones técnicas |
| **Esquema de Base de Datos** | [`docs/referencia-tecnica/database-schema.md`](docs/referencia-tecnica/database-schema.md) | Diccionario de 20 tablas, 4 vistas SQL, claves foráneas e índices |
| **Referencia de API REST** | [`docs/referencia-tecnica/api-endpoints.md`](docs/referencia-tecnica/api-endpoints.md) | Catálogo de los 117 endpoints: método, ruta, autorización, paginación y errores |
| **Design System** | [`docs/referencia-tecnica/design-system.md`](docs/referencia-tecnica/design-system.md) | Tokens de Tailwind v4, paleta negro/blanco/dorado, clases propias y deuda de estilos |
| **Patrones Arquitectónicos** | [`docs/conceptos/patrones-arquitectonicos.md`](docs/conceptos/patrones-arquitectonicos.md) | 10 patrones aplicados (MVC/Capas, DTO, Context API, Component-Driven UI...) |
| **Seguridad OWASP Top 10** | [`docs/conceptos/owasp-top-10.md`](docs/conceptos/owasp-top-10.md) | Análisis y mitigación de vulnerabilidades OWASP 2021 en Globde |
| **Accesibilidad WCAG / ARIA** | [`docs/conceptos/accesibilidad-aria-wcag.md`](docs/conceptos/accesibilidad-aria-wcag.md) | Cumplimiento de estándares de accesibilidad e inclusión web |
| **Guía de Setup Docker** | [`docs/setup/con-docker.md`](docs/setup/con-docker.md) | Despliegue en contenedores, variables y resolución de problemas |
| **Guía de Setup Manual** | [`docs/setup/sin-docker.md`](docs/setup/sin-docker.md) | Configuración manual en entornos locales |
| **Convenciones de Desarrollo** | [`.github/copilot-instructions.md`](.github/copilot-instructions.md) | Reglas técnicas y directrices internas del equipo |

---

## 👥 Roles y Capacidades del Sistema

```
┌────────────────────────────────────────────────────────────────────────┐
│                        ROLES DE USUARIO EN GLOBDE                      │
├───────────────────┬──────────────────────────┬─────────────────────────┤
│ 🧑‍💼 ADMINISTRADOR   │ 💈 BARBERO               │ 🙋 CLIENTE              │
│ (Rol ID = 1)      │ (Rol ID = 2)             │ (Rol ID = 3)            │
├───────────────────┼──────────────────────────┼─────────────────────────┤
│ • Gestión total   │ • Visualización de su    │ • Registro y perfil     │
│   de usuarios     │   agenda diaria          │   autónomo              │
│ • Administración  │ • Agendamiento manual    │ • Catálogo de servicios │
│   de servicios    │   en el salón            │   con precios y tiempos │
│ • Control de      │ • Cambio de estado de    │ • Reserva de citas      │
│   clientes        │   citas (en atención,    │   en tiempo real        │
│ • Asignación de   │   completada)            │ • Cancelación de citas  │
│   barberos        │ • Consulta de su         │   oportuna              │
│ • Reportes de     │   ranking y desempeño    │ • Historial de visitas  │
│   ingresos/citas  │ • Configuración de       │ • Calificación del      │
│ • Configuración   │   disponibilidad         │   servicio prestado     │
│   de fidelización │ • Visualización de       │ • Acumulación y saldo   │
│ • Días festivos   │   comisiones estimadas   │   de puntos de lealtad  │
└───────────────────┴──────────────────────────┴─────────────────────────┘
```

---

## 🎨 Sistema de Diseño (Design System)

La identidad visual de Globde combina elegancia clásica de barbería tradicional con modernidad digital:

| Token Semántico | Valor Hexadecimal | Uso en la Aplicación |
| :--- | :--- | :--- |
| **Color Primario (Dark / Negro)** | `#000000` / `#111827` | Fondos de dashboards, sidebar, tipografía principal y contraste |
| **Color de Acento (Cian Tecnológico)**| `#00BCD4` | Botones de acción, enlaces activos, badges de estado y focos de atención |
| **Color Secundario (Dorado Premium)** | `#D4AF37` | Puntos de fidelización, calificaciones con estrellas, distinciones VIP |
| **Superficie / Tarjetas** | `#1E293B` / `#FFFFFF` | Contenedores modulares, tablas de datos y paneles de métricas |
| **Alertas y Estados** | `#10B981` (Completada), `#F59E0B` (Pendiente), `#EF4444` (Cancelada) | Badges de citas e indicadores visuales de feedback |

---

## 🎓 Propósito Educativo SENA

Este proyecto fue desarrollado en el marco del programa **Tecnólogo en Análisis y Desarrollo de Software (ADSO)** del SENA. Su objetivo es evidenciar el dominio integral de las fases de ingeniería de software:

1. **Análisis y Especificación**: Levantamiento de requisitos formales (RF, HU, CU, RNF, Restricciones).
2. **Diseño de Software y Datos**: Modelado Entidad-Relación, normalización de base de datos y arquitectura en capas.
3. **Construcción y Desarrollo**: Implementación backend con FastAPI y frontend con React + Context API + TypeScript.
4. **Seguridad y Calidad**: Hashing de credenciales, mitigación de riesgos OWASP, accesibilidad WCAG y manejo de excepciones.

---

## ⚠️ Exención de Responsabilidades

Este software fue desarrollado con fines **formativos y educativos**:

* **Entorno Académico**: No debe ser expuesto en entornos de producción con datos reales sin antes incorporar pasarelas de pago cifradas, certificados SSL/TLS y auditorías de seguridad avanzadas.
* **Credenciales de Ejemplo**: Los valores presentes en `.env.example` son únicamente ilustrativos.
* **Protección de Datos Personales**: El sistema implementa principios de la **Ley 1581 de 2012 de Habeas Data** (Colombia) para el tratamiento de datos de contacto de clientes.

---

## 📄 Licencia y Equipo

### Licencia
Este proyecto está licenciado bajo [Creative Commons Atribución-NoComercial-CompartirIgual 4.0 Internacional (CC BY-NC-SA 4.0)](https://creativecommons.org/licenses/by-nc-sa/4.0/deed.es). Eres libre de compartir y adaptar el material para fines educativos no comerciales dando el debido crédito.

### Equipo de Desarrollo — SENA ADSO 2026

| Nombre del Aprendiz | Rol Principal en el Proyecto |
| :--- | :--- |
| **Laura** | Diseño y Administración de Base de Datos (DBA / Data Modeling) |
| **Juan Felipe Cañón** | Desarrollo Backend (FastAPI, Integración MySQL, Autenticación y Endpoints) |
| **Dayanna Patiño** | Desarrollo Frontend (React, TypeScript, Context API, UI/UX & Responsive) |

---
*Globde — Excelencia en la gestión de servicios y barbería.*
