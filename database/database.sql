CREATE DATABASE IF NOT EXISTS globde
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE globde;

SET NAMES utf8mb4;
SET time_zone = '+00:00';

-- ============================================================
-- LIMPIEZA DE ESTRUCTURA ANTERIOR
-- ============================================================

SET FOREIGN_KEY_CHECKS = 0;

DROP VIEW IF EXISTS vista_citas_detalle;
DROP VIEW IF EXISTS vista_ranking_barberos;
DROP VIEW IF EXISTS vista_resumen_clientes;
DROP VIEW IF EXISTS v_citas_detalle;
DROP VIEW IF EXISTS v_ranking_barberos;
DROP VIEW IF EXISTS v_resumen_clientes;
DROP VIEW IF EXISTS v_dashboard_admin;

DROP TABLE IF EXISTS notificaciones;
DROP TABLE IF EXISTS resenas;
DROP TABLE IF EXISTS puntos_movimientos;
DROP TABLE IF EXISTS detalle_factura;
DROP TABLE IF EXISTS facturas;
DROP TABLE IF EXISTS penalidades;
DROP TABLE IF EXISTS password_reset_tokens;
DROP TABLE IF EXISTS email_logs;
DROP TABLE IF EXISTS login_attempts;
DROP TABLE IF EXISTS audit_logs;
DROP TABLE IF EXISTS citas;
DROP TABLE IF EXISTS bloqueos_agenda;
DROP TABLE IF EXISTS horarios_barbero;
DROP TABLE IF EXISTS barbero_servicio;
DROP TABLE IF EXISTS servicios;
DROP TABLE IF EXISTS catalogo_cortes;
DROP TABLE IF EXISTS clientes;
DROP TABLE IF EXISTS barberos;
DROP TABLE IF EXISTS ranking_barberos;
DROP TABLE IF EXISTS tokens_recuperacion;
DROP TABLE IF EXISTS usuarios;
DROP TABLE IF EXISTS roles;

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================
-- 1. ROLES
-- ============================================================

CREATE TABLE roles (
    id_rol TINYINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL,
    descripcion VARCHAR(180) NOT NULL,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    UNIQUE KEY uq_roles_nombre (nombre)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 2. USUARIOS
-- ============================================================

CREATE TABLE usuarios (
    id_usuario BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    id_rol TINYINT UNSIGNED NOT NULL,

    nombre VARCHAR(120) NOT NULL,
    correo VARCHAR(180) NOT NULL,
    telefono VARCHAR(25) NULL,

    contrasena_hash VARCHAR(255) NOT NULL,
    avatar_url VARCHAR(255) NULL,

    activo BOOLEAN NOT NULL DEFAULT TRUE,
    email_verificado_at DATETIME NULL,
    ultimo_login_at DATETIME NULL,

    creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_en DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE KEY uq_usuarios_correo (correo),
    KEY idx_usuarios_rol (id_rol),
    KEY idx_usuarios_activo (activo),
    KEY idx_usuarios_nombre (nombre),

    CONSTRAINT fk_usuarios_roles
        FOREIGN KEY (id_rol)
        REFERENCES roles(id_rol)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 3. CLIENTES
-- ============================================================

CREATE TABLE clientes (
    id_cliente BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    id_usuario BIGINT UNSIGNED NOT NULL,

    puntos_saldo INT UNSIGNED NOT NULL DEFAULT 0,
    nivel_fidelizacion ENUM('Bronce', 'Plata', 'Oro', 'Diamante') NOT NULL DEFAULT 'Bronce',
    fecha_registro DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_en DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE KEY uq_clientes_usuario (id_usuario),
    KEY idx_clientes_nivel (nivel_fidelizacion),
    KEY idx_clientes_puntos (puntos_saldo),

    CONSTRAINT fk_clientes_usuario
        FOREIGN KEY (id_usuario)
        REFERENCES usuarios(id_usuario)
        ON UPDATE CASCADE
        ON DELETE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 4. BARBEROS
-- ============================================================

CREATE TABLE barberos (
    id_barbero BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    id_usuario BIGINT UNSIGNED NOT NULL,

    titulo VARCHAR(80) NOT NULL DEFAULT 'Barbero',
    experiencia_anios TINYINT UNSIGNED NOT NULL DEFAULT 0,
    bio TEXT NULL,
    foto_url VARCHAR(255) NULL,

    rating DECIMAL(3,2) NOT NULL DEFAULT 0.00,
    total_resenas INT UNSIGNED NOT NULL DEFAULT 0,
    citas_completadas INT UNSIGNED NOT NULL DEFAULT 0,

    disponible BOOLEAN NOT NULL DEFAULT TRUE,
    color VARCHAR(20) NULL,

    creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_en DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE KEY uq_barberos_usuario (id_usuario),
    KEY idx_barberos_disponible (disponible),
    KEY idx_barberos_rating (rating),

    CONSTRAINT fk_barberos_usuario
        FOREIGN KEY (id_usuario)
        REFERENCES usuarios(id_usuario)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    CONSTRAINT chk_barberos_rating
        CHECK (rating >= 0 AND rating <= 5)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 5. SERVICIOS
-- ============================================================

CREATE TABLE servicios (
    id_servicio BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    nombre VARCHAR(120) NOT NULL,
    categoria ENUM('Cortes', 'Barba', 'Combos', 'Tratamientos', 'Infantil') NOT NULL DEFAULT 'Cortes',
    descripcion TEXT NULL,

    precio DECIMAL(10,2) NOT NULL,
    duracion_minutos SMALLINT UNSIGNED NOT NULL,

    icono VARCHAR(80) NULL,
    imagen_url VARCHAR(255) NULL,

    puntos_otorga INT UNSIGNED NOT NULL DEFAULT 0,
    popular BOOLEAN NOT NULL DEFAULT FALSE,
    activo BOOLEAN NOT NULL DEFAULT TRUE,

    creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_en DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE KEY uq_servicios_nombre (nombre),
    KEY idx_servicios_categoria (categoria),
    KEY idx_servicios_activo (activo),
    KEY idx_servicios_popular (popular),

    CONSTRAINT chk_servicios_precio
        CHECK (precio > 0),

    CONSTRAINT chk_servicios_duracion
        CHECK (duracion_minutos > 0)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 6. SERVICIOS POR BARBERO
-- ============================================================

CREATE TABLE barbero_servicio (
    id_barbero_servicio BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    id_barbero BIGINT UNSIGNED NOT NULL,
    id_servicio BIGINT UNSIGNED NOT NULL,

    precio_personalizado DECIMAL(10,2) NULL,
    activo BOOLEAN NOT NULL DEFAULT TRUE,

    creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_en DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE KEY uq_barbero_servicio (id_barbero, id_servicio),
    KEY idx_barbero_servicio_barbero (id_barbero),
    KEY idx_barbero_servicio_servicio (id_servicio),
    KEY idx_barbero_servicio_activo (activo),

    CONSTRAINT fk_barbero_servicio_barbero
        FOREIGN KEY (id_barbero)
        REFERENCES barberos(id_barbero)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    CONSTRAINT fk_barbero_servicio_servicio
        FOREIGN KEY (id_servicio)
        REFERENCES servicios(id_servicio)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    CONSTRAINT chk_barbero_servicio_precio
        CHECK (precio_personalizado IS NULL OR precio_personalizado > 0)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 7. HORARIOS DE BARBERO
-- ============================================================
-- dia_semana:
-- 1 = Lunes
-- 2 = Martes
-- 3 = Miércoles
-- 4 = Jueves
-- 5 = Viernes
-- 6 = Sábado
-- 7 = Domingo
-- ============================================================

CREATE TABLE horarios_barbero (
    id_horario BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    id_barbero BIGINT UNSIGNED NOT NULL,

    dia_semana TINYINT UNSIGNED NOT NULL,
    hora_inicio TIME NOT NULL,
    hora_fin TIME NOT NULL,

    activo BOOLEAN NOT NULL DEFAULT TRUE,
    creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_en DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE KEY uq_horario_barbero_dia_rango (id_barbero, dia_semana, hora_inicio, hora_fin),
    KEY idx_horarios_barbero_dia (id_barbero, dia_semana),
    KEY idx_horarios_activo (activo),

    CONSTRAINT fk_horarios_barbero
        FOREIGN KEY (id_barbero)
        REFERENCES barberos(id_barbero)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    CONSTRAINT chk_horarios_dia
        CHECK (dia_semana BETWEEN 1 AND 7),

    CONSTRAINT chk_horarios_rango
        CHECK (hora_fin > hora_inicio)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 8. BLOQUEOS DE AGENDA
-- ============================================================

CREATE TABLE bloqueos_agenda (
    id_bloqueo BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    id_barbero BIGINT UNSIGNED NOT NULL,

    fecha DATE NOT NULL,
    hora_inicio TIME NOT NULL,
    hora_fin TIME NOT NULL,
    motivo VARCHAR(255) NOT NULL,

    creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    KEY idx_bloqueos_barbero_fecha (id_barbero, fecha),
    KEY idx_bloqueos_fecha (fecha),

    CONSTRAINT fk_bloqueos_barbero
        FOREIGN KEY (id_barbero)
        REFERENCES barberos(id_barbero)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    CONSTRAINT chk_bloqueos_rango
        CHECK (hora_fin > hora_inicio)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 9. CITAS
-- ============================================================

CREATE TABLE citas (
    id_cita BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    codigo_reserva VARCHAR(30) NOT NULL,

    id_cliente BIGINT UNSIGNED NOT NULL,
    id_barbero BIGINT UNSIGNED NOT NULL,
    id_servicio BIGINT UNSIGNED NOT NULL,

    fecha DATE NOT NULL,
    hora_inicio TIME NOT NULL,
    hora_fin TIME NOT NULL,

    estado ENUM(
        'pendiente',
        'confirmada',
        'en_atencion',
        'completada',
        'cancelada',
        'no_asistio'
    ) NOT NULL DEFAULT 'pendiente',

    precio_total DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    descuento_aplicado DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    puntos_canjeados INT UNSIGNED NOT NULL DEFAULT 0,

    observaciones TEXT NULL,
    motivo_cancelacion VARCHAR(255) NULL,

    creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_en DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
    cancelado_en DATETIME NULL,

    UNIQUE KEY uq_citas_codigo_reserva (codigo_reserva),
    KEY idx_citas_cliente_fecha (id_cliente, fecha),
    KEY idx_citas_barbero_fecha (id_barbero, fecha),
    KEY idx_citas_servicio (id_servicio),
    KEY idx_citas_estado (estado),
    KEY idx_citas_fecha_hora (fecha, hora_inicio, hora_fin),

    CONSTRAINT fk_citas_cliente
        FOREIGN KEY (id_cliente)
        REFERENCES clientes(id_cliente)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_citas_barbero
        FOREIGN KEY (id_barbero)
        REFERENCES barberos(id_barbero)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_citas_servicio
        FOREIGN KEY (id_servicio)
        REFERENCES servicios(id_servicio)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT chk_citas_horario
        CHECK (hora_fin > hora_inicio),

    CONSTRAINT chk_citas_precio
        CHECK (precio_total >= 0),

    CONSTRAINT chk_citas_descuento
        CHECK (descuento_aplicado >= 0)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;
-- ============================================================
-- 10. PASSWORD RESET TOKENS
-- ============================================================

CREATE TABLE password_reset_tokens (
    id_token BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    id_usuario BIGINT UNSIGNED NOT NULL,

    token_hash CHAR(64) NOT NULL,

    expires_at DATETIME NOT NULL,
    used_at DATETIME NULL,

    request_ip VARCHAR(45) NULL,
    user_agent VARCHAR(255) NULL,

    creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    UNIQUE KEY uq_password_reset_token_hash (token_hash),
    KEY idx_password_reset_usuario (id_usuario),
    KEY idx_password_reset_expires (expires_at),
    KEY idx_password_reset_used (used_at),
    KEY idx_password_reset_created (creado_en),

    CONSTRAINT fk_password_reset_usuario
        FOREIGN KEY (id_usuario)
        REFERENCES usuarios(id_usuario)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    CONSTRAINT chk_password_reset_fechas
        CHECK (expires_at > creado_en)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 11. EMAIL LOGS
-- ============================================================

CREATE TABLE email_logs (
    id_email BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    id_usuario BIGINT UNSIGNED NULL,

    destinatario VARCHAR(180) NOT NULL,
    tipo ENUM(
        'password_reset',
        'email_verification',
        'confirmacion_cita',
        'cancelacion_cita',
        'recordatorio_cita',
        'factura',
        'notificacion_sistema'
    ) NOT NULL,

    asunto VARCHAR(200) NOT NULL,
    estado ENUM('pendiente', 'enviado', 'fallido') NOT NULL DEFAULT 'pendiente',

    proveedor VARCHAR(80) NULL,
    error TEXT NULL,

    creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    enviado_en DATETIME NULL,

    KEY idx_email_usuario (id_usuario),
    KEY idx_email_destinatario (destinatario),
    KEY idx_email_tipo_estado (tipo, estado),
    KEY idx_email_creado (creado_en),

    CONSTRAINT fk_email_logs_usuario
        FOREIGN KEY (id_usuario)
        REFERENCES usuarios(id_usuario)
        ON UPDATE CASCADE
        ON DELETE SET NULL
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 12. LOGIN ATTEMPTS
-- ============================================================

CREATE TABLE login_attempts (
    id_attempt BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    id_usuario BIGINT UNSIGNED NULL,

    correo_intentado VARCHAR(180) NOT NULL,
    exitoso BOOLEAN NOT NULL DEFAULT FALSE,

    motivo VARCHAR(120) NULL,
    ip VARCHAR(45) NULL,
    user_agent VARCHAR(255) NULL,

    creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    KEY idx_login_usuario (id_usuario),
    KEY idx_login_correo (correo_intentado),
    KEY idx_login_exitoso (exitoso),
    KEY idx_login_ip (ip),
    KEY idx_login_fecha (creado_en),

    CONSTRAINT fk_login_attempts_usuario
        FOREIGN KEY (id_usuario)
        REFERENCES usuarios(id_usuario)
        ON UPDATE CASCADE
        ON DELETE SET NULL
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 13. AUDIT LOGS
-- ============================================================

CREATE TABLE audit_logs (
    id_audit BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    id_usuario BIGINT UNSIGNED NULL,

    accion VARCHAR(100) NOT NULL,
    entidad VARCHAR(100) NOT NULL,
    entidad_id BIGINT UNSIGNED NULL,

    ip VARCHAR(45) NULL,
    user_agent VARCHAR(255) NULL,
    detalles JSON NULL,

    creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    KEY idx_audit_usuario (id_usuario),
    KEY idx_audit_accion (accion),
    KEY idx_audit_entidad (entidad, entidad_id),
    KEY idx_audit_fecha (creado_en),

    CONSTRAINT fk_audit_logs_usuario
        FOREIGN KEY (id_usuario)
        REFERENCES usuarios(id_usuario)
        ON UPDATE CASCADE
        ON DELETE SET NULL
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 14. FACTURAS
-- ============================================================

CREATE TABLE facturas (
    id_factura BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    numero_factura VARCHAR(40) NOT NULL,

    id_cita BIGINT UNSIGNED NOT NULL,

    subtotal DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    descuento DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    impuestos DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    total DECIMAL(10,2) NOT NULL DEFAULT 0.00,

    metodo_pago ENUM(
        'efectivo',
        'tarjeta',
        'transferencia',
        'nequi',
        'daviplata',
        'otro'
    ) NOT NULL DEFAULT 'efectivo',

    estado_pago ENUM(
        'pendiente',
        'pagada',
        'anulada',
        'reembolsada'
    ) NOT NULL DEFAULT 'pendiente',

    observaciones TEXT NULL,

    fecha_emision DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    pagado_en DATETIME NULL,
    anulada_en DATETIME NULL,

    creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_en DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE KEY uq_facturas_numero (numero_factura),
    UNIQUE KEY uq_facturas_cita (id_cita),
    KEY idx_facturas_estado_pago (estado_pago),
    KEY idx_facturas_fecha (fecha_emision),

    CONSTRAINT fk_facturas_cita
        FOREIGN KEY (id_cita)
        REFERENCES citas(id_cita)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT chk_facturas_subtotal
        CHECK (subtotal >= 0),

    CONSTRAINT chk_facturas_descuento
        CHECK (descuento >= 0),

    CONSTRAINT chk_facturas_impuestos
        CHECK (impuestos >= 0),

    CONSTRAINT chk_facturas_total
        CHECK (total >= 0)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 15. DETALLE DE FACTURA
-- ============================================================

CREATE TABLE detalle_factura (
    id_detalle BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    id_factura BIGINT UNSIGNED NOT NULL,
    id_servicio BIGINT UNSIGNED NULL,

    descripcion VARCHAR(180) NOT NULL,
    cantidad SMALLINT UNSIGNED NOT NULL DEFAULT 1,
    precio_unitario DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    descuento DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    subtotal DECIMAL(10,2) NOT NULL DEFAULT 0.00,

    creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    KEY idx_detalle_factura (id_factura),
    KEY idx_detalle_servicio (id_servicio),

    CONSTRAINT fk_detalle_factura
        FOREIGN KEY (id_factura)
        REFERENCES facturas(id_factura)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    CONSTRAINT fk_detalle_servicio
        FOREIGN KEY (id_servicio)
        REFERENCES servicios(id_servicio)
        ON UPDATE CASCADE
        ON DELETE SET NULL,

    CONSTRAINT chk_detalle_cantidad
        CHECK (cantidad > 0),

    CONSTRAINT chk_detalle_precio
        CHECK (precio_unitario >= 0),

    CONSTRAINT chk_detalle_descuento
        CHECK (descuento >= 0),

    CONSTRAINT chk_detalle_subtotal
        CHECK (subtotal >= 0)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 16. PUNTOS MOVIMIENTOS
-- ============================================================

CREATE TABLE puntos_movimientos (
    id_movimiento BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    id_cliente BIGINT UNSIGNED NOT NULL,
    id_cita BIGINT UNSIGNED NULL,
    id_usuario_responsable BIGINT UNSIGNED NULL,

    tipo ENUM(
        'ganancia',
        'canje',
        'ajuste',
        'penalizacion',
        'expiracion'
    ) NOT NULL,

    puntos INT NOT NULL,
    saldo_resultante INT UNSIGNED NULL,

    descripcion VARCHAR(255) NULL,

    creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    KEY idx_puntos_cliente (id_cliente),
    KEY idx_puntos_cita (id_cita),
    KEY idx_puntos_tipo (tipo),
    KEY idx_puntos_fecha (creado_en),
    KEY idx_puntos_responsable (id_usuario_responsable),

    CONSTRAINT fk_puntos_cliente
        FOREIGN KEY (id_cliente)
        REFERENCES clientes(id_cliente)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    CONSTRAINT fk_puntos_cita
        FOREIGN KEY (id_cita)
        REFERENCES citas(id_cita)
        ON UPDATE CASCADE
        ON DELETE SET NULL,

    CONSTRAINT fk_puntos_responsable
        FOREIGN KEY (id_usuario_responsable)
        REFERENCES usuarios(id_usuario)
        ON UPDATE CASCADE
        ON DELETE SET NULL,

    CONSTRAINT chk_puntos_no_cero
        CHECK (puntos <> 0)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 17. RESEÑAS
-- ============================================================

CREATE TABLE resenas (
    id_resena BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    id_cita BIGINT UNSIGNED NOT NULL,
    id_cliente BIGINT UNSIGNED NOT NULL,
    id_barbero BIGINT UNSIGNED NOT NULL,

    calificacion TINYINT UNSIGNED NOT NULL,
    comentario TEXT NULL,

    visible BOOLEAN NOT NULL DEFAULT TRUE,

    creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_en DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE KEY uq_resenas_cita (id_cita),
    KEY idx_resenas_cliente (id_cliente),
    KEY idx_resenas_barbero (id_barbero),
    KEY idx_resenas_calificacion (calificacion),
    KEY idx_resenas_visible (visible),

    CONSTRAINT fk_resenas_cita
        FOREIGN KEY (id_cita)
        REFERENCES citas(id_cita)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    CONSTRAINT fk_resenas_cliente
        FOREIGN KEY (id_cliente)
        REFERENCES clientes(id_cliente)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_resenas_barbero
        FOREIGN KEY (id_barbero)
        REFERENCES barberos(id_barbero)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT chk_resenas_calificacion
        CHECK (calificacion BETWEEN 1 AND 5)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 18. NOTIFICACIONES
-- ============================================================

CREATE TABLE notificaciones (
    id_notificacion BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    id_usuario BIGINT UNSIGNED NOT NULL,

    tipo ENUM(
        'cita',
        'pago',
        'puntos',
        'resena',
        'seguridad',
        'sistema'
    ) NOT NULL DEFAULT 'sistema',

    titulo VARCHAR(160) NOT NULL,
    mensaje TEXT NOT NULL,

    leida BOOLEAN NOT NULL DEFAULT FALSE,
    leida_en DATETIME NULL,

    url_accion VARCHAR(255) NULL,

    creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    KEY idx_notificaciones_usuario (id_usuario),
    KEY idx_notificaciones_tipo (tipo),
    KEY idx_notificaciones_leida (leida),
    KEY idx_notificaciones_fecha (creado_en),

    CONSTRAINT fk_notificaciones_usuario
        FOREIGN KEY (id_usuario)
        REFERENCES usuarios(id_usuario)
        ON UPDATE CASCADE
        ON DELETE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 19. PENALIDADES
-- ============================================================

CREATE TABLE penalidades (
    id_penalidad BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    id_cliente BIGINT UNSIGNED NOT NULL,
    id_cita BIGINT UNSIGNED NULL,

    tipo ENUM(
        'no_asistencia',
        'cancelacion_tardia',
        'incumplimiento',
        'otro'
    ) NOT NULL,

    descripcion VARCHAR(255) NOT NULL,
    puntos_descontados INT UNSIGNED NOT NULL DEFAULT 0,
    monto DECIMAL(10,2) NOT NULL DEFAULT 0.00,

    estado ENUM(
        'pendiente',
        'aplicada',
        'anulada'
    ) NOT NULL DEFAULT 'pendiente',

    creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    aplicada_en DATETIME NULL,
    anulada_en DATETIME NULL,

    KEY idx_penalidades_cliente (id_cliente),
    KEY idx_penalidades_cita (id_cita),
    KEY idx_penalidades_tipo (tipo),
    KEY idx_penalidades_estado (estado),

    CONSTRAINT fk_penalidades_cliente
        FOREIGN KEY (id_cliente)
        REFERENCES clientes(id_cliente)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    CONSTRAINT fk_penalidades_cita
        FOREIGN KEY (id_cita)
        REFERENCES citas(id_cita)
        ON UPDATE CASCADE
        ON DELETE SET NULL,

    CONSTRAINT chk_penalidades_monto
        CHECK (monto >= 0)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 20. CATÁLOGO DE CORTES
-- ============================================================

CREATE TABLE catalogo_cortes (
    id_corte BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    id_servicio BIGINT UNSIGNED NULL,

    nombre VARCHAR(120) NOT NULL,
    categoria VARCHAR(80) NULL,
    descripcion TEXT NULL,
    imagen_url VARCHAR(255) NULL,

    popular BOOLEAN NOT NULL DEFAULT FALSE,
    activo BOOLEAN NOT NULL DEFAULT TRUE,

    creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_en DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,

    KEY idx_catalogo_servicio (id_servicio),
    KEY idx_catalogo_categoria (categoria),
    KEY idx_catalogo_popular (popular),
    KEY idx_catalogo_activo (activo),

    CONSTRAINT fk_catalogo_servicio
        FOREIGN KEY (id_servicio)
        REFERENCES servicios(id_servicio)
        ON UPDATE CASCADE
        ON DELETE SET NULL
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 21. DATOS SEMILLA SEGUROS
-- ============================================================

-- ------------------------------------------------------------
-- ROLES
-- ------------------------------------------------------------

INSERT INTO roles (id_rol, nombre, descripcion, activo) VALUES
(1, 'administrador', 'Usuario con permisos administrativos del sistema', TRUE),
(2, 'barbero', 'Usuario encargado de prestar servicios y gestionar agenda', TRUE),
(3, 'cliente', 'Usuario cliente que reserva citas y consulta historial', TRUE);

-- ------------------------------------------------------------
-- USUARIOS
--
-- Todas las cuentas de demostracion usan la contrasena: Globde2025*
-- El hash es bcrypt con 12 rondas, generado con:
--     python -c "import bcrypt; print(bcrypt.hashpw(b'Globde2025*', bcrypt.gensalt(rounds=12)).decode())"
--
-- Son credenciales de PRUEBA. Cambialas antes de cualquier despliegue real.
-- ------------------------------------------------------------

INSERT INTO usuarios (
    id_usuario,
    id_rol,
    nombre,
    correo,
    telefono,
    contrasena_hash,
    avatar_url,
    activo,
    email_verificado_at
) VALUES
(
    1,
    1,
    'Admin Globde',
    'admin@globde.test',
    '3000000001',
    '$2b$12$bGT/EBbM0WSG2cGWUNAdyekqEhjqv7yrj3dY5wF/1plwLwXvGaS4W',
    NULL,
    TRUE,
    NOW()
),
(
    2,
    2,
    'Barbero Demo Uno',
    'barbero1@globde.test',
    '3000000002',
    '$2b$12$bGT/EBbM0WSG2cGWUNAdyekqEhjqv7yrj3dY5wF/1plwLwXvGaS4W',
    NULL,
    TRUE,
    NOW()
),
(
    3,
    2,
    'Barbero Demo Dos',
    'barbero2@globde.test',
    '3000000003',
    '$2b$12$bGT/EBbM0WSG2cGWUNAdyekqEhjqv7yrj3dY5wF/1plwLwXvGaS4W',
    NULL,
    TRUE,
    NOW()
),
(
    4,
    3,
    'Cliente Demo Uno',
    'cliente1@example.com',
    '3000000004',
    '$2b$12$bGT/EBbM0WSG2cGWUNAdyekqEhjqv7yrj3dY5wF/1plwLwXvGaS4W',
    NULL,
    TRUE,
    NOW()
),
(
    5,
    3,
    'Cliente Demo Dos',
    'cliente2@example.com',
    '3000000005',
    '$2b$12$bGT/EBbM0WSG2cGWUNAdyekqEhjqv7yrj3dY5wF/1plwLwXvGaS4W',
    NULL,
    TRUE,
    NOW()
),
(
    6,
    3,
    'Cliente Demo Tres',
    'cliente3@example.com',
    '3000000006',
    '$2b$12$bGT/EBbM0WSG2cGWUNAdyekqEhjqv7yrj3dY5wF/1plwLwXvGaS4W',
    NULL,
    TRUE,
    NOW()
);

-- ------------------------------------------------------------
-- CLIENTES
-- ------------------------------------------------------------

INSERT INTO clientes (
    id_cliente,
    id_usuario,
    puntos_saldo,
    nivel_fidelizacion
) VALUES
(1, 4, 120, 'Bronce'),
(2, 5, 340, 'Plata'),
(3, 6, 760, 'Oro');

-- ------------------------------------------------------------
-- BARBEROS
-- ------------------------------------------------------------

INSERT INTO barberos (
    id_barbero,
    id_usuario,
    titulo,
    experiencia_anios,
    bio,
    foto_url,
    rating,
    total_resenas,
    citas_completadas,
    disponible,
    color
) VALUES
(
    1,
    2,
    'Barbero Senior',
    5,
    'Especialista en cortes clásicos, degradados y arreglo de barba.',
    NULL,
    4.80,
    25,
    120,
    TRUE,
    '#2563EB'
),
(
    2,
    3,
    'Barbero Profesional',
    3,
    'Especialista en cortes modernos, diseño y estilos juveniles.',
    NULL,
    4.60,
    18,
    86,
    TRUE,
    '#16A34A'
);

-- ------------------------------------------------------------
-- SERVICIOS
-- ------------------------------------------------------------

INSERT INTO servicios (
    id_servicio,
    nombre,
    categoria,
    descripcion,
    precio,
    duracion_minutos,
    icono,
    imagen_url,
    puntos_otorga,
    popular,
    activo
) VALUES
(
    1,
    'Corte Clásico',
    'Cortes',
    'Corte tradicional con máquina y tijera.',
    25000.00,
    30,
    'scissors',
    NULL,
    25,
    TRUE,
    TRUE
),
(
    2,
    'Corte Degradado',
    'Cortes',
    'Corte moderno con degradado personalizado.',
    30000.00,
    40,
    'razor',
    NULL,
    30,
    TRUE,
    TRUE
),
(
    3,
    'Arreglo de Barba',
    'Barba',
    'Perfilado, arreglo y definición de barba.',
    18000.00,
    25,
    'beard',
    NULL,
    18,
    FALSE,
    TRUE
),
(
    4,
    'Corte + Barba',
    'Combos',
    'Servicio completo de corte y arreglo de barba.',
    42000.00,
    60,
    'combo',
    NULL,
    45,
    TRUE,
    TRUE
),
(
    5,
    'Tratamiento Capilar',
    'Tratamientos',
    'Tratamiento básico para cuidado del cabello.',
    35000.00,
    45,
    'sparkles',
    NULL,
    35,
    FALSE,
    TRUE
),
(
    6,
    'Corte Infantil',
    'Infantil',
    'Corte para niños con atención personalizada.',
    22000.00,
    30,
    'child',
    NULL,
    20,
    FALSE,
    TRUE
);

-- ------------------------------------------------------------
-- SERVICIOS POR BARBERO
-- ------------------------------------------------------------

INSERT INTO barbero_servicio (
    id_barbero,
    id_servicio,
    precio_personalizado,
    activo
) VALUES
(1, 1, NULL, TRUE),
(1, 2, NULL, TRUE),
(1, 3, NULL, TRUE),
(1, 4, NULL, TRUE),
(1, 5, NULL, TRUE),
(2, 1, NULL, TRUE),
(2, 2, NULL, TRUE),
(2, 3, NULL, TRUE),
(2, 4, NULL, TRUE),
(2, 6, NULL, TRUE);

-- ------------------------------------------------------------
-- HORARIOS DE BARBEROS
-- ------------------------------------------------------------

INSERT INTO horarios_barbero (
    id_barbero,
    dia_semana,
    hora_inicio,
    hora_fin,
    activo
) VALUES
(1, 1, '08:00:00', '18:00:00', TRUE),
(1, 2, '08:00:00', '18:00:00', TRUE),
(1, 3, '08:00:00', '18:00:00', TRUE),
(1, 4, '08:00:00', '18:00:00', TRUE),
(1, 5, '08:00:00', '18:00:00', TRUE),
(1, 6, '09:00:00', '14:00:00', TRUE),
(2, 1, '10:00:00', '20:00:00', TRUE),
(2, 2, '10:00:00', '20:00:00', TRUE),
(2, 3, '10:00:00', '20:00:00', TRUE),
(2, 4, '10:00:00', '20:00:00', TRUE),
(2, 5, '10:00:00', '20:00:00', TRUE),
(2, 6, '09:00:00', '15:00:00', TRUE);

-- ------------------------------------------------------------
-- BLOQUEOS DE AGENDA DEMO
-- ------------------------------------------------------------

INSERT INTO bloqueos_agenda (
    id_barbero,
    fecha,
    hora_inicio,
    hora_fin,
    motivo
) VALUES
(1, '2026-09-16', '12:00:00', '13:00:00', 'Bloqueo demo por descanso');

-- ------------------------------------------------------------
-- CITAS DEMO
-- ------------------------------------------------------------

INSERT INTO citas (
    id_cita,
    codigo_reserva,
    id_cliente,
    id_barbero,
    id_servicio,
    fecha,
    hora_inicio,
    hora_fin,
    estado,
    precio_total,
    descuento_aplicado,
    puntos_canjeados,
    observaciones,
    cancelado_en
) VALUES
(
    1,
    'GLOBDE-20260810-001',
    1,
    1,
    4,
    '2026-08-10',
    '10:00:00',
    '11:00:00',
    'completada',
    42000.00,
    0.00,
    0,
    'Cita demo completada.',
    NULL
),
(
    2,
    'GLOBDE-20260915-001',
    2,
    2,
    2,
    '2026-09-15',
    '14:00:00',
    '14:40:00',
    'confirmada',
    30000.00,
    0.00,
    0,
    'Cita demo confirmada.',
    NULL
),
(
    3,
    'GLOBDE-20260915-002',
    3,
    1,
    1,
    '2026-09-15',
    '09:00:00',
    '09:30:00',
    'pendiente',
    25000.00,
    0.00,
    0,
    'Cita demo pendiente.',
    NULL
),
(
    4,
    'GLOBDE-20260809-001',
    2,
    1,
    3,
    '2026-08-09',
    '16:00:00',
    '16:25:00',
    'no_asistio',
    18000.00,
    0.00,
    0,
    'Cita demo no asistida.',
    NULL
);

-- ------------------------------------------------------------
-- FACTURAS DEMO
-- ------------------------------------------------------------

INSERT INTO facturas (
    id_factura,
    numero_factura,
    id_cita,
    subtotal,
    descuento,
    impuestos,
    total,
    metodo_pago,
    estado_pago,
    observaciones,
    fecha_emision,
    pagado_en
) VALUES
(
    1,
    'FAC-20260810-001',
    1,
    42000.00,
    0.00,
    0.00,
    42000.00,
    'efectivo',
    'pagada',
    'Factura demo generada para cita completada.',
    '2026-08-10 11:05:00',
    '2026-08-10 11:05:00'
);

INSERT INTO detalle_factura (
    id_factura,
    id_servicio,
    descripcion,
    cantidad,
    precio_unitario,
    descuento,
    subtotal
) VALUES
(
    1,
    4,
    'Corte + Barba',
    1,
    42000.00,
    0.00,
    42000.00
);

-- ------------------------------------------------------------
-- MOVIMIENTOS DE PUNTOS DEMO
-- ------------------------------------------------------------

INSERT INTO puntos_movimientos (
    id_cliente,
    id_cita,
    id_usuario_responsable,
    tipo,
    puntos,
    saldo_resultante,
    descripcion
) VALUES
(
    1,
    1,
    1,
    'ganancia',
    45,
    120,
    'Puntos ganados por cita completada.'
),
(
    2,
    4,
    1,
    'penalizacion',
    -20,
    340,
    'Penalización demo por no asistencia.'
);

-- ------------------------------------------------------------
-- RESEÑAS DEMO
-- ------------------------------------------------------------

INSERT INTO resenas (
    id_cita,
    id_cliente,
    id_barbero,
    calificacion,
    comentario,
    visible
) VALUES
(
    1,
    1,
    1,
    5,
    'Excelente servicio demo.',
    TRUE
);

-- ------------------------------------------------------------
-- NOTIFICACIONES DEMO
-- ------------------------------------------------------------

INSERT INTO notificaciones (
    id_usuario,
    tipo,
    titulo,
    mensaje,
    leida,
    url_accion
) VALUES
(
    4,
    'cita',
    'Cita completada',
    'Tu cita demo fue completada correctamente.',
    FALSE,
    NULL
),
(
    5,
    'seguridad',
    'Recordatorio de seguridad',
    'Mantén actualizada tu información de contacto.',
    FALSE,
    NULL
);

-- ------------------------------------------------------------
-- PENALIDADES DEMO
-- ------------------------------------------------------------

INSERT INTO penalidades (
    id_cliente,
    id_cita,
    tipo,
    descripcion,
    puntos_descontados,
    monto,
    estado,
    aplicada_en
) VALUES
(
    2,
    4,
    'no_asistencia',
    'Penalidad demo por no asistir a la cita.',
    20,
    0.00,
    'aplicada',
    '2026-08-09 16:30:00'
);

-- ------------------------------------------------------------
-- CATÁLOGO DE CORTES DEMO
-- ------------------------------------------------------------

INSERT INTO catalogo_cortes (
    id_servicio,
    nombre,
    categoria,
    descripcion,
    imagen_url,
    popular,
    activo
) VALUES
(
    1,
    'Corte Clásico Demo',
    'Clásico',
    'Estilo tradicional para presentación en catálogo.',
    NULL,
    TRUE,
    TRUE
),
(
    2,
    'Degradado Demo',
    'Moderno',
    'Estilo degradado para presentación en catálogo.',
    NULL,
    TRUE,
    TRUE
),
(
    4,
    'Combo Corte y Barba Demo',
    'Combo',
    'Estilo completo para presentación en catálogo.',
    NULL,
    FALSE,
    TRUE
);


-- ============================================================
-- 22. VISTAS SQL
-- ============================================================
-- ------------------------------------------------------------
-- Vista: Detalle completo de citas
-- ------------------------------------------------------------

CREATE OR REPLACE VIEW v_citas_detalle AS
SELECT
    ci.id_cita,
    ci.codigo_reserva,
    ci.fecha,
    ci.hora_inicio,
    ci.hora_fin,
    TIMESTAMP(ci.fecha, ci.hora_inicio) AS inicio_at,
    TIMESTAMP(ci.fecha, ci.hora_fin) AS fin_at,
    ci.estado,
    ci.precio_total,
    ci.descuento_aplicado,
    ci.puntos_canjeados,
    ci.observaciones,
    ci.motivo_cancelacion,
    ci.creado_en,
    ci.actualizado_en,
    ci.cancelado_en,

    cl.id_cliente,
    cliente_user.id_usuario AS id_usuario_cliente,
    cliente_user.nombre AS cliente_nombre,
    cliente_user.correo AS cliente_correo,
    cliente_user.telefono AS cliente_telefono,
    cl.puntos_saldo AS cliente_puntos_saldo,
    cl.nivel_fidelizacion AS cliente_nivel_fidelizacion,

    b.id_barbero,
    barbero_user.id_usuario AS id_usuario_barbero,
    barbero_user.nombre AS barbero_nombre,
    barbero_user.correo AS barbero_correo,
    barbero_user.telefono AS barbero_telefono,
    b.titulo AS barbero_titulo,
    b.rating AS barbero_rating,
    b.disponible AS barbero_disponible,

    s.id_servicio,
    s.nombre AS servicio_nombre,
    s.categoria AS servicio_categoria,
    s.precio AS servicio_precio_base,
    s.duracion_minutos AS servicio_duracion_minutos,
    s.puntos_otorga AS servicio_puntos_otorga,

    f.id_factura,
    f.numero_factura,
    f.estado_pago,
    f.metodo_pago,
    f.total AS factura_total
FROM citas ci
JOIN clientes cl
    ON cl.id_cliente = ci.id_cliente
JOIN usuarios cliente_user
    ON cliente_user.id_usuario = cl.id_usuario
JOIN barberos b
    ON b.id_barbero = ci.id_barbero
JOIN usuarios barbero_user
    ON barbero_user.id_usuario = b.id_usuario
JOIN servicios s
    ON s.id_servicio = ci.id_servicio
LEFT JOIN facturas f
    ON f.id_cita = ci.id_cita;

-- ------------------------------------------------------------
-- Vista: Resumen de clientes
-- ------------------------------------------------------------

CREATE OR REPLACE VIEW v_resumen_clientes AS
SELECT
    cl.id_cliente,
    u.id_usuario,
    u.nombre,
    u.correo,
    u.telefono,
    u.activo,
    cl.puntos_saldo,
    cl.nivel_fidelizacion,
    cl.fecha_registro,

    COUNT(ci.id_cita) AS total_citas,
    SUM(CASE WHEN ci.estado = 'completada' THEN 1 ELSE 0 END) AS citas_completadas,
    SUM(CASE WHEN ci.estado = 'cancelada' THEN 1 ELSE 0 END) AS citas_canceladas,
    SUM(CASE WHEN ci.estado = 'no_asistio' THEN 1 ELSE 0 END) AS citas_no_asistio,

    COALESCE(SUM(CASE WHEN f.estado_pago = 'pagada' THEN f.total ELSE 0 END), 0) AS total_pagado,
    MAX(ci.fecha) AS ultima_fecha_cita
FROM clientes cl
JOIN usuarios u
    ON u.id_usuario = cl.id_usuario
LEFT JOIN citas ci
    ON ci.id_cliente = cl.id_cliente
LEFT JOIN facturas f
    ON f.id_cita = ci.id_cita
GROUP BY
    cl.id_cliente,
    u.id_usuario,
    u.nombre,
    u.correo,
    u.telefono,
    u.activo,
    cl.puntos_saldo,
    cl.nivel_fidelizacion,
    cl.fecha_registro;

-- ------------------------------------------------------------
-- Vista: Ranking de barberos
-- ------------------------------------------------------------

CREATE OR REPLACE VIEW v_ranking_barberos AS
SELECT
    b.id_barbero,
    u.id_usuario,
    u.nombre,
    u.correo,
    u.telefono,
    b.titulo,
    b.experiencia_anios,
    b.bio,
    b.rating AS rating_registrado,

    COALESCE(resena_stats.rating_resenas, 0) AS rating_resenas,
    COALESCE(resena_stats.total_resenas_visibles, 0) AS total_resenas_visibles,

    b.total_resenas AS total_resenas_registradas,
    b.citas_completadas,
    b.disponible,

    COALESCE(cita_stats.total_citas_asignadas, 0) AS total_citas_asignadas,
    COALESCE(cita_stats.citas_completadas_reales, 0) AS citas_completadas_reales,
    COALESCE(cita_stats.citas_canceladas, 0) AS citas_canceladas,
    COALESCE(cita_stats.citas_no_asistio, 0) AS citas_no_asistio
FROM barberos b
JOIN usuarios u
    ON u.id_usuario = b.id_usuario
LEFT JOIN (
    SELECT
        id_barbero,
        COUNT(*) AS total_citas_asignadas,
        SUM(CASE WHEN estado = 'completada' THEN 1 ELSE 0 END) AS citas_completadas_reales,
        SUM(CASE WHEN estado = 'cancelada' THEN 1 ELSE 0 END) AS citas_canceladas,
        SUM(CASE WHEN estado = 'no_asistio' THEN 1 ELSE 0 END) AS citas_no_asistio
    FROM citas
    GROUP BY id_barbero
) cita_stats
    ON cita_stats.id_barbero = b.id_barbero
LEFT JOIN (
    SELECT
        id_barbero,
        AVG(calificacion) AS rating_resenas,
        COUNT(*) AS total_resenas_visibles
    FROM resenas
    WHERE visible = TRUE
    GROUP BY id_barbero
) resena_stats
    ON resena_stats.id_barbero = b.id_barbero;

-- ------------------------------------------------------------
-- Vista: Dashboard administrativo
-- ------------------------------------------------------------

CREATE OR REPLACE VIEW v_dashboard_admin AS
SELECT
    (SELECT COUNT(*) FROM usuarios WHERE activo = TRUE) AS total_usuarios_activos,
    (SELECT COUNT(*) FROM clientes) AS total_clientes,
    (SELECT COUNT(*) FROM barberos WHERE disponible = TRUE) AS total_barberos_disponibles,
    (SELECT COUNT(*) FROM servicios WHERE activo = TRUE) AS total_servicios_activos,
    (SELECT COUNT(*) FROM citas) AS total_citas,
    (SELECT COUNT(*) FROM citas WHERE estado = 'pendiente') AS citas_pendientes,
    (SELECT COUNT(*) FROM citas WHERE estado = 'confirmada') AS citas_confirmadas,
    (SELECT COUNT(*) FROM citas WHERE estado = 'completada') AS citas_completadas,
    (SELECT COUNT(*) FROM citas WHERE estado = 'cancelada') AS citas_canceladas,
    (SELECT COUNT(*) FROM citas WHERE estado = 'no_asistio') AS citas_no_asistio,
    (SELECT COALESCE(SUM(total), 0) FROM facturas WHERE estado_pago = 'pagada') AS ingresos_pagados,
    (SELECT COUNT(*) FROM password_reset_tokens) AS total_tokens_recuperacion,
    (SELECT COUNT(*) FROM email_logs WHERE estado = 'fallido') AS correos_fallidos,
    NOW() AS generado_en;

-- ============================================================
-- GLOBDE - Base de Datos v2
-- ============================================================
