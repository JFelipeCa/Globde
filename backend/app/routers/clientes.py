"""Rutas de clientes: alta, consulta, historial y fidelizacion basica."""

from fastapi import APIRouter, Query, status

from app.core.dependencies import AdminOBarbero, DatosPeticion, SoloAdmin, UsuarioAuth
from app.core.exceptions import Prohibido
from app.schemas.comunes import MensajeRespuesta, RespuestaPaginada
from app.schemas.personas import (
    ClienteCreate,
    ClienteResumenOut,
    ClienteUpdate,
)
from app.services import auth_service, clientes_service, email_service
from app.services.auditoria_service import Accion, registrar_auditoria
from app.utils.paginacion import offset_de, paginar

router = APIRouter(prefix="/clientes", tags=["Clientes"])


def _verificar_acceso(id_cliente: int, usuario) -> None:
    """Un cliente solo ve su propia ficha; admin y barberos ven todas."""
    if usuario.es_cliente and usuario.id_cliente != id_cliente:
        raise Prohibido("Solo puedes consultar tu propia informacion")


@router.get(
    "", response_model=RespuestaPaginada[ClienteResumenOut], summary="Listar clientes"
)
def listar(
    _: AdminOBarbero,
    buscar: str | None = Query(default=None, description="Nombre, correo o telefono"),
    nivel: str | None = Query(default=None, description="Bronce, Plata, Oro o Diamante"),
    activo: bool | None = None,
    pagina: int = Query(default=1, ge=1),
    por_pagina: int = Query(default=20, ge=1, le=100),
):
    offset = offset_de(pagina, por_pagina)
    items = clientes_service.listar(buscar, nivel, activo, por_pagina, offset)
    total = clientes_service.contar(buscar, nivel, activo)
    return paginar(items, total, pagina, por_pagina)


@router.get("/me", response_model=ClienteResumenOut, summary="Mi ficha de cliente")
def mi_ficha(usuario: UsuarioAuth):
    if usuario.id_cliente is None:
        raise Prohibido("Tu usuario no tiene un perfil de cliente asociado")
    return clientes_service.obtener_resumen(usuario.id_cliente)


@router.post(
    "",
    response_model=ClienteResumenOut,
    status_code=status.HTTP_201_CREATED,
    summary="Registrar un cliente (personal)",
)
def crear(datos: ClienteCreate, actor: AdminOBarbero, contexto: DatosPeticion):
    """Alta hecha por el personal. Si no se envia contrasena se genera una temporal."""
    payload = datos.model_dump()
    temporal = None if payload.get("contrasena") else auth_service.generar_password_temporal()
    cliente, contrasena_temporal = clientes_service.crear(payload, temporal)

    registrar_auditoria(
        Accion.CLIENTE_CREADO, "clientes", int(cliente["id_cliente"]), actor.id_usuario,
        contexto.get("ip"), contexto.get("user_agent"), {"correo": datos.correo},
    )
    if contrasena_temporal:
        email_service.enviar_notificacion_generica(
            cliente["correo"], cliente["nombre"], "Tu cuenta GLOBDE esta lista",
            "Se creo una cuenta para ti. Usa la opcion 'Olvide mi contrasena' "
            "para definir tu clave de acceso.",
            int(cliente["id_usuario"]),
        )
    return cliente


@router.get("/{id_cliente}", response_model=ClienteResumenOut, summary="Detalle de un cliente")
def obtener(id_cliente: int, usuario: UsuarioAuth):
    _verificar_acceso(id_cliente, usuario)
    return clientes_service.obtener_resumen(id_cliente)


@router.get("/{id_cliente}/citas", response_model=list[dict], summary="Historial de citas")
def historial(
    id_cliente: int,
    usuario: UsuarioAuth,
    limite: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
):
    _verificar_acceso(id_cliente, usuario)
    return clientes_service.historial_citas(id_cliente, limite, offset)


@router.put("/{id_cliente}", response_model=ClienteResumenOut, summary="Actualizar un cliente")
def actualizar(
    id_cliente: int, datos: ClienteUpdate, usuario: UsuarioAuth, contexto: DatosPeticion
):
    _verificar_acceso(id_cliente, usuario)
    payload = datos.model_dump(exclude_none=True)
    if payload.get("nivel_fidelizacion") and not usuario.es_admin:
        raise Prohibido("Solo un administrador puede cambiar el nivel de fidelizacion")

    actualizado = clientes_service.actualizar(id_cliente, payload)
    registrar_auditoria(
        Accion.CLIENTE_ACTUALIZADO, "clientes", id_cliente, usuario.id_usuario,
        contexto.get("ip"), contexto.get("user_agent"), payload,
    )
    return actualizado


@router.patch(
    "/{id_cliente}/estado", response_model=ClienteResumenOut, summary="Activar o desactivar"
)
def cambiar_estado(id_cliente: int, activo: bool, admin: SoloAdmin, contexto: DatosPeticion):
    actualizado = clientes_service.cambiar_estado(id_cliente, activo)
    registrar_auditoria(
        Accion.USUARIO_REACTIVADO if activo else Accion.USUARIO_DESACTIVADO,
        "clientes", id_cliente, admin.id_usuario,
        contexto.get("ip"), contexto.get("user_agent"), {"activo": activo},
    )
    return actualizado


@router.delete("/{id_cliente}", response_model=MensajeRespuesta, summary="Baja logica")
def eliminar(id_cliente: int, admin: SoloAdmin, contexto: DatosPeticion):
    clientes_service.eliminar(id_cliente)
    registrar_auditoria(
        Accion.USUARIO_DESACTIVADO, "clientes", id_cliente, admin.id_usuario,
        contexto.get("ip"), contexto.get("user_agent"),
    )
    return {"mensaje": "Cliente desactivado correctamente"}
