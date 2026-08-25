"""Rutas de notificaciones internas."""

from fastapi import APIRouter, Query, status

from app.core.dependencies import DatosPeticion, SoloAdmin, UsuarioAuth
from app.schemas.comunes import MensajeRespuesta, RespuestaPaginada
from app.schemas.operaciones import (
    NotificacionCreate,
    NotificacionMasivaCreate,
    NotificacionOut,
)
from app.services import email_service, notificaciones_service
from app.services.auditoria_service import Accion, registrar_auditoria
from app.utils.paginacion import offset_de, paginar

router = APIRouter(prefix="/notificaciones", tags=["Notificaciones"])


@router.get(
    "", response_model=RespuestaPaginada[NotificacionOut], summary="Mis notificaciones"
)
def listar(
    usuario: UsuarioAuth,
    solo_no_leidas: bool = False,
    pagina: int = Query(default=1, ge=1),
    por_pagina: int = Query(default=20, ge=1, le=100),
):
    offset = offset_de(pagina, por_pagina)
    items = notificaciones_service.listar(
        usuario.id_usuario, solo_no_leidas, por_pagina, offset
    )
    total = notificaciones_service.contar(usuario.id_usuario, solo_no_leidas)
    return paginar(items, total, pagina, por_pagina)


@router.get("/no-leidas", response_model=dict, summary="Conteo de no leidas")
def no_leidas(usuario: UsuarioAuth):
    return {"no_leidas": notificaciones_service.contar_no_leidas(usuario.id_usuario)}


@router.patch(
    "/{id_notificacion}/leida", response_model=MensajeRespuesta, summary="Marcar como leida"
)
def marcar_leida(id_notificacion: int, usuario: UsuarioAuth):
    notificaciones_service.marcar_leida(id_notificacion, usuario.id_usuario)
    return {"mensaje": "Notificacion marcada como leida"}


@router.patch("/leidas", response_model=MensajeRespuesta, summary="Marcar todas como leidas")
def marcar_todas(usuario: UsuarioAuth):
    total = notificaciones_service.marcar_todas_leidas(usuario.id_usuario)
    return {"mensaje": "Notificaciones actualizadas", "detalle": {"actualizadas": total}}


@router.delete(
    "/{id_notificacion}", response_model=MensajeRespuesta, summary="Eliminar una notificacion"
)
def eliminar(id_notificacion: int, usuario: UsuarioAuth):
    notificaciones_service.eliminar(id_notificacion, usuario.id_usuario)
    return {"mensaje": "Notificacion eliminada"}


@router.post(
    "",
    response_model=NotificacionOut,
    status_code=status.HTTP_201_CREATED,
    summary="Enviar una notificacion a un usuario",
)
def crear(datos: NotificacionCreate, admin: SoloAdmin, contexto: DatosPeticion):
    id_notificacion = notificaciones_service.crear_notificacion(
        datos.id_usuario, datos.titulo, datos.mensaje, datos.tipo, datos.url_accion,
        silencioso=False,
    )
    registrar_auditoria(
        Accion.NOTIFICACION_MASIVA, "notificaciones", id_notificacion, admin.id_usuario,
        contexto.get("ip"), contexto.get("user_agent"), {"destinatario": datos.id_usuario},
    )
    return notificaciones_service.obtener(int(id_notificacion))


@router.post("/masiva", response_model=MensajeRespuesta, summary="Notificacion masiva por rol")
def masiva(datos: NotificacionMasivaCreate, admin: SoloAdmin, contexto: DatosPeticion):
    destinatarios = notificaciones_service.notificar_a_rol(
        datos.id_rol, datos.titulo, datos.mensaje, datos.tipo, datos.url_accion
    )
    enviadas = len(destinatarios)

    if datos.enviar_correo:
        for destinatario in destinatarios:
            email_service.enviar_notificacion_generica(
                destinatario["correo"], destinatario["nombre"], datos.titulo, datos.mensaje,
                int(destinatario["id_usuario"]),
            )
    registrar_auditoria(
        Accion.NOTIFICACION_MASIVA, "notificaciones", None, admin.id_usuario,
        contexto.get("ip"), contexto.get("user_agent"),
        {"id_rol": datos.id_rol, "enviadas": enviadas},
    )
    return {"mensaje": "Notificaciones enviadas", "detalle": {"enviadas": enviadas}}
