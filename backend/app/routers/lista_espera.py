"""Endpoints de solicitudes de lista de espera y aceptación de ofertas."""

from fastapi import APIRouter, status

from app.core.dependencies import SoloAdmin, UsuarioAuth
from app.schemas.comunes import MensajeRespuesta
from app.schemas.lista_espera import ListaEsperaCreate, ListaEsperaOut
from app.schemas.operaciones import CitaOut
from app.services import lista_espera_service

router = APIRouter(prefix="/lista-espera", tags=["Lista de espera"])


@router.post(
    "",
    response_model=ListaEsperaOut,
    status_code=status.HTTP_201_CREATED,
    summary="Crear solicitud de lista de espera",
)
def crear(datos: ListaEsperaCreate, usuario: UsuarioAuth):
    return lista_espera_service.crear(datos.model_dump(mode="json"), usuario)


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
