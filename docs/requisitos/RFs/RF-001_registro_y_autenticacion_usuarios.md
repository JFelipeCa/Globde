# RF-001 — Registro y Autenticación de Usuarios

<!--
  ¿Qué? Requisito funcional que define el registro de usuarios y el inicio de sesión en el sistema GLOBDE.
  ¿Para qué? Proveer un mecanismo seguro de autenticación e identificación según el rol del usuario (Admin, Barbero, Cliente).
  ¿Impacto? Es la puerta de entrada a la plataforma; sin autenticación, no se puede garantizar el control de acceso ni la autoría de citas.
-->

---

## Identificación

| Campo | Valor |
| :--- | :--- |
| **ID** | RF-001 |
| **Nombre** | Registro y Autenticación de Usuarios |
| **Módulo** | Autenticación y Seguridad |
| **Prioridad** | Alta |
| **Estado** | Implementado |
| **HUs Asociadas** | HU-01, HU-02 |
| **Fecha** | Febrero 2026 |

---

## Descripción

El sistema debe permitir que cualquier usuario cliente se registre de forma autónoma ingresando sus datos personales y credenciales. Además, debe permitir el inicio de sesión a usuarios existentes (Clientes, Barberos y Administradores) validando su correo y contraseña encriptada, retornando los datos del perfil y su rol correspondiente para la navegación en el frontend.

---

## Entradas

| Campo | Tipo | Obligatorio | Validaciones |
| :--- | :--- | :--- | :--- |
| `nombre` | Texto | Sí | Mínimo 3 caracteres, solo letras y espacios |
| `email` | Texto (Email) | Sí | Formato de correo válido (`user@dominio.ext`), único en tabla `usuarios` |
| `contrasena` | Texto | Sí | Mínimo 6 caracteres |
| `telefono` | Texto | Opcional | Formato numérico de 7 a 10 dígitos |
| `direccion` | Texto | Opcional | Máximo 255 caracteres |

---

## Proceso

1. El usuario accede a la vista de Login (`/login`) o Registro y diligencia los campos solicitados.
2. El frontend valida la integridad de los campos antes de enviar la petición HTTP con `apiClient.ts` (basado en `fetch`).
3. El backend recibe la solicitud en el endpoint correspondiente (`POST /api/login` o `POST /api/clientes`).
4. En caso de registro:
   a. Verifica que el `email` no exista previamente en la tabla `usuarios`.
   b. Aplica `bcrypt.hashpw` con salt a la contraseña.
   c. Inserta el registro en la tabla `usuarios` con `id_rol = 3` (Cliente).
   d. Inserta el registro complementario en la tabla `clientes` asociado al nuevo `id_usuario`.
5. En caso de login:
   a. Consulta la tabla `usuarios` por `email` y verifica que `activo = 1`.
   b. Compara el hash de la contraseña mediante `bcrypt.checkpw(contrasena, contrasena_hash)`.
   c. Si coincide, recupera el rol y los datos complementarios del usuario.
6. El backend retorna el objeto del usuario autenticado con código HTTP 200/201.
7. El frontend almacena el usuario en el estado global de la aplicación (`AppContext`) y muestra el panel correspondiente según el rol.

---

## Salidas

| Escenario | Código HTTP | Respuesta JSON |
| :--- | :--- | :--- |
| Login Exitoso | 200 OK | `{"id_usuario": 1, "nombre": "Juan Felipe", "email": "admin@globde.com", "id_rol": 1, "rol": "Administrador"}` |
| Registro Exitoso | 201 Created | `{"id_cliente": 5, "id_usuario": 12, "nombre": "Carlos Perez", "email": "carlos@mail.com", "puntos": 0}` |
| Credenciales Inválidas | 401 Unauthorized | `{"detail": "Correo o contraseña incorrectos"}` |
| Usuario Inactivo | 403 Forbidden | `{"detail": "El usuario se encuentra inactivo. Contacte al administrador."}` |
| Correo Duplicado | 400 Bad Request | `{"detail": "El correo electrónico ya se encuentra registrado"}` |

---

## Endpoints Asociados

| Método | Ruta | Auth Requerida | Descripción |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/login` | No | Autentica usuario y retorna perfil con rol |
| `POST` | `/api/clientes` | No | Registra un nuevo cliente con credenciales |
| `POST` | `/api/usuarios/interno` | Sí (Admin) | Registra barberos o administradores internos |

---

## Reglas de Negocio

- **RN-001.1**: El correo electrónico es único en todo el sistema.
- **RN-001.2**: Las contraseñas deben ser hasheadas con bcrypt antes de persistir en MySQL.
- **RN-001.3**: Los usuarios registrados por la landing page se crean siempre con rol Cliente (`id_rol = 3`).
- **RN-001.4**: Solo un usuario con rol Administrador (`id_rol = 1`) puede dar de alta nuevos Barberos o Administradores.
