"""Rutas de configuración de la jornada y cierres generales del negocio."""

from datetime import date

from fastapi import APIRouter, Query, status

from app.core.dependencies import DatosPeticion, SoloAdmin
from app.schemas.agenda import (
    CierreNegocioIn,
    CierreNegocioOut,
    HorarioNegocioOut,
    HorariosNegocioBulk,
)
from app.schemas.comunes import MensajeRespuesta
from app.services import agenda_service
from app.services.auditoria_service import Accion, registrar_auditoria

router = APIRouter(prefix="/agenda", tags=["Agenda del negocio"])


@router.get(
    "/horarios-negocio",
    response_model=list[HorarioNegocioOut],
    summary="Consultar horario semanal del negocio",
)
def listar_horarios_negocio():
    return agenda_service.listar_horarios_negocio()


@router.put(
    "/horarios-negocio",
    response_model=list[HorarioNegocioOut],
    summary="Reemplazar horario semanal del negocio",
)
def reemplazar_horarios_negocio(
    datos: HorariosNegocioBulk, admin: SoloAdmin, contexto: DatosPeticion
):
    horarios = [horario.model_dump(mode="json") for horario in datos.horarios]
    resultado = agenda_service.reemplazar_horarios_negocio(horarios)
    registrar_auditoria(
        Accion.HORARIO_NEGOCIO_ACTUALIZADO,
        "horarios_negocio",
        None,
        admin.id_usuario,
        contexto.get("ip"),
        contexto.get("user_agent"),
        {"franjas": len(horarios)},
    )
    return resultado


@router.get(
    "/cierres",
    response_model=list[CierreNegocioOut],
    summary="Listar cierres especiales",
)
def listar_cierres(
    desde: date | None = Query(default=None),
    hasta: date | None = Query(default=None),
):
    return agenda_service.listar_cierres(desde, hasta)


@router.post(
    "/cierres",
    response_model=CierreNegocioOut,
    status_code=status.HTTP_201_CREATED,
    summary="Registrar un cierre especial",
)
def crear_cierre(datos: CierreNegocioIn, admin: SoloAdmin, contexto: DatosPeticion):
    cierre = agenda_service.crear_cierre(datos.fecha, datos.motivo)
    registrar_auditoria(
        Accion.CIERRE_NEGOCIO_CREADO,
        "cierres_negocio",
        int(cierre["id_cierre"]),
        admin.id_usuario,
        contexto.get("ip"),
        contexto.get("user_agent"),
        {"fecha": datos.fecha, "citas_afectadas": len(cierre["citas_afectadas"])},
    )
    return cierre


@router.delete(
    "/cierres/{id_cierre}",
    response_model=MensajeRespuesta,
    summary="Eliminar un cierre especial",
)
def eliminar_cierre(id_cierre: int, admin: SoloAdmin, contexto: DatosPeticion):
    agenda_service.eliminar_cierre(id_cierre)
    registrar_auditoria(
        Accion.CIERRE_NEGOCIO_ELIMINADO,
        "cierres_negocio",
        id_cierre,
        admin.id_usuario,
        contexto.get("ip"),
        contexto.get("user_agent"),
    )
    return {"mensaje": "Cierre eliminado. El horario habitual vuelve a estar disponible."}
