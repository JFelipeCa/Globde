"""Rutas de barberos: perfil, servicios, horarios y bloqueos de agenda."""

from datetime import date

from fastapi import APIRouter, Query, status

from app.core.dependencies import DatosPeticion, SoloAdmin, UsuarioAuth
from app.core.exceptions import Prohibido
from app.schemas.comunes import MensajeRespuesta
from app.schemas.personas import (
    AsignarServiciosBarbero,
    BarberoOut,
    BarberoPerfilOut,
    BarberoUpdate,
    BloqueoAgendaIn,
    BloqueoAgendaOut,
    HorarioBarberoIn,
    HorarioBarberoOut,
    HorariosBarberoBulk,
)
from app.services import barberos_service, citas_service
from app.services.auditoria_service import Accion, registrar_auditoria

router = APIRouter(prefix="/barberos", tags=["Barberos"])


def _puede_gestionar(id_barbero: int, usuario) -> None:
    """Admin gestiona a todos; un barbero solo su propia agenda."""
    if usuario.es_admin:
        return
    if usuario.es_barbero and usuario.id_barbero == id_barbero:
        return
    raise Prohibido("Solo puedes gestionar tu propia agenda")


# ----------------------------------------------------------------------
# Consulta publica
# ----------------------------------------------------------------------

@router.get("", response_model=list[BarberoOut], summary="Listar barberos")
def listar(
    disponible: bool | None = None,
    activo: bool | None = True,
    buscar: str | None = None,
    id_servicio: int | None = Query(default=None, description="Solo barberos que lo prestan"),
):
    return barberos_service.listar(disponible, activo, buscar, id_servicio)


@router.get("/ranking", response_model=list[dict], summary="Ranking de barberos")
def ranking():
    return barberos_service.ranking()


@router.get("/{id_barbero}", response_model=BarberoPerfilOut, summary="Perfil completo")
def perfil(id_barbero: int):
    return barberos_service.perfil_completo(id_barbero)


@router.get("/{id_barbero}/servicios", response_model=list[dict], summary="Servicios que presta")
def servicios(id_barbero: int):
    return barberos_service.servicios_asignados(id_barbero)


@router.get(
    "/{id_barbero}/disponibilidad", response_model=dict, summary="Slots libres de una fecha"
)
def disponibilidad(
    id_barbero: int,
    fecha: date = Query(description="Fecha en formato YYYY-MM-DD"),
    id_servicio: int | None = None,
    paso: int | None = Query(default=None, ge=5, le=120),
):
    return citas_service.calcular_disponibilidad(id_barbero, fecha, id_servicio, paso)


@router.get(
    "/{id_barbero}/disponibilidad-semana",
    response_model=list[dict],
    summary="Resumen de disponibilidad por dia",
)
def disponibilidad_semana(
    id_barbero: int,
    desde: date = Query(description="Fecha inicial YYYY-MM-DD"),
    dias: int = Query(default=7, ge=1, le=31),
    id_servicio: int | None = None,
):
    return citas_service.disponibilidad_semana(id_barbero, desde, dias, id_servicio)


@router.get("/{id_barbero}/agenda", response_model=list[dict], summary="Agenda de una fecha")
def agenda(
    id_barbero: int,
    usuario: UsuarioAuth,
    fecha: date = Query(description="Fecha YYYY-MM-DD"),
):
    _puede_gestionar(id_barbero, usuario)
    return citas_service.agenda_barbero(id_barbero, fecha)


# ----------------------------------------------------------------------
# Perfil y servicios
# ----------------------------------------------------------------------

@router.put("/{id_barbero}", response_model=BarberoOut, summary="Actualizar perfil de barbero")
def actualizar(
    id_barbero: int, datos: BarberoUpdate, usuario: UsuarioAuth, contexto: DatosPeticion
):
    _puede_gestionar(id_barbero, usuario)
    actualizado = barberos_service.actualizar(id_barbero, datos.model_dump(exclude_none=True))
    registrar_auditoria(
        Accion.BARBERO_ACTUALIZADO, "barberos", id_barbero, usuario.id_usuario,
        contexto.get("ip"), contexto.get("user_agent"),
    )
    return actualizado


@router.patch(
    "/{id_barbero}/disponibilidad", response_model=BarberoOut, summary="Marcar disponible o no"
)
def cambiar_disponibilidad(id_barbero: int, disponible: bool, usuario: UsuarioAuth):
    _puede_gestionar(id_barbero, usuario)
    return barberos_service.cambiar_disponibilidad(id_barbero, disponible)


@router.put(
    "/{id_barbero}/servicios", response_model=list[dict], summary="Asignar servicios al barbero"
)
def asignar_servicios(
    id_barbero: int, datos: AsignarServiciosBarbero, admin: SoloAdmin, contexto: DatosPeticion
):
    asignados = barberos_service.asignar_servicios(id_barbero, datos.servicios)
    registrar_auditoria(
        Accion.BARBERO_ACTUALIZADO, "barbero_servicio", id_barbero, admin.id_usuario,
        contexto.get("ip"), contexto.get("user_agent"), {"servicios": datos.servicios},
    )
    return asignados


# ----------------------------------------------------------------------
# Horarios
# ----------------------------------------------------------------------

@router.get(
    "/{id_barbero}/horarios", response_model=list[HorarioBarberoOut], summary="Jornada semanal"
)
def listar_horarios(id_barbero: int, solo_activos: bool = True):
    return barberos_service.listar_horarios(id_barbero, solo_activos)


@router.put(
    "/{id_barbero}/horarios",
    response_model=list[HorarioBarberoOut],
    summary="Reemplazar la jornada semanal completa",
)
def reemplazar_horarios(
    id_barbero: int, datos: HorariosBarberoBulk, usuario: UsuarioAuth, contexto: DatosPeticion
):
    _puede_gestionar(id_barbero, usuario)
    horarios = [h.model_dump(mode="json") for h in datos.horarios]
    resultado = barberos_service.reemplazar_horarios(id_barbero, horarios)
    registrar_auditoria(
        Accion.HORARIO_ACTUALIZADO, "horarios_barbero", id_barbero, usuario.id_usuario,
        contexto.get("ip"), contexto.get("user_agent"), {"franjas": len(horarios)},
    )
    return resultado


@router.post(
    "/{id_barbero}/horarios",
    response_model=list[HorarioBarberoOut],
    status_code=status.HTTP_201_CREATED,
    summary="Agregar una franja horaria",
)
def agregar_horario(
    id_barbero: int, datos: HorarioBarberoIn, usuario: UsuarioAuth, contexto: DatosPeticion
):
    _puede_gestionar(id_barbero, usuario)
    resultado = barberos_service.agregar_horario(id_barbero, datos.model_dump(mode="json"))
    registrar_auditoria(
        Accion.HORARIO_ACTUALIZADO, "horarios_barbero", id_barbero, usuario.id_usuario,
        contexto.get("ip"), contexto.get("user_agent"),
    )
    return resultado


@router.delete(
    "/{id_barbero}/horarios/{id_horario}",
    response_model=MensajeRespuesta,
    summary="Eliminar una franja horaria",
)
def eliminar_horario(id_barbero: int, id_horario: int, usuario: UsuarioAuth):
    _puede_gestionar(id_barbero, usuario)
    barberos_service.eliminar_horario(id_barbero, id_horario)
    return {"mensaje": "Franja horaria eliminada"}


# ----------------------------------------------------------------------
# Bloqueos de agenda
# ----------------------------------------------------------------------

@router.get(
    "/{id_barbero}/bloqueos", response_model=list[BloqueoAgendaOut], summary="Listar bloqueos"
)
def listar_bloqueos(
    id_barbero: int,
    usuario: UsuarioAuth,
    desde: date | None = None,
    hasta: date | None = None,
):
    _puede_gestionar(id_barbero, usuario)
    return barberos_service.listar_bloqueos(id_barbero, desde, hasta)


@router.post(
    "/{id_barbero}/bloqueos",
    response_model=BloqueoAgendaOut,
    status_code=status.HTTP_201_CREATED,
    summary="Bloquear un rango de la agenda",
)
def crear_bloqueo(
    id_barbero: int, datos: BloqueoAgendaIn, usuario: UsuarioAuth, contexto: DatosPeticion
):
    _puede_gestionar(id_barbero, usuario)
    bloqueo = barberos_service.crear_bloqueo(id_barbero, datos.model_dump(mode="json"))
    registrar_auditoria(
        Accion.BLOQUEO_CREADO, "bloqueos_agenda", int(bloqueo["id_bloqueo"]),
        usuario.id_usuario, contexto.get("ip"), contexto.get("user_agent"),
        {"fecha": datos.fecha, "motivo": datos.motivo},
    )
    return bloqueo


@router.delete(
    "/{id_barbero}/bloqueos/{id_bloqueo}",
    response_model=MensajeRespuesta,
    summary="Liberar un bloqueo",
)
def eliminar_bloqueo(
    id_barbero: int, id_bloqueo: int, usuario: UsuarioAuth, contexto: DatosPeticion
):
    _puede_gestionar(id_barbero, usuario)
    barberos_service.eliminar_bloqueo(id_barbero, id_bloqueo)
    registrar_auditoria(
        Accion.BLOQUEO_ELIMINADO, "bloqueos_agenda", id_bloqueo, usuario.id_usuario,
        contexto.get("ip"), contexto.get("user_agent"),
    )
    return {"mensaje": "Bloqueo eliminado"}
