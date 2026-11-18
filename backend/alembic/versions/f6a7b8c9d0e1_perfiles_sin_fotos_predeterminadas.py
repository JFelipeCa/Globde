"""
¿Qué? Retira fotos de stock de los perfiles de usuarios y barberos.
¿Para qué? Mostrar una imagen solo si la persona la subió desde su perfil.
¿Impacto? Los perfiles sin foto quedan vacíos y el frontend muestra un icono.
"""

from alembic import op
import sqlalchemy as sa

revision = "f6a7b8c9d0e1"
down_revision = "e5f6a7b8c9d0"
branch_labels = None
depends_on = None

_AVATARES_ANTERIORES = "globde_perfiles_avatar_stock_prev"
_FOTOS_ANTERIORES = "globde_perfiles_barbero_stock_prev"


def upgrade() -> None:
    op.execute(
        sa.text(
            f"""CREATE TABLE IF NOT EXISTS {_AVATARES_ANTERIORES} (
                    id_usuario BIGINT UNSIGNED PRIMARY KEY,
                    avatar_url VARCHAR(255) NOT NULL
                )"""
        )
    )
    op.execute(
        sa.text(
            f"""CREATE TABLE IF NOT EXISTS {_FOTOS_ANTERIORES} (
                    id_barbero BIGINT UNSIGNED PRIMARY KEY,
                    foto_url VARCHAR(255) NOT NULL
                )"""
        )
    )
    op.execute(
        sa.text(
            f"""INSERT IGNORE INTO {_AVATARES_ANTERIORES} (id_usuario, avatar_url)
                SELECT id_usuario, avatar_url
                FROM usuarios
                WHERE avatar_url LIKE 'https://images.pexels.com/%'"""
        )
    )
    op.execute(
        sa.text(
            f"""INSERT IGNORE INTO {_FOTOS_ANTERIORES} (id_barbero, foto_url)
                SELECT id_barbero, foto_url
                FROM barberos
                WHERE foto_url LIKE 'https://images.pexels.com/%'"""
        )
    )
    op.execute(
        sa.text(
            "UPDATE usuarios SET avatar_url = NULL "
            "WHERE avatar_url LIKE 'https://images.pexels.com/%'"
        )
    )
    op.execute(
        sa.text(
            "UPDATE barberos SET foto_url = NULL "
            "WHERE foto_url LIKE 'https://images.pexels.com/%'"
        )
    )


def downgrade() -> None:
    op.execute(
        sa.text(
            f"""UPDATE usuarios AS actual
                JOIN {_AVATARES_ANTERIORES} AS anterior
                  ON anterior.id_usuario = actual.id_usuario
                SET actual.avatar_url = anterior.avatar_url
                WHERE actual.avatar_url IS NULL"""
        )
    )
    op.execute(
        sa.text(
            f"""UPDATE barberos AS actual
                JOIN {_FOTOS_ANTERIORES} AS anterior
                  ON anterior.id_barbero = actual.id_barbero
                SET actual.foto_url = anterior.foto_url
                WHERE actual.foto_url IS NULL"""
        )
    )
    op.drop_table(_FOTOS_ANTERIORES)
    op.drop_table(_AVATARES_ANTERIORES)
