"""Ayudas para construir respuestas paginadas uniformes."""

from math import ceil
from typing import Any


def paginar(items: list[Any], total: int, pagina: int, por_pagina: int) -> dict:
    """Arma el sobre estandar de respuesta paginada."""
    return {
        "items": items,
        "total": total,
        "pagina": pagina,
        "por_pagina": por_pagina,
        "total_paginas": max(1, ceil(total / por_pagina)) if por_pagina else 1,
    }


def offset_de(pagina: int, por_pagina: int) -> int:
    return max(0, (pagina - 1) * por_pagina)


__all__ = ["paginar", "offset_de"]
