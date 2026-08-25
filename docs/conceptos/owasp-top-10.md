# OWASP Top 10 — Guía de Seguridad y Mitigación en GLOBDE

<!--
  ¿Qué? Análisis y mitigación de las 10 vulnerabilidades más críticas según el estándar OWASP Top 10 (2021) en GLOBDE.
  ¿Para qué? Demostrar la adopción de buenas prácticas de seguridad informática en el desarrollo web profesional.
  ¿Impacto? Protege la aplicación contra ataques de inyección, robo de credenciales y accesos no autorizados.
-->

> **Estándar de Referencia**: [OWASP Top 10 — 2021](https://owasp.org/Top10/)  
> **Ámbito de Aplicación**: Backend FastAPI, Base de Datos MySQL y Frontend React en GLOBDE  

---

## 📊 Matriz de Cumplimiento OWASP en GLOBDE

| Categoría OWASP 2021 | Nivel de Riesgo | Estado en GLOBDE | Mitigación Implementada |
| :--- | :---: | :---: | :--- |
| **A01: Broken Access Control** | Crítico | ✅ Mitigado | Validación de roles (RBAC) en endpoints y `ProtectedRoute.tsx` en React |
| **A02: Cryptographic Failures** | Alto | ✅ Mitigado | Hashing de contraseñas con `bcrypt`, tokens con `secrets.token_urlsafe` |
| **A03: Injection (SQLi / XSS)** | Crítico | ✅ Mitigado | Consultas 100% parametrizadas en MySQL; React escapa variables en el DOM |
| **A04: Insecure Design** | Medio | ✅ Mitigado | Validación de no-traslape de citas y tiempos de expiración de 30 min |
| **A05: Security Misconfiguration** | Medio | ✅ Mitigado | Variables de entorno en `.env`, CORS explícito y control de headers |
| **A06: Vulnerable Components** | Medio | ✅ Mitigado | Dependencias con versiones fijas en `pyproject.toml`/`uv.lock` y `package.json` |
| **A07: Identification & Auth Failures** | Alto | ✅ Mitigado | Mensajes genéricos de error en login para evitar enumeración de usuarios |
| **A08: Software & Data Integrity** | Medio | ✅ Mitigado | Esquemas de validación Pydantic y tipado estricto en TypeScript |
| **A09: Security Logging & Monitoring**| Bajo | ✅ Mitigado | Captura y logging de excepciones con `HTTPException` en el backend |
| **A10: Server-Side Request Forgery** | Bajo | ✅ N/A | La API no consume URLs dinámicas no controladas del usuario |

---

## 1. A01: Control de Acceso Roto (Broken Access Control)
- **Vulnerabilidad**: Un cliente podría intentar modificar citas ajenas o acceder al panel administrativo modificando URLs.
- **Mitigación en GLOBDE**:
  - El frontend evalúa el rol almacenado (`id_rol`: 1=Admin, 2=Barbero, 3=Cliente) antes de renderizar rutas protegidas.
  - El backend valida la identidad y el rol en las operaciones de modificación de estado y reportes.

---

## 2. A02: Fallas Criptográficas (Cryptographic Failures)
- **Vulnerabilidad**: Almacenar contraseñas en texto claro o con algoritmos obsoletos (MD5/SHA1).
- **Mitigación en GLOBDE**:
  - Se utiliza `bcrypt` con cálculo automático de sal:
  ```python
  salt = bcrypt.gensalt()
  contrasena_hash = bcrypt.hashpw(contrasena.encode('utf-8'), salt).decode('utf-8')
  ```
  - Los tokens de restablecimiento usan entropía criptográfica:
  ```python
  token = secrets.token_urlsafe(32)
  ```

---

## 3. A03: Inyección (SQL Injection & XSS)
- **Vulnerabilidad**: Un atacante ingresa `' OR '1'='1` en el campo de búsqueda o correo.
- **Mitigación en GLOBDE**:
  - En MySQL se ejecutan tuplas de parámetros independientes del comando SQL:
  ```python
  cursor.execute("SELECT * FROM usuarios WHERE email = %s AND activo = 1", (email,))
  ```
  - En React, el motor de JSX sanitiza y escapa automáticamente cualquier contenido renderizado en pantalla contra ataques XSS.
