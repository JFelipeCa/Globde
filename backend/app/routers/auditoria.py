"""Rutas de consulta de los registros de auditoria y seguridad (solo admin)."""

from fastapi import APIRouter, Query

from app.core.dependencies import SoloAdmin
from app.db.database import fetch_all
from app.services.auditoria_service import listar_auditoria, listar_intentos_login

router = APIRouter(prefix="/auditoria", tags=["Auditoria"])


@router.get("", response_model=list[dict], summary="Bitacora de acciones")
def auditoria(
    _: SoloAdmin,
    id_usuario: int | None = None,
    accion: str | None = None,
    entidad: str | None = None,
    limite: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
):
    return listar_auditoria(
        limite=limite, offset=offset, accion=accion, entidad=entidad, id_usuario=id_usuario
    )


@router.get("/login", response_model=list[dict], summary="Intentos de inicio de sesion")
def intentos_login(
    _: SoloAdmin,
    solo_fallidos: bool = False,
    limite: int = Query(default=100, ge=1, le=500),
):
    return listar_intentos_login(limite=limite, solo_fallidos=solo_fallidos)


@router.get("/emails", response_model=list[dict], summary="Bitacora de correos enviados")
def emails(
    _: SoloAdmin,
    estado: str | None = Query(default=None, description="enviado, fallido o pendiente"),
    limite: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
):
    condiciones = []
    params: list = []
    if estado:
        condiciones.append("estado = %s")
        params.append(estado)
    where = f"WHERE {' AND '.join(condiciones)}" if condiciones else ""
    params.extend([limite, offset])
    return fetch_all(
        f"""SELECT id_email, id_usuario, destinatario, asunto, tipo, estado,
                   proveedor, error, creado_en, enviado_en
            FROM email_logs
            {where}
            ORDER BY id_email DESC
            LIMIT %s OFFSET %s""",
        params,
    )
