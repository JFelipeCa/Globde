# RNF-001 — Seguridad de la Información

<!--
  ¿Qué? Requisito no funcional que define las salvaguardas de seguridad lógica, autenticación y protección de datos.
  ¿Para qué? Garantizar la confidencialidad, integridad y disponibilidad de la información de clientes, citas y transacciones.
  ¿Impacto? Un fallo de seguridad expondría información sensible de clientes o permitiría la alteración no autorizada de citas.
-->

---

## Identificación

| Campo | Valor |
| :--- | :--- |
| **ID** | RNF-001 |
| **Nombre** | Seguridad de la Información |
| **Categoría** | Seguridad (ISO/IEC 25010 - Confidentiality, Integrity, Non-repudiation) |
| **Prioridad** | Crítica (Obligatoria) |
| **Estado** | Implementado |

---

## Especificación de Requisitos

### RNF-001.1 — Hashing Criptográfico de Contraseñas
Todas las contraseñas de los usuarios en la tabla `usuarios` deben almacenarse mediante el algoritmo **bcrypt** con salt aleatorio generado automáticamente por la librería. Bajo ninguna circunstancia se admitirá texto plano ni en la base de datos ni en los logs de la aplicación.

### RNF-001.2 — Prevención de Inyección SQL (SQL Injection)
Todas las operaciones con la base de datos MySQL en `backend/app/main.py` deben realizarse exclusivamente mediante **consultas parametrizadas** (`cursor.execute(query, (param1, param2))`). Queda prohibida la concatenación de variables en sentencias SQL.

### RNF-001.3 — Control de Acceso Basado en Roles (RBAC)
El sistema debe segmentar las capacidades según tres roles predefinidos:
- **Rol 1 (Administrador)**: Acceso irrestricto a usuarios, servicios, clientes, reportes y configuración.
- **Rol 2 (Barbero)**: Acceso restringido a su agenda diaria, actualización de estado de sus citas y disponibilidad.
- **Rol 3 (Cliente)**: Acceso restringido a su perfil, reserva de citas, historial y saldo de puntos.
Tanto el frontend (`ProtectedRoute.tsx`) como los endpoints del backend deben validar la pertenencia del rol.

### RNF-001.4 — Tokens de Recuperación de Contraseña de Uso Único
Los tokens generados para recuperación de credenciales (`POST /api/password/forgot`) deben generarse mediante generadores pseudoaleatorios criptográficamente seguros (`secrets.token_urlsafe(32)`), poseer un tiempo de vida máximo de 30 minutos y registrarse en la tabla `password_reset_tokens` con marca de un solo uso.

### RNF-001.5 — Aislamiento de Variables de Entorno
Credenciales de acceso a MySQL, puertos y configuraciones de correo SMTP no deben estar incrustadas en el código fuente. Se debe utilizar `python-dotenv` cargando los parámetros desde `.env` no versionado.
