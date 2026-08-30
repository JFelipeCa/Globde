# Restricciones del Sistema — GLOBDE

<!--
  ¿Qué? Documentación formal de las restricciones que limitan el diseño, desarrollo y operación de GLOBDE.
  ¿Para qué? Establecer los límites técnicos, normativos, de negocio y de infraestructura que deben respetarse.
  ¿Impacto? Evita desviaciones en el alcance, problemas legales por tratamiento de datos y fallos en producción.
-->

---

## 1. Restricciones Técnicas y de Plataforma

| ID | Restricción | Justificación / Impacto |
| :--- | :--- | :--- |
| **RT-001** | **Motor de Base de Datos MySQL 8.0+ / MariaDB** | El sistema utiliza dialecto MySQL con claves foráneas `InnoDB`, vistas SQL y tipos de datos `DECIMAL`, `DATE`, `TIME`. No es compatible con bases NoSQL sin un refactor completo. |
| **RT-002** | **Backend en Python 3.13+ con FastAPI** | `backend/pyproject.toml` declara `requires-python = ">=3.13"` y la imagen base es `python:3.13-slim`. Se requiere 3.13 o superior para el soporte óptimo de type hints modernos, `pydantic` v2 y el servidor asíncrono `uvicorn`. |
| **RT-003** | **Frontend en React 19 con TypeScript en modo estricto** | Todo el código de interfaz debe compilar bajo TypeScript sin flags `noImplicitAny` desactivados para garantizar la integridad de tipos en los contratos de datos. |
| **RT-004** | **Arquitectura REST desacoplada (CORS)** | El frontend y el backend operan como servicios independientes comunicados exclusivamente mediante peticiones HTTP/JSON sobre CORS configurado. |
| **RT-005** | **Almacenamiento de secretos exclusivo en `.env`** | Queda estrictamente prohibido hardcodear contraseñas de bases de datos, claves maestras o tokens SMTP en el código fuente versionado en Git. |

---

## 2. Restricciones Legales y Regulatorias

| ID | Restricción | Cumplimiento en GLOBDE |
| :--- | :--- | :--- |
| **RL-001** | **Ley 1581 de 2012 (Habeas Data — Colombia)** | Los datos personales de clientes (nombres, teléfonos, correos) se capturan con autorización implícita al registrarse y no son compartidos con terceros con fines publicitarios. |
| **RL-002** | **No almacenamiento de contraseñas en claro** | En cumplimiento con estándares de ciberseguridad, las contraseñas se almacenan procesadas mediante función de hashing irreversible con sal (`bcrypt`). |
| **RL-003** | **Licencia CC BY-NC-SA 4.0** | El código fuente y su documentación tienen fines formativos para el SENA; queda prohibida su explotación comercial sin consentimiento. |

---

## 3. Restricciones de Negocio y Operativas

| ID | Restricción | Regla Aplicada |
| :--- | :--- | :--- |
| **RN-001** | **No superposición de citas por barbero** | Un barbero no puede tener dos citas agendadas en el mismo rango de fecha y hora. El sistema debe validar la disponibilidad antes de confirmar la reserva. |
| **RN-002** | **Horario comercial de atención** | El sistema solo permite agendar citas dentro del horario hábil de la barbería (Lunes a Sábado de 08:00 a 20:00 y Domingos/Festivos según configuración). |
| **RN-003** | **Anticipación mínima de cancelación** | La cancelación autónoma por parte del cliente debe realizarse con un mínimo de 2 horas de anticipación; de lo contrario, el sistema puede generar un registro de penalidad. |
| **RN-004** | **Unicidad de cuenta por correo electrónico** | No pueden existir dos cuentas registradas con el mismo correo electrónico en la tabla `usuarios`. |
| **RN-005** | **Expiración de tokens de recuperación** | Los enlaces y tokens de restablecimiento de contraseña tienen una vigencia máxima de 30 minutos y quedan invalidados inmediatamente tras su uso. |

---

## 4. Excepción declarada: nomenclatura de código (ID: REX-001)

> Norma del proyecto: **nomenclatura técnica en inglés** y documentación en español.
> El código real de GLOBDE nombró de forma **consistente en español** (ej.
> `obtener_usuario_actual`, `citas_service`, `franjasOcupadas`, `mapCitaApi`).

| ID | Decisión | Justificación (gestión de riesgo) |
| :--- | :--- | :--- |
| **REX-001** | **Se conserva la nomenclatura en español y NO se renombra** | El backend tiene **132 pruebas** (ID REX-001-1) y el frontend un contrato de tipos estrecho. Un renombrado masivo a 15 días de la entrega rompería las pruebas y consumiría el carril crítico sin añadir una sola funcionalidad. |

**Alcance de la excepción:**
- Aplica a **identificadores de código** (nombres de función, variables, servicios de dominio, rutas de módulos): el backend usa `app/services/citas_service.py`, `app/routers/citas.py`, `app/core/dependencies.py` y el frontend usa `obtener_usuario_actual`, `franjasOcupadas`, etc.
- **No se aplica** a la **documentación, la API expuesta ni los contratos**:
  - Los endpoints públicos se documentan en español y con descriptores claros.
  - Los campos JSON de la API son los del esquema de base de datos (snake_case), que no se renombran.
  - La nomenclatura técnica que la norma exige (arquitectura, cadenas de CORS, nombres de tablas, tipos) permanece en inglés cuando es convención (ej. `id_rol`, `access_token`).

**Fundamento de la excepción (RT-001 a RT-005):** la norma de idioma es una restricción de consistencia, no de funcionalidad. Dado que el 100 % del código compila y las 132 pruebas pasan, el riesgo de un renombrado global (> 200 símbolos) supera el beneficio estético a 15 días de la sustentación. Se documenta como **decisión deliberada de gestión de riesgo**.
