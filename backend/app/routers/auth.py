"""Rutas de autenticacion, registro y recuperacion de contrasena."""

from fastapi import APIRouter, status

from app.core.dependencies import DatosPeticion, UsuarioAuth
from app.schemas.auth import (
    CambioPasswordRequest,
    LoginRequest,
    PasswordForgotRequest,
    PasswordResetRequest,
    RefreshRequest,
    RegistroClienteRequest,
    TokenRespuesta,
    UsuarioAutenticado,
    ValidarTokenRequest,
)
from app.schemas.comunes import MensajeRespuesta
from app.services import auth_service, usuarios_service

router = APIRouter(prefix="/auth", tags=["Autenticacion"])


@router.post("/login", response_model=TokenRespuesta, summary="Iniciar sesion")
def login(datos: LoginRequest, contexto: DatosPeticion):
    """Valida credenciales y devuelve el par de tokens JWT + el perfil."""
    return auth_service.login(datos.correo, datos.contrasena, contexto)


@router.post(
    "/registro",
    response_model=TokenRespuesta,
    status_code=status.HTTP_201_CREATED,
    summary="Registro publico de clientes",
)
def registro(datos: RegistroClienteRequest, contexto: DatosPeticion):
    return auth_service.registrar_cliente(datos.model_dump(), contexto)


@router.post("/refresh", response_model=TokenRespuesta, summary="Renovar el access token")
def refrescar(datos: RefreshRequest):
    return auth_service.refrescar(datos.refresh_token)


@router.get("/me", response_model=UsuarioAutenticado, summary="Perfil del usuario autenticado")
def perfil(usuario: UsuarioAuth):
    return auth_service.construir_sesion(usuarios_service.obtener(usuario.id_usuario))["usuario"]


@router.post("/logout", response_model=MensajeRespuesta, summary="Cerrar sesion")
def logout(usuario: UsuarioAuth):
    """El token es stateless: el cliente debe descartarlo."""
    return {"mensaje": f"Sesion cerrada. Hasta pronto, {usuario.nombre}."}


# ----------------------------------------------------------------------
# Recuperacion de contrasena
# ----------------------------------------------------------------------

@router.post(
    "/password/forgot",
    response_model=MensajeRespuesta,
    summary="Solicitar enlace de recuperacion",
)
def password_forgot(datos: PasswordForgotRequest, contexto: DatosPeticion):
    return auth_service.solicitar_recuperacion(datos.correo, contexto)


@router.post(
    "/password/validar-token",
    response_model=dict,
    summary="Verificar que un token de recuperacion sigue vigente",
)
def password_validar(datos: ValidarTokenRequest):
    return auth_service.validar_token_recuperacion(datos.token)


@router.post(
    "/password/reset",
    response_model=MensajeRespuesta,
    summary="Restablecer la contrasena con el token",
)
def password_reset(datos: PasswordResetRequest, contexto: DatosPeticion):
    return auth_service.restablecer_password(datos.token, datos.nueva_contrasena, contexto)


@router.post(
    "/password/cambiar",
    response_model=MensajeRespuesta,
    summary="Cambiar la contrasena estando autenticado",
)
def password_cambiar(datos: CambioPasswordRequest, usuario: UsuarioAuth):
    usuarios_service.cambiar_password(
        usuario.id_usuario, datos.contrasena_actual, datos.nueva_contrasena
    )
    return {"mensaje": "Contrasena actualizada correctamente"}
