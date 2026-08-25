"""datos semilla

Revision ID: b2c3d4e5f6a7
Revises: dd2ee59368e5
Create Date: 2026-08-19

Carga los datos semilla que antes vivian al final de database.sql:
roles, usuarios de prueba, servicios, horarios y citas de ejemplo.

Van en una migracion aparte de la del esquema a proposito. En produccion
se puede aplicar solo la primera y saltarse esta con:

    alembic upgrade dd2ee59368e5

Las pruebas del backend si las necesitan: el conftest se autentica con
admin@globde.test, y sin esos registros se saltan 91 de las 132 pruebas.
"""

from alembic import op

revision = 'b2c3d4e5f6a7'
down_revision = 'dd2ee59368e5'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Las FKs se desactivan durante la carga porque los INSERT vienen en el
    # orden del archivo original, no en orden topologico.
    op.execute('SET FOREIGN_KEY_CHECKS = 0')

    op.execute("""
INSERT INTO roles (id_rol, nombre, descripcion, activo) VALUES
(1, 'administrador', 'Usuario con permisos administrativos del sistema', TRUE),
(2, 'barbero', 'Usuario encargado de prestar servicios y gestionar agenda', TRUE),
(3, 'cliente', 'Usuario cliente que reserva citas y consulta historial', TRUE)
    """)
    op.execute("""
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
    'Andrés Felipe Rojas',
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
    'Santiago Mejía Ortega',
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
    'Camilo Andrés Restrepo',
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
    'Mariana Gómez Salazar',
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
    'Julián Esteban Vargas',
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
    'Valentina Ruiz Cárdenas',
    'cliente3@example.com',
    '3000000006',
    '$2b$12$bGT/EBbM0WSG2cGWUNAdyekqEhjqv7yrj3dY5wF/1plwLwXvGaS4W',
    NULL,
    TRUE,
    NOW()
)
    """)
    op.execute("""
INSERT INTO clientes (
    id_cliente,
    id_usuario,
    puntos_saldo,
    nivel_fidelizacion
) VALUES
(1, 4, 120, 'Bronce'),
(2, 5, 340, 'Plata'),
(3, 6, 760, 'Oro')
    """)
    op.execute("""
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
    8,
    'Ocho años detrás de la silla. Especialista en cortes clásicos, degradados a navaja y perfilado de barba.',
    'https://images.pexels.com/photos/1319460/pexels-photo-1319460.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=700&w=600&fm=webp',
    4.80,
    25,
    120,
    TRUE,
    '#2563EB'
),
(
    2,
    3,
    'Barbero Estilista',
    4,
    'Apasionado por las tendencias urbanas: fades, diseños con línea y estilos juveniles.',
    'https://images.pexels.com/photos/2076930/pexels-photo-2076930.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=700&w=600&fm=webp',
    4.60,
    18,
    86,
    TRUE,
    '#16A34A'
)
    """)
    op.execute("""
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
)
    """)
    op.execute("""
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
(2, 6, NULL, TRUE)
    """)
    op.execute("""
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
(2, 6, '09:00:00', '15:00:00', TRUE)
    """)
    op.execute("""
INSERT INTO bloqueos_agenda (
    id_barbero,
    fecha,
    hora_inicio,
    hora_fin,
    motivo
) VALUES
(1, '2026-09-16', '12:00:00', '13:00:00', 'Almuerzo')
    """)
    op.execute("""
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
    'Cliente puntual, corte habitual.',
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
    'Confirmada por WhatsApp.',
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
    'Pendiente de confirmar por el cliente.',
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
    'El cliente no se presentó ni avisó.',
    NULL
)
    """)
    op.execute("""
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
    'Pago en efectivo al finalizar el servicio.',
    '2026-08-10 11:05:00',
    '2026-08-10 11:05:00'
)
    """)
    op.execute("""
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
)
    """)
    op.execute("""
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
    'Penalización por inasistencia sin aviso previo.'
)
    """)
    op.execute("""
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
    'Excelente atención, quedé muy conforme con el degradado. Vuelvo sin duda.',
    TRUE
)
    """)
    op.execute("""
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
    'Tu cita fue completada. ¡Gracias por visitarnos!',
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
)
    """)
    op.execute("""
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
    'Se registró una penalidad por no asistir a tu cita.',
    20,
    0.00,
    'aplicada',
    '2026-08-09 16:30:00'
)
    """)
    op.execute("""
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
    'Clásico Caballero',
    'Clásico',
    'Corte atemporal con tijera, peinado hacia un lado y perfilado de patillas.',
    NULL,
    TRUE,
    TRUE
),
(
    2,
    'Fade Medio',
    'Moderno',
    'Degradado progresivo a los lados con volumen y textura en la parte superior.',
    NULL,
    TRUE,
    TRUE
),
(
    4,
    'Combo Ejecutivo',
    'Combo',
    'Estilo completo para presentación en catálogo.',
    NULL,
    FALSE,
    TRUE
)
    """)

    op.execute('SET FOREIGN_KEY_CHECKS = 1')


def downgrade() -> None:
    op.execute('SET FOREIGN_KEY_CHECKS = 0')
    op.execute('DELETE FROM catalogo_cortes')
    op.execute('DELETE FROM penalidades')
    op.execute('DELETE FROM notificaciones')
    op.execute('DELETE FROM resenas')
    op.execute('DELETE FROM puntos_movimientos')
    op.execute('DELETE FROM detalle_factura')
    op.execute('DELETE FROM facturas')
    op.execute('DELETE FROM citas')
    op.execute('DELETE FROM bloqueos_agenda')
    op.execute('DELETE FROM horarios_barbero')
    op.execute('DELETE FROM barbero_servicio')
    op.execute('DELETE FROM servicios')
    op.execute('DELETE FROM barberos')
    op.execute('DELETE FROM clientes')
    op.execute('DELETE FROM usuarios')
    op.execute('DELETE FROM roles')
    op.execute('SET FOREIGN_KEY_CHECKS = 1')
