"""Rutas de administracion de usuarios y perfil propio."""

from fastapi import APIRouter, Query, status

from app.core.dependencies import DatosPeticion, SoloAdmin, UsuarioAuth
from app.core.exceptions import Prohibido
from app.schemas.comunes import MensajeRespuesta, RespuestaPaginada
from app.schemas.personas import PerfilUpdate, UsuarioInternoCreate, UsuarioOut
from app.services import usuarios_service
from app.services.auditoria_service import Accion, registrar_auditoria
from app.utils.paginacion import offset_de, paginar

router = APIRouter(prefix="/usuarios", tags=["Usuarios"])


@router.get("", response_model=RespuestaPaginada[UsuarioOut], summary="Listar usuarios")
def listar(
    _: SoloAdmin,
    id_rol: int | None = Query(default=None, description="1 admin, 2 barbero, 3 cliente"),
    activo: bool | None = None,
    buscar: str | None = Query(default=None, description="Nombre, correo o telefono"),
    pagina: int = Query(default=1, ge=1),
    por_pagina: int = Query(default=20, ge=1, le=100),
):
    offset = offset_de(pagina, por_pagina)
    items = usuarios_service.listar(id_rol, activo, buscar, por_pagina, offset)
    total = usuarios_service.contar(id_rol, activo, buscar)
    return paginar(items, total, pagina, por_pagina)


@router.get("/roles", response_model=list[dict], summary="Catalogo de roles")
def roles(_: SoloAdmin):
    return usuarios_service.listar_roles()


@router.get("/me", response_model=UsuarioOut, summary="Mi perfil")
def mi_perfil(usuario: UsuarioAuth):
    return usuarios_service.obtener(usuario.id_usuario)


@router.put("/me", response_model=UsuarioOut, summary="Actualizar mi perfil")
def actualizar_mi_perfil(datos: PerfilUpdate, usuario: UsuarioAuth, contexto: DatosPeticion):
    actualizado = usuarios_service.actualizar(
        usuario.id_usuario, datos.model_dump(exclude_none=True)
    )
    registrar_auditoria(
        Accion.USUARIO_ACTUALIZADO, "usuarios", usuario.id_usuario, usuario.id_usuario,
        contexto.get("ip"), contexto.get("user_agent"),
    )
    return actualizado


@router.get("/{id_usuario}", response_model=UsuarioOut, summary="Obtener un usuario")
def obtener(id_usuario: int, usuario: UsuarioAuth):
    if not usuario.es_admin and usuario.id_usuario != id_usuario:
        raise Prohibido("Solo puedes consultar tu propio usuario")
    return usuarios_service.obtener(id_usuario)


@router.post(
    "/interno",
    response_model=UsuarioOut,
    status_code=status.HTTP_201_CREATED,
    summary="Crear administrador o barbero",
)
def crear_interno(datos: UsuarioInternoCreate, admin: SoloAdmin, contexto: DatosPeticion):
    creado = usuarios_service.crear_usuario_interno(datos.model_dump())
    registrar_auditoria(
        Accion.USUARIO_CREADO, "usuarios", int(creado["id_usuario"]), admin.id_usuario,
        contexto.get("ip"), contexto.get("user_agent"), {"id_rol": datos.id_rol},
    )
    return creado


@router.put("/{id_usuario}", response_model=UsuarioOut, summary="Actualizar un usuario")
def actualizar(
    id_usuario: int, datos: PerfilUpdate, usuario: UsuarioAuth, contexto: DatosPeticion
):
    if not usuario.es_admin and usuario.id_usuario != id_usuario:
        raise Prohibido("Solo puedes modificar tu propio usuario")
    actualizado = usuarios_service.actualizar(id_usuario, datos.model_dump(exclude_none=True))
    registrar_auditoria(
        Accion.USUARIO_ACTUALIZADO, "usuarios", id_usuario, usuario.id_usuario,
        contexto.get("ip"), contexto.get("user_agent"),
    )
    return actualizado


@router.patch(
    "/{id_usuario}/estado", response_model=UsuarioOut, summary="Activar o desactivar un usuario"
)
def cambiar_estado(
    id_usuario: int, activo: bool, admin: SoloAdmin, contexto: DatosPeticion
):
    if id_usuario == admin.id_usuario and not activo:
        raise Prohibido("No puedes desactivar tu propia cuenta")
    actualizado = usuarios_service.cambiar_estado(id_usuario, activo)
    registrar_auditoria(
        Accion.USUARIO_REACTIVADO if activo else Accion.USUARIO_DESACTIVADO, "usuarios", id_usuario, admin.id_usuario,
        contexto.get("ip"), contexto.get("user_agent"), {"activo": activo},
    )
    return actualizado


@router.delete(
    "/{id_usuario}", response_model=MensajeRespuesta, summary="Desactivar un usuario (baja logica)"
)
def eliminar(id_usuario: int, admin: SoloAdmin, contexto: DatosPeticion):
    if id_usuario == admin.id_usuario:
        raise Prohibido("No puedes eliminar tu propia cuenta")
    usuarios_service.eliminar(id_usuario)
    registrar_auditoria(
        Accion.USUARIO_DESACTIVADO, "usuarios", id_usuario, admin.id_usuario,
        contexto.get("ip"), contexto.get("user_agent"),
    )
    return {"mensaje": "Usuario desactivado correctamente"}
