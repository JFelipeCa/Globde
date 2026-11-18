"""
¿Qué? Actualiza las fotos de los barberos por imágenes de cortes en progreso.
¿Para qué? Hace que las tarjetas del equipo muestren imágenes relacionadas con barbería.
¿Impacto? La API y las vistas que usan barberos muestran las nuevas fotos.
"""

from alembic import op
import sqlalchemy as sa

revision = "e5f6a7b8c9d0"
down_revision = "d4e5f6a7b8c9"
branch_labels = None
depends_on = None

_FOTOS = {
    1: (
        "https://images.pexels.com/photos/12304510/pexels-photo-12304510.jpeg"
        "?auto=compress&cs=tinysrgb&fit=crop&h=700&w=600&fm=webp"
    ),
    2: (
        "https://images.pexels.com/photos/19664860/pexels-photo-19664860.jpeg"
        "?auto=compress&cs=tinysrgb&fit=crop&h=700&w=600&fm=webp"
    ),
}

_FOTOS_ANTERIORES = {
    1: (
        "https://images.pexels.com/photos/1319460/pexels-photo-1319460.jpeg"
        "?auto=compress&cs=tinysrgb&fit=crop&h=700&w=600&fm=webp"
    ),
    2: (
        "https://images.pexels.com/photos/2076930/pexels-photo-2076930.jpeg"
        "?auto=compress&cs=tinysrgb&fit=crop&h=700&w=600&fm=webp"
    ),
}


def _actualizar_fotos(fotos: dict[int, str]) -> None:
    bind = op.get_bind()
    for id_barbero, foto_url in fotos.items():
        bind.execute(
            sa.text(
                "UPDATE barberos SET foto_url = :foto_url "
                "WHERE id_barbero = :id_barbero"
            ),
            {"id_barbero": id_barbero, "foto_url": foto_url},
        )


def upgrade() -> None:
    _actualizar_fotos(_FOTOS)


def downgrade() -> None:
    _actualizar_fotos(_FOTOS_ANTERIORES)
