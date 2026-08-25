# Reglas y Convenciones de Desarrollo — GLOBDE

<!--
  ¿Qué? Reglas y estándares de desarrollo para el proyecto GLOBDE.
  ¿Para qué? Asegurar que cualquier desarrollador o asistente de IA mantenga la coherencia
             arquitectónica, la calidad del código y los estándares pedagógicos del SENA.
  ¿Impacto? Evita la degradación del código, malas prácticas de seguridad y desalineación con la documentación.
-->

## 1. Principios Fundamentales del Proyecto

1. **Propósito Formativo y Profesional**: Todo código desarrollado debe ser claro, limpio, autodocumentado y seguir las mejores prácticas de la industria.
2. **Encabezados Pedagógicos Obligatorios**: Todos los archivos de documentación técnica, esquemas y módulos conceptuales deben iniciar con el bloque de comentarios:
   ```markdown
   <!--
     ¿Qué? Descripción clara de la funcionalidad o módulo.
     ¿Para qué? Propósito técnico y de negocio.
     ¿Impacto? Consecuencias de su ausencia o mala implementación.
   -->
   ```
3. **Separación Estricta de Responsabilidades**:
   - Backend (`backend/`): Expone exclusivamente API REST en FastAPI, valida esquemas con Pydantic y gestiona datos en MySQL.
   - Frontend (`frontend/`): Aplicación SPA en React 19 + Vite 7 + TypeScript, con **React Context API** (`src/context/AppContext.tsx`) para el estado centralizado.
   - Base de Datos: el esquema se versiona con **Alembic** en `backend/alembic/versions/`. `database/database.sql` es solo referencia histórica y no se ejecuta.

---

## 2. Convenciones de Backend (FastAPI + Python 3.13)

- **Tipado Estricto**: Utilizar type hints en todas las funciones y endpoints (`def obtener_citas(id_barbero: int) -> list[dict]:`).
- **Validación con Pydantic**: Todo request body debe tener su correspondiente clase que herede de `pydantic.BaseModel`.
- **Manejo de Errores HTTP**: Utilizar `fastapi.HTTPException` con códigos de estado semánticos apropiados:
  - `200 OK`: Consulta o actualización exitosa.
  - `201 Created`: Creación exitosa de recurso.
  - `400 Bad Request`: Datos de entrada inválidos o regla de negocio infringida.
  - `401 Unauthorized`: Credenciales inválidas.
  - `403 Forbidden`: Acceso denegado por rol no autorizado.
  - `404 Not Found`: Recurso no encontrado.
  - `500 Internal Server Error`: Excepción no controlada del servidor.
- **Seguridad en Base de Datos**: NUNCA concatenar valores en consultas SQL. Utilizar siempre consultas parametrizadas con `cursor.execute(query, params)`.
- **Criptografía**: Usar `bcrypt.hashpw()` y `bcrypt.checkpw()` para el almacenamiento y validación de contraseñas.

---

## 3. Convenciones de Frontend (React 19 + TypeScript + Context API)

- **TypeScript Estricto**: No utilizar `any`. Definir contratos de interfaz claros en `src/types/index.ts` o en el módulo correspondiente.
- **Manejo de Estado Global**: todo el estado compartido vive en `src/context/AppContext.tsx`
  (usuario actual, sesión, rol `id_rol` 1=Admin / 2=Barbero / 3=Cliente, vista activa y colecciones
  de citas, barberos, servicios y clientes). Se consume con `useContext`. **No se usa Redux.**
- **Componentes Modulares**: `src/components/ui/` para componentes reutilizables,
  `src/components/paneles/` para las vistas por rol y `src/components/sections/` para secciones de la landing.
- **Navegación**: la aplicación **no usa React Router**; `App.tsx` conmuta la vista según el estado
  de `AppContext`. El control de acceso por rol se resuelve ahí mismo, no con un `ProtectedRoute`.
- **Cliente HTTP**: usar `src/utils/apiClient.ts` (basado en `fetch`, lee `VITE_API_URL`). No se usa Axios.
- **Estilos**: Tailwind CSS v4 vía `@tailwindcss/vite`; los tokens se declaran con `@theme` en `src/index.css`.
  Preferir clases utilitarias y tokens del tema antes que valores arbitrarios `[#hex]` o `!important`.
- **Tokens de Color y Estilos**: Respetar la paleta oficial de Globde:
  - Dark Surface / Negro: `#000000` / `#111827`
  - Cian Acento: `#00BCD4`
  - Dorado Lealtad: `#D4AF37`
  - Texto Claro: `#F8FAFC` / `#FFFFFF`

---

## 4. Convenciones de Commits (Conventional Commits)

Cada commit en el repositorio debe seguir el formato semántico:

```text
<tipo>(<alcance>): <descripción concisa en español o inglés>

- ¿Qué? Breve explicación del cambio realizado.
- ¿Para qué? Justificación del requerimiento o corrección.
- ¿Impacto? Efecto en el sistema o módulos dependientes.
```

### Tipos de commit permitidos:
- `feat`: Nueva funcionalidad agregada al sistema.
- `fix`: Corrección de un error o bug reportado.
- `docs`: Modificación o adición de documentación (`README`, `docs/`, etc.).
- `style`: Ajustes visuales, formateo o estilos sin afectar la lógica.
- `refactor`: Refactorización de código sin cambiar comportamiento externo.
- `test`: Adición o ajuste de pruebas unitarias o de integración.
- `chore`: Tareas de mantenimiento, dependencias o configuración del repositorio.

---

## 5. Gestión de Secretos y Variables de Entorno

1. El archivo `.env` está estrictamente ignorado por `.gitignore` y **NUNCA debe ser comiteado**.
2. Siempre mantener actualizado `.env.example` con los nombres de todas las variables requeridas y valores de prueba ficticios:
   - `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`
   - `JWT_SECRET`, `JWT_ALGORITHM`, `ACCESS_TOKEN_MINUTES`, `REFRESH_TOKEN_DAYS`, `BCRYPT_ROUNDS`
   - `APP_ENV`, `DEBUG`, `FRONTEND_URL`, `CORS_ORIGINS`, `RESET_TOKEN_MINUTES`
   - `EMAIL_ENABLED`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM`, `SMTP_STARTTLS`
3. `DB_PASSWORD` y `JWT_SECRET` se entregan **vacías** en `.env.example` a propósito: no debe existir
   ninguna contraseña por defecto en el repositorio. `docker-compose.yml` falla de forma explícita si
   `DB_PASSWORD` no está definida.

---

## 6. Base de Datos y Migraciones

1. **Alembic es la única fuente de verdad del esquema.** Nunca editar `database/database.sql` para
   introducir un cambio: crear una migración con `alembic revision -m "..."`.
2. Toda migración debe implementar `upgrade()` **y** `downgrade()`. En MySQL, el `downgrade` debe
   envolverse con `SET FOREIGN_KEY_CHECKS=0` antes de los `drop_table`.
3. Las vistas SQL se crean con `op.execute("CREATE OR REPLACE VIEW ...")` dentro de la migración.
4. MySQL no revierte DDL: si una migración falla a mitad, recrear la base (`docker compose down -v`)
   antes de reintentar.
