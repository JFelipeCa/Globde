"""¿Qué? Añade el barbero favorito del cliente y actualiza el catálogo destacado.
¿Para qué? Habilita las preferencias persistentes y reservas rápidas del panel.
¿Impacto? La API y las reservas utilizan los cuatro servicios activos seleccionados.
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import mysql

revision: str = "c3d4e5f6a7b8"
down_revision: Union[str, Sequence[str], None] = "b2c3d4e5f6a7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    op.add_column(
        "clientes",
        sa.Column(
            "id_barbero_favorito",
            mysql.BIGINT(unsigned=True),
            nullable=True,
        ),
    )
    op.create_foreign_key(
        "fk_clientes_barbero_favorito",
        "clientes",
        "barberos",
        ["id_barbero_favorito"],
        ["id_barbero"],
        onupdate="CASCADE",
        ondelete="SET NULL",
    )

    op.create_table(
        "globde_cliente_servicios_activos_prev",
        sa.Column("id_servicio", mysql.BIGINT(unsigned=True), nullable=False),
        sa.Column("activo", mysql.TINYINT(display_width=1), nullable=False),
        sa.PrimaryKeyConstraint("id_servicio"),
    )
    op.execute(
        """INSERT INTO globde_cliente_servicios_activos_prev (id_servicio, activo)
           SELECT id_servicio, activo FROM servicios"""
    )

    op.create_table(
        "globde_cliente_servicios_prev",
        sa.Column("id_servicio", mysql.BIGINT(unsigned=True), nullable=False),
        sa.Column("nombre", sa.String(length=120), nullable=False),
        sa.Column("categoria", sa.String(length=50), nullable=False),
        sa.Column("descripcion", sa.Text(), nullable=True),
        sa.Column("precio", sa.DECIMAL(precision=10, scale=2), nullable=False),
        sa.Column("duracion_minutos", mysql.SMALLINT(unsigned=True), nullable=False),
        sa.Column("icono", sa.String(length=80), nullable=True),
        sa.Column("imagen_url", sa.String(length=255), nullable=True),
        sa.Column("puntos_otorga", mysql.INTEGER(unsigned=True), nullable=False),
        sa.Column("popular", mysql.TINYINT(display_width=1), nullable=False),
        sa.Column("activo", mysql.TINYINT(display_width=1), nullable=False),
        sa.PrimaryKeyConstraint("id_servicio"),
    )
    op.execute(
        """INSERT INTO globde_cliente_servicios_prev
           (id_servicio, nombre, categoria, descripcion, precio, duracion_minutos,
            icono, imagen_url, puntos_otorga, popular, activo)
           SELECT id_servicio, nombre, categoria, descripcion, precio, duracion_minutos,
                  icono, imagen_url, puntos_otorga, popular, activo
           FROM servicios
           WHERE nombre IN (
             'Mid Skin Fade + Crop Texturizado',
             'Low Taper con Barba Integrada',
             'Pompadour Moderno con Drop Fade',
             'Buzz Cut con Line-up a Navaja'
           )"""
    )

    op.create_table(
        "globde_cliente_barbero_servicio_prev",
        sa.Column("id_barbero", mysql.BIGINT(unsigned=True), nullable=False),
        sa.Column("id_servicio", mysql.BIGINT(unsigned=True), nullable=False),
        sa.Column("activo", mysql.TINYINT(display_width=1), nullable=False),
        sa.PrimaryKeyConstraint("id_barbero", "id_servicio"),
    )
    op.execute(
        """INSERT INTO globde_cliente_barbero_servicio_prev
           (id_barbero, id_servicio, activo)
           SELECT bs.id_barbero, bs.id_servicio, bs.activo
           FROM barbero_servicio bs
           JOIN servicios s ON s.id_servicio = bs.id_servicio
           WHERE s.nombre IN (
             'Mid Skin Fade + Crop Texturizado',
             'Low Taper con Barba Integrada',
             'Pompadour Moderno con Drop Fade',
             'Buzz Cut con Line-up a Navaja'
           )"""
    )

    op.execute(
        """INSERT INTO servicios
           (nombre, categoria, descripcion, precio, duracion_minutos, icono,
            imagen_url, puntos_otorga, popular, activo)
           VALUES
           ('Mid Skin Fade + Crop Texturizado', 'Cortes',
            'Degradado medio limpio a navaja con parte superior desfilada para volumen y textura.',
            25000, 40, '💈',
            'https://images.pexels.com/photos/12464840/pexels-photo-12464840.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=420&w=640&fm=webp',
            25, 1, 1),
           ('Low Taper con Barba Integrada', 'Cortes',
            'Transición suave en patillas y nuca que se fusiona con una barba densa y perfilada.',
            20000, 30, '✂️',
            'https://images.pexels.com/photos/9971240/pexels-photo-9971240.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=420&w=640&fm=webp',
            20, 0, 1),
           ('Pompadour Moderno con Drop Fade', 'Cortes',
            'Inspiración clásica de los 50 reinventada con caída curva y fijación mate duradera.',
            18000, 25, '🪒',
            'https://images.pexels.com/photos/12464837/pexels-photo-12464837.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=420&w=640&fm=webp',
            20, 1, 1),
           ('Buzz Cut con Line-up a Navaja', 'Cortes',
            'Corte rasurado al ras con contornos rectilíneos y diseño geométrico minimalista.',
            42000, 60, '👑',
            'https://images.pexels.com/photos/34702982/pexels-photo-34702982.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=420&w=640&fm=webp',
            45, 1, 1)
           ON DUPLICATE KEY UPDATE
             categoria = VALUES(categoria),
             descripcion = VALUES(descripcion),
             precio = VALUES(precio),
             duracion_minutos = VALUES(duracion_minutos),
             icono = VALUES(icono),
             imagen_url = VALUES(imagen_url),
             puntos_otorga = VALUES(puntos_otorga),
             popular = VALUES(popular),
             activo = VALUES(activo)"""
    )
    op.execute(
        """UPDATE servicios
           SET activo = CASE
             WHEN nombre IN (
               'Mid Skin Fade + Crop Texturizado',
               'Low Taper con Barba Integrada',
               'Pompadour Moderno con Drop Fade',
               'Buzz Cut con Line-up a Navaja'
             ) THEN 1 ELSE 0 END"""
    )
    op.execute(
        """INSERT INTO barbero_servicio
           (id_barbero, id_servicio, precio_personalizado, activo)
           SELECT b.id_barbero, s.id_servicio, NULL, 1
           FROM barberos b
           JOIN usuarios u ON u.id_usuario = b.id_usuario AND u.activo = 1
           CROSS JOIN servicios s
           WHERE s.nombre IN (
             'Mid Skin Fade + Crop Texturizado',
             'Low Taper con Barba Integrada',
             'Pompadour Moderno con Drop Fade',
             'Buzz Cut con Line-up a Navaja'
           )
           ON DUPLICATE KEY UPDATE activo = 1"""
    )


def downgrade() -> None:
    op.execute(
        """UPDATE barbero_servicio bs
           JOIN servicios s ON s.id_servicio = bs.id_servicio
           LEFT JOIN globde_cliente_barbero_servicio_prev prev
             ON prev.id_barbero = bs.id_barbero AND prev.id_servicio = bs.id_servicio
           SET bs.activo = COALESCE(prev.activo, 0)
           WHERE s.nombre IN (
             'Mid Skin Fade + Crop Texturizado',
             'Low Taper con Barba Integrada',
             'Pompadour Moderno con Drop Fade',
             'Buzz Cut con Line-up a Navaja'
           )"""
    )
    op.execute(
        """UPDATE servicios s
           JOIN globde_cliente_servicios_prev prev
             ON prev.id_servicio = s.id_servicio
           SET s.nombre = prev.nombre,
               s.categoria = prev.categoria,
               s.descripcion = prev.descripcion,
               s.precio = prev.precio,
               s.duracion_minutos = prev.duracion_minutos,
               s.icono = prev.icono,
               s.imagen_url = prev.imagen_url,
               s.puntos_otorga = prev.puntos_otorga,
               s.popular = prev.popular"""
    )
    op.execute(
        """UPDATE servicios s
           JOIN globde_cliente_servicios_activos_prev prev
             ON prev.id_servicio = s.id_servicio
           SET s.activo = prev.activo"""
    )
    op.execute(
        """UPDATE servicios s
           LEFT JOIN globde_cliente_servicios_activos_prev prev
             ON prev.id_servicio = s.id_servicio
           SET s.activo = 0
           WHERE prev.id_servicio IS NULL
             AND s.nombre IN (
               'Mid Skin Fade + Crop Texturizado',
               'Low Taper con Barba Integrada',
               'Pompadour Moderno con Drop Fade',
               'Buzz Cut con Line-up a Navaja'
             )"""
    )
    op.execute("SET FOREIGN_KEY_CHECKS = 0")
    op.drop_table("globde_cliente_barbero_servicio_prev")
    op.drop_table("globde_cliente_servicios_prev")
    op.drop_table("globde_cliente_servicios_activos_prev")
    op.execute("SET FOREIGN_KEY_CHECKS = 1")
    op.drop_constraint(
        "fk_clientes_barbero_favorito", "clientes", type_="foreignkey"
    )
    op.drop_column("clientes", "id_barbero_favorito")
