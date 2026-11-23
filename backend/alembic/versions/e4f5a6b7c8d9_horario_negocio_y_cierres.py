"""¿Qué? Añade horarios generales del negocio y cierres especiales.
¿Para qué? Hace que reservas y disponibilidad respeten el calendario del local.
¿Impacto? La API bloquea días cerrados y franjas fuera del horario general.
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import mysql

revision: str = "e4f5a6b7c8d9"
down_revision: Union[str, Sequence[str], None] = "c3d4e5f6a7b8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "citas",
        sa.Column("completada_en", sa.DateTime(), nullable=True),
    )
    op.execute(
        """UPDATE citas
           SET completada_en = actualizado_en
           WHERE estado = 'completada' AND actualizado_en IS NOT NULL"""
    )

    op.create_table(
        "horarios_negocio",
        sa.Column("id_horario", mysql.BIGINT(unsigned=True), autoincrement=True, nullable=False),
        sa.Column("dia_semana", mysql.TINYINT(unsigned=True), nullable=False),
        sa.Column("hora_inicio", sa.Time(), nullable=False),
        sa.Column("hora_fin", sa.Time(), nullable=False),
        sa.Column(
            "activo",
            mysql.TINYINT(display_width=1),
            server_default=sa.text("1"),
            nullable=False,
        ),
        sa.Column(
            "creado_en",
            sa.DateTime(),
            server_default=sa.text("current_timestamp()"),
            nullable=False,
        ),
        sa.CheckConstraint("`dia_semana` between 1 and 7", name="chk_horario_negocio_dia"),
        sa.CheckConstraint("`hora_fin` > `hora_inicio`", name="chk_horario_negocio_rango"),
        sa.PrimaryKeyConstraint("id_horario"),
    )
    op.create_index(
        "uq_horario_negocio_dia_rango",
        "horarios_negocio",
        ["dia_semana", "hora_inicio", "hora_fin"],
        unique=True,
    )
    op.create_index(
        "idx_horario_negocio_dia_activo",
        "horarios_negocio",
        ["dia_semana", "activo"],
        unique=False,
    )

    op.create_table(
        "cierres_negocio",
        sa.Column("id_cierre", mysql.BIGINT(unsigned=True), autoincrement=True, nullable=False),
        sa.Column("fecha", sa.Date(), nullable=False),
        sa.Column("motivo", sa.String(length=255), nullable=False),
        sa.Column(
            "creado_en",
            sa.DateTime(),
            server_default=sa.text("current_timestamp()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id_cierre"),
        sa.UniqueConstraint("fecha", name="uq_cierre_negocio_fecha"),
    )
    op.create_index("idx_cierres_negocio_fecha", "cierres_negocio", ["fecha"], unique=False)

    op.create_table(
        "cita_extras",
        sa.Column("id_cita_extra", mysql.BIGINT(unsigned=True), autoincrement=True, nullable=False),
        sa.Column("id_cita", mysql.BIGINT(unsigned=True), nullable=False),
        sa.Column("nombre", sa.String(length=80), nullable=False),
        sa.Column("precio", sa.DECIMAL(precision=10, scale=2), nullable=False),
        sa.Column("duracion_minutos", mysql.SMALLINT(unsigned=True), nullable=False),
        sa.ForeignKeyConstraint(
            ["id_cita"], ["citas.id_cita"],
            name="fk_cita_extras_cita", onupdate="CASCADE", ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id_cita_extra"),
    )
    op.create_index("idx_cita_extras_cita", "cita_extras", ["id_cita"], unique=False)

    op.create_table(
        "recordatorios_citas",
        sa.Column("id_recordatorio", mysql.BIGINT(unsigned=True), autoincrement=True, nullable=False),
        sa.Column("id_cita", mysql.BIGINT(unsigned=True), nullable=False),
        sa.Column("proximo_intento", sa.DateTime(), nullable=False),
        sa.Column(
            "estado",
            sa.Enum("pendiente", "procesando", "enviado", "fallido", "cancelado", name="recordatorioscitasestado"),
            server_default="pendiente",
            nullable=False,
        ),
        sa.Column("intentos", mysql.TINYINT(unsigned=True), server_default=sa.text("0"), nullable=False),
        sa.Column("claim_token", sa.String(length=36), nullable=True),
        sa.Column("enviado_en", sa.DateTime(), nullable=True),
        sa.Column(
            "actualizado_en",
            sa.DateTime(),
            server_default=sa.text("current_timestamp() ON UPDATE current_timestamp()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["id_cita"], ["citas.id_cita"],
            name="fk_recordatorios_citas_cita", onupdate="CASCADE", ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id_recordatorio"),
        sa.UniqueConstraint("id_cita", name="uq_recordatorios_citas_cita"),
        sa.CheckConstraint("`intentos` <= 2", name="chk_recordatorios_citas_intentos"),
    )
    op.create_index(
        "idx_recordatorios_estado_proximo",
        "recordatorios_citas",
        ["estado", "proximo_intento"],
        unique=False,
    )

    op.create_table(
        "lista_espera",
        sa.Column("id_espera", mysql.BIGINT(unsigned=True), autoincrement=True, nullable=False),
        sa.Column("id_cliente", mysql.BIGINT(unsigned=True), nullable=False),
        sa.Column("id_servicio", mysql.BIGINT(unsigned=True), nullable=False),
        sa.Column("id_barbero", mysql.BIGINT(unsigned=True), nullable=True),
        sa.Column("fecha_deseada", sa.Date(), nullable=False),
        sa.Column(
            "franja_horaria",
            sa.Enum("manana", "tarde", "cualquiera", name="listaesperafranjahoraria"),
            nullable=False,
        ),
        sa.Column(
            "estado",
            sa.Enum("en_espera", "ofrecida", "reservando", "convertida", "vencida", "cancelada", name="listaesperaestado"),
            server_default="en_espera",
            nullable=False,
        ),
        sa.Column("oferta_hora_inicio", sa.Time(), nullable=True),
        sa.Column("oferta_hora_fin", sa.Time(), nullable=True),
        sa.Column("oferta_expira", sa.DateTime(), nullable=True),
        sa.Column(
            "creado_en",
            sa.DateTime(),
            server_default=sa.text("current_timestamp()"),
            nullable=False,
        ),
        sa.Column(
            "actualizado_en",
            sa.DateTime(),
            server_default=sa.text("current_timestamp() ON UPDATE current_timestamp()"),
            nullable=False,
        ),
        sa.CheckConstraint(
            "(`oferta_hora_inicio` IS NULL AND `oferta_hora_fin` IS NULL) OR "
            "(`oferta_hora_inicio` IS NOT NULL AND `oferta_hora_fin` > `oferta_hora_inicio`)",
            name="chk_lista_espera_oferta_horario",
        ),
        sa.ForeignKeyConstraint(
            ["id_cliente"], ["clientes.id_cliente"],
            name="fk_lista_espera_cliente", onupdate="CASCADE", ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["id_servicio"], ["servicios.id_servicio"],
            name="fk_lista_espera_servicio", onupdate="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["id_barbero"], ["barberos.id_barbero"],
            name="fk_lista_espera_barbero", onupdate="CASCADE", ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id_espera"),
    )
    op.create_index(
        "idx_lista_espera_coincidencia",
        "lista_espera",
        ["estado", "fecha_deseada", "id_servicio", "id_barbero", "creado_en"],
        unique=False,
    )

    op.execute(
        """INSERT INTO horarios_negocio (dia_semana, hora_inicio, hora_fin)
           SELECT dia_semana, MIN(hora_inicio), MAX(hora_fin)
           FROM horarios_barbero
           WHERE activo = 1
           GROUP BY dia_semana"""
    )


def downgrade() -> None:
    op.execute("SET FOREIGN_KEY_CHECKS = 0")
    op.drop_table("lista_espera")
    op.drop_table("recordatorios_citas")
    op.drop_table("cita_extras")
    op.drop_table("cierres_negocio")
    op.drop_table("horarios_negocio")
    op.drop_column("citas", "completada_en")
    op.execute("SET FOREIGN_KEY_CHECKS = 1")
