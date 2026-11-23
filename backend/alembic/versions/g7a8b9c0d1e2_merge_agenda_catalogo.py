"""Unifica las ramas de migraciones de agenda y catálogo."""

from typing import Sequence, Union

revision: str = "g7a8b9c0d1e2"
down_revision: Union[str, Sequence[str], None] = (
    "e4f5a6b7c8d9",
    "f6a7b8c9d0e1",
)
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
