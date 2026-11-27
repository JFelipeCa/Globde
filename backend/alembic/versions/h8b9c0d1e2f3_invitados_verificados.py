"""
¿Qué? Permite gestionar reservas de invitados con correo verificado.
¿Para qué? Conserva sus citas y solicitudes en los mismos historiales que clientes registrados.
¿Impacto? Los invitados pueden reservar sin cuenta y reclamar su historial al activar su perfil.
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import mysql

revision: str = "h8b9c0d1e2f3"
down_revision: Union[str, Sequence[str], None] = "g7a8b9c0d1e2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "usuarios",
        sa.Column("es_invitado", sa.Boolean(), server_default=sa.text("0"), nullable=False),
    )
    op.create_table(
        "verificaciones_invitado",
        sa.Column("id_solicitud", mysql.BIGINT(unsigned=True), autoincrement=True, nullable=False),
        sa.Column("tipo", sa.String(length=16), nullable=False),
        sa.Column("correo", sa.String(length=180), nullable=False),
        sa.Column("payload", sa.JSON(), nullable=False),
        sa.Column("codigo_hash", sa.String(length=64), nullable=False),
        sa.Column("intentos", mysql.SMALLINT(unsigned=True), server_default=sa.text("0"), nullable=False),
        sa.Column("expira_en", sa.DateTime(), nullable=False),
        sa.Column("consumido_en", sa.DateTime(), nullable=True),
        sa.Column("request_ip", sa.String(length=45), nullable=True),
        sa.Column("creado_en", sa.DateTime(), server_default=sa.text("current_timestamp()"), nullable=False),
        sa.CheckConstraint("tipo IN ('cita', 'lista_espera')", name="chk_verificaciones_invitado_tipo"),
        sa.PrimaryKeyConstraint("id_solicitud"),
    )
    op.create_index(
        "idx_verificaciones_invitado_correo_creado",
        "verificaciones_invitado",
        ["correo", "creado_en"],
    )
    op.create_index(
        "idx_verificaciones_invitado_ip_creado",
        "verificaciones_invitado",
        ["request_ip", "creado_en"],
    )


def downgrade() -> None:
    op.execute("SET FOREIGN_KEY_CHECKS = 0")
    op.drop_index("idx_verificaciones_invitado_ip_creado", table_name="verificaciones_invitado")
    op.drop_index("idx_verificaciones_invitado_correo_creado", table_name="verificaciones_invitado")
    op.drop_table("verificaciones_invitado")
    op.drop_column("usuarios", "es_invitado")
    op.execute("SET FOREIGN_KEY_CHECKS = 1")
