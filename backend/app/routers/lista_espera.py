"""Endpoints de solicitudes de lista de espera y aceptación de ofertas."""

from fastapi import APIRouter, status

from app.core.dependencies import DatosPeticion, SoloAdmin, UsuarioAuth
from app.schemas.comunes import MensajeRespuesta
from app.schemas.invitados import (
    ListaEsperaInvitadoSolicitar,
    VerificacionInvitadoOut,
    VerificarInvitadoRequest,
)
from app.schemas.lista_espera import ListaEsperaCreate, ListaEsperaOut
from app.schemas.operaciones import CitaOut
from app.services import lista_espera_service
from app.services import invitados_service

router = APIRouter(prefix="/lista-espera", tags=["Lista de espera"])


@router.post(
    "",
    response_model=ListaEsperaOut,
    status_code=status.HTTP_201_CREATED,
    summary="Crear solicitud de lista de espera",
)
def crear(datos: ListaEsperaCreate, usuario: UsuarioAuth):
    return lista_espera_service.crear(datos.model_dump(mode="json"), usuario)


@router.post(
    "/invitado/verificacion",
    response_model=VerificacionInvitadoOut,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Enviar código para solicitar lista de espera como invitado",
)
def solicitar_verificacion_invitado(
    datos: ListaEsperaInvitadoSolicitar, contexto: DatosPeticion
):
    return invitados_service.solicitar_verificacion(
        "lista_espera", datos.model_dump(mode="json"), contexto
    )


@router.post(
    "/invitado/confirmar",
    response_model=ListaEsperaOut,
    status_code=status.HTTP_201_CREATED,
    summary="Confirmar solicitud de lista de espera de invitado",
)
def confirmar_solicitud_invitado(
    datos: VerificarInvitadoRequest
):
    payload, id_cliente = invitados_service.verificar_codigo(
        datos.id_solicitud, datos.codigo, "lista_espera"
    )
    resultado = lista_espera_service.crear(
        payload,
        id_cliente_invitado=id_cliente,
    )
    return resultado


@router.get("/mias", response_model=list[ListaEsperaOut], summary="Mis solicitudes")
def listar_mias(usuario: UsuarioAuth):
    if not usuario.es_cliente or not usuario.id_cliente:
        return []
    return lista_espera_service.listar_cliente(usuario.id_cliente)


@router.get("", response_model=list[ListaEsperaOut], summary="Todas las solicitudes")
def listar_todas(_: SoloAdmin):
    return lista_espera_service.listar_todas()


@router.post(
    "/{id_espera}/aceptar",
    response_model=CitaOut,
    status_code=status.HTTP_201_CREATED,
    summary="Aceptar una oferta de turno",
)
def aceptar(id_espera: int, usuario: UsuarioAuth):
    return lista_espera_service.aceptar(id_espera, usuario)


@router.delete(
    "/{id_espera}",
    response_model=MensajeRespuesta,
    summary="Cancelar una solicitud",
)
def cancelar(id_espera: int, usuario: UsuarioAuth):
    lista_espera_service.cancelar(id_espera, usuario)
    return {"mensaje": "Solicitud de lista de espera cancelada"}


__all__ = ["router"]
