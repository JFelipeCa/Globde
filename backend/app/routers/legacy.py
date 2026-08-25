"""Rutas de compatibilidad con la API v1.

El frontend actual (`src/context/AppContext.tsx`) fue escrito contra la primera
version de la API y llama a cuatro endpoints que la v2 ya no expone con esa
forma: `/datos`, `/login`, `POST /clientes` y `POST /citas`.

En lugar de modificar el frontend, este router traduce esas cuatro llamadas a
los servicios de la v2 y devuelve exactamente la estructura que el frontend
espera. Asi la aplicacion funciona con datos reales sin tocar una sola linea
del codigo de la interfaz.

Se monta solo si `ENABLE_LEGACY_ROUTES` es verdadero (por defecto lo es). Al
desactivarlo, la API queda unicamente con el contrato v2.

Estos endpoints son un puente temporal: cuando el frontend migre a
`/auth/login`, `/auth/registro` y a los recursos separados, este archivo se
puede borrar entero.
"""

from datetime import date, datetime, time, timedelta
from typing import Any

import anyio.from_thread

from fastapi import APIRouter, Request
from fastapi.exceptions import RequestValidationError
from pydantic import ValidationError

from app.core.dependencies import DatosPeticion, UsuarioOpcional
from app.core.exceptions import DatosInvalidos
from app.db.database import fetch_all, fetch_one
from app.routers import citas as citas_router
from app.routers import clientes as clientes_router
from app.schemas.auth import LoginRequest, RegistroClienteRequest
from app.schemas.operaciones import CitaCreate
from app.schemas.personas import ClienteCreate, ClienteResumenOut
from app.services import auth_service, citas_service, servicios_service

router = APIRouter(tags=["Compatibilidad v1"])


# ----------------------------------------------------------------------
# Helpers de traduccion
# ----------------------------------------------------------------------

def _hhmm(valor: Any) -> str:
    """Normaliza una hora (time, timedelta o texto) a 'HH:MM'."""
    if valor is None:
        return ""
    if isinstance(valor, timedelta):
        total = int(valor.total_seconds())
        return f"{total // 3600:02d}:{(total % 3600) // 60:02d}"
    if isinstance(valor, time):
        return valor.strftime("%H:%M")
    if isinstance(valor, datetime):
        return valor.strftime("%H:%M")
    texto = str(valor)
    return texto[:5] if len(texto) >= 5 else texto


def _fecha_iso(valor: Any) -> str:
    if isinstance(valor, (date, datetime)):
        return valor.date().isoformat() if isinstance(valor, datetime) else valor.isoformat()
    return str(valor or "")


def _texto(valor: Any) -> str:
    return "" if valor is None else str(valor)


def _cuerpo_json(peticion: Request) -> dict:
    """Lee el cuerpo JSON de la peticion tolerando que venga vacio o mal formado."""
    try:
        cuerpo = anyio.from_thread.run(peticion.json)
    except Exception as exc:  # noqa: BLE001
        raise DatosInvalidos("El cuerpo de la peticion debe ser un JSON valido") from exc
    if not isinstance(cuerpo, dict):
        raise DatosInvalidos("El cuerpo de la peticion debe ser un objeto JSON")
    return cuerpo


def _validar(modelo, cuerpo: dict):
    """Valida el cuerpo con un esquema y reusa el manejador global de errores.

    Al construir el modelo a mano (y no como parametro de la ruta) FastAPI ya
    no captura el ValidationError, asi que se reenvia como
    RequestValidationError para que la respuesta siga siendo un 422 con el
    mismo formato `{detail, errores:[{campo,mensaje}]}` del resto de la API.
    """
    try:
        return modelo(**cuerpo)
    except ValidationError as exc:
        raise RequestValidationError(exc.errors()) from exc


def _sesion_v1(sesion: dict) -> dict:
    """Aplana la sesion v2 al perfil plano que leia el frontend v1.

    Se incluyen tambien los tokens por si el frontend migra a JWT; el codigo
    actual simplemente los ignora.
    """
    usuario = sesion["usuario"]
    return {
        **usuario,
        "puntos": usuario.get("puntos_saldo") or 0,
        "fecha_creacion": _fecha_iso(usuario.get("creado_en")),
        "access_token": sesion["access_token"],
        "refresh_token": sesion["refresh_token"],
        "token_type": "bearer",
    }


def _usuario_v1(fila: dict, especialidades: dict[int, list[str]] | None = None) -> dict:
    """Da a un usuario la forma plana que esperaba la v1."""
    puntos = fila.get("puntos_saldo")
    id_barbero = fila.get("id_barbero")
    lista_esp = (especialidades or {}).get(int(id_barbero), []) if id_barbero else []
    return {
        "id_usuario": int(fila["id_usuario"]),
        "nombre": _texto(fila.get("nombre")),
        "correo": _texto(fila.get("correo")),
        "telefono": _texto(fila.get("telefono")),
        "id_rol": int(fila.get("id_rol") or 3),
        "activo": bool(fila.get("activo", True)),
        "avatar_url": fila.get("avatar_url"),
        "fecha_creacion": _fecha_iso(fila.get("creado_en")),
        "puntos": int(puntos) if puntos is not None else 0,
        # Campos que el frontend lee de los barberos
        "rol_titulo": fila.get("titulo") or "Barbero certificado",
        "experiencia_anos": int(fila.get("experiencia_anios") or 0),
        "rating": float(fila.get("rating") or 0),
        "total_resenas": int(fila.get("total_resenas") or 0),
        "bio": fila.get("bio") or "Barbero certificado de Globde.",
        # La foto del barbero vive en barberos.foto_url; si no la tiene, se
        # cae al avatar del usuario.
        "foto_url": fila.get("foto_url") or fila.get("avatar_url"),
        "especialidades": lista_esp or ["Corte profesional"],
        "id_barbero": int(id_barbero) if id_barbero else None,
        "id_cliente": int(fila["id_cliente"]) if fila.get("id_cliente") else None,
        "nivel_fidelizacion": fila.get("nivel_fidelizacion"),
    }


# ----------------------------------------------------------------------
# GET /api/datos  ->  paquete unico que la v1 devolvia de una sola vez
# ----------------------------------------------------------------------

@router.get("/datos", summary="Paquete de datos iniciales (compatibilidad v1)")
def datos_iniciales() -> dict:
    """Reune en una sola respuesta lo que la v2 sirve en endpoints separados.

    El frontend lo pide al arrancar para poblar servicios, barberos, clientes y
    citas, y ademas toma `usuarios[0]` como sesion inicial: por eso la lista va
    ordenada por `id_usuario` (el administrador primero), igual que en la v1.

    Aviso: como en la v1, responde sin autenticacion. Es aceptable para el
    entorno de demostracion, pero en produccion conviene apagar estas rutas con
    `ENABLE_LEGACY_ROUTES=false` y consumir los endpoints v2 con token.
    """
    servicios = servicios_service.listar(activo=True)

    # Todos los usuarios activos con los datos de barbero o cliente embebidos,
    # que es como la v1 entregaba la tabla `usuarios`.
    filas = fetch_all(
        """SELECT u.id_usuario, u.nombre, u.correo, u.telefono, u.id_rol,
                  u.activo, u.avatar_url, u.creado_en,
                  b.id_barbero, b.titulo, b.experiencia_anios, b.bio,
                  b.rating, b.total_resenas, b.citas_completadas, b.color,
                  b.foto_url,
                  c.id_cliente, c.puntos_saldo, c.nivel_fidelizacion
           FROM usuarios u
           LEFT JOIN barberos b ON b.id_usuario = u.id_usuario
           LEFT JOIN clientes c ON c.id_usuario = u.id_usuario
           WHERE u.activo = 1
           ORDER BY u.id_usuario"""
    )

    # Especialidades de cada barbero = nombres de los servicios que presta.
    especialidades: dict[int, list[str]] = {}
    for fila in fetch_all(
        """SELECT bs.id_barbero, s.nombre
           FROM barbero_servicio bs
           JOIN servicios s ON s.id_servicio = bs.id_servicio
           WHERE s.activo = 1
           ORDER BY s.nombre"""
    ):
        especialidades.setdefault(int(fila["id_barbero"]), []).append(fila["nombre"])

    usuarios = [_usuario_v1(f, especialidades) for f in filas]
    barberos = [f for f in filas if f.get("id_barbero")]
    clientes = [_usuario_v1(f, especialidades) for f in filas if f.get("id_cliente")]

    # La v1 identificaba al barbero de una cita por su id_usuario.
    usuario_por_barbero = {int(b["id_barbero"]): int(b["id_usuario"]) for b in barberos}

    citas_v1 = []
    for c in citas_service.listar(limite=300, offset=0, orden="asc"):
        citas_v1.append(
            {
                "id_cita": int(c["id_cita"]),
                "id_cliente": int(c["id_cliente"]),
                "id_usuario": usuario_por_barbero.get(int(c["id_barbero"]), 0),
                "id_barbero": int(c["id_barbero"]),
                "id_servicio": int(c["id_servicio"]),
                "fecha": _fecha_iso(c.get("fecha")),
                "hora": _hhmm(c.get("hora_inicio")),
                "hora_fin": _hhmm(c.get("hora_fin")),
                "estado": _texto(c.get("estado")),
                "observaciones": _texto(c.get("observaciones")),
                "creado_en": _texto(c.get("creado_en")),
            }
        )

    # Jornada real de cada barbero. Sin esto el frontend ofrecia franjas de
    # 08:00 a 20:00 para todos y el backend rechazaba la cita al confirmar.
    horarios_barberos = [
        {
            "id_barbero": int(h["id_barbero"]),
            "dia_semana": int(h["dia_semana"]),
            "hora_inicio": _hhmm(h.get("hora_inicio")),
            "hora_fin": _hhmm(h.get("hora_fin")),
        }
        for h in fetch_all(
            """SELECT id_barbero, dia_semana, hora_inicio, hora_fin
               FROM horarios_barbero
               WHERE activo = 1
               ORDER BY id_barbero, dia_semana"""
        )
    ]

    # Que servicio presta cada barbero, para no ofrecer combinaciones que el
    # backend rechaza con "El barbero seleccionado no presta ese servicio".
    barbero_servicio = [
        {"id_barbero": int(r["id_barbero"]), "id_servicio": int(r["id_servicio"])}
        for r in fetch_all(
            """SELECT bs.id_barbero, bs.id_servicio
               FROM barbero_servicio bs
               JOIN servicios s ON s.id_servicio = bs.id_servicio
               WHERE bs.activo = 1 AND s.activo = 1
               ORDER BY bs.id_barbero, bs.id_servicio"""
        )
    ]

    return {
        "roles": fetch_all("SELECT id_rol, nombre FROM roles ORDER BY id_rol"),
        "usuarios": usuarios,
        "horarios_barberos": horarios_barberos,
        "barbero_servicio": barbero_servicio,
        "clientes": clientes,
        "servicios": servicios,
        "citas": citas_v1,
        "catalogo_cortes": fetch_all(
            "SELECT * FROM catalogo_cortes WHERE activo = 1 ORDER BY nombre"
        ),
        "ranking_barberos": [
            {
                "id_usuario": int(b["id_usuario"]),
                "id_barbero": int(b["id_barbero"]),
                "nombre": _texto(b.get("nombre")),
                "rating": float(b.get("rating") or 0),
                "total_citas": int(b.get("citas_completadas") or 0),
                "nivel": "Oro" if float(b.get("rating") or 0) >= 4.5 else "Plata",
                "porcentaje_incremento": 10,
            }
            for b in sorted(barberos, key=lambda x: float(x.get("rating") or 0), reverse=True)
        ],
    }


# ----------------------------------------------------------------------
# POST /api/login  ->  perfil plano (la v1 no usaba tokens)
# ----------------------------------------------------------------------

@router.post("/login", summary="Inicio de sesion (compatibilidad v1)")
def login_v1(datos: LoginRequest, contexto: DatosPeticion) -> dict:
    """Valida credenciales igual que `/auth/login` y responde el perfil plano.

    Incluye tambien `access_token` por si el frontend quiere empezar a usarlo;
    el codigo actual simplemente lo ignora.
    """
    sesion = auth_service.login(datos.correo, datos.contrasena, contexto)
    return _sesion_v1(sesion)


# ----------------------------------------------------------------------
# POST /api/clientes  ->  registro publico
# ----------------------------------------------------------------------

@router.post("/clientes", status_code=201, summary="Alta de cliente (v1 publica / v2 con token)")
def crear_cliente_v1(
    peticion: Request,
    contexto: DatosPeticion,
    actor: UsuarioOpcional = None,
) -> Any:
    """Atiende las dos versiones sobre la misma ruta.

    - Con token de administrador o barbero: se comporta exactamente como el
      alta v2, delegando en `routers.clientes.crear` (misma validacion, misma
      auditoria y misma respuesta `ClienteResumenOut`).
    - Sin token: registro publico, como en la v1, que es lo que hace el
      formulario de registro del frontend.

    El registro publico ya existe en `/api/auth/registro`, asi que no abre
    ningun permiso nuevo: solo conserva la ruta que el frontend usa hoy.
    """
    cuerpo = _cuerpo_json(peticion)

    if actor is not None and (actor.es_admin or actor.es_barbero):
        creado = clientes_router.crear(_validar(ClienteCreate, cuerpo), actor, contexto)
        # Se aplica el mismo response_model que la ruta v2 para no perder
        # los campos calculados de ClienteResumenOut.
        return ClienteResumenOut.model_validate(creado).model_dump()

    datos = _validar(RegistroClienteRequest, cuerpo)
    sesion = auth_service.registrar_cliente(datos.model_dump(), contexto)
    return _sesion_v1(sesion)


# ----------------------------------------------------------------------
# POST /api/citas  ->  acepta el payload de la v1
# ----------------------------------------------------------------------

@router.post("/citas", status_code=201, summary="Crear cita (acepta payload v1 y v2)")
def crear_cita_v1(
    peticion: Request,
    contexto: DatosPeticion,
    actor: UsuarioOpcional = None,
) -> dict:
    """Traduce el payload de la v1 y delega en el servicio de citas de la v2.

    La v1 enviaba `id_usuario` (el usuario del barbero) y `hora`; la v2 espera
    `id_barbero` y `hora_inicio`, y calcula `hora_fin` con la duracion del
    servicio. Se aceptan ambas formas.

    Con token se aplican las reglas de la v2 sin excepcion (un cliente solo
    agenda para si mismo). Sin token hay que enviar `id_cliente` en el cuerpo,
    que es como reservaba el frontend en la v1; todas las validaciones de
    negocio (barbero activo, jornada, bloqueos y solapamiento) siguen
    aplicandose igual.
    """
    cuerpo = _cuerpo_json(peticion)

    # Si ya viene en formato v2 y hay sesion, se delega tal cual en la ruta v2:
    # misma validacion de esquema (incluidos campos como puntos_a_canjear),
    # mismas reglas y misma respuesta.
    if actor is not None and cuerpo.get("id_barbero") and cuerpo.get("hora_inicio"):
        return citas_router.crear(_validar(CitaCreate, cuerpo), actor, contexto)

    id_barbero = cuerpo.get("id_barbero")
    if id_barbero is None and cuerpo.get("id_usuario") is not None:
        # La v1 identificaba al barbero por su id_usuario.
        fila = fetch_one(
            "SELECT id_barbero FROM barberos WHERE id_usuario = %s",
            (int(cuerpo["id_usuario"]),),
        )
        if not fila:
            raise DatosInvalidos("El barbero indicado no existe")
        id_barbero = fila["id_barbero"]

    # Se parte del cuerpo completo para no perder campos opcionales de la v2
    # (puntos_a_canjear, descuento, etc.) y solo se traducen las claves v1.
    datos = {k: v for k, v in cuerpo.items() if k != "id_usuario"}
    datos["id_barbero"] = id_barbero
    datos["hora_inicio"] = cuerpo.get("hora_inicio") or cuerpo.get("hora")
    datos.pop("hora", None)

    # Nombres en lenguaje natural: este mensaje se le muestra tal cual a la
    # persona que reserva, y "hora_inicio" no le dice nada a un cliente.
    ETIQUETAS = {
        "id_barbero": "el barbero",
        "id_servicio": "el servicio",
        "fecha": "la fecha",
        "hora_inicio": "la hora de inicio",
    }
    faltantes = [
        ETIQUETAS[c]
        for c in ("id_barbero", "id_servicio", "fecha", "hora_inicio")
        if not datos.get(c)
    ]
    if faltantes:
        if len(faltantes) == 1:
            detalle = faltantes[0]
        else:
            detalle = ", ".join(faltantes[:-1]) + " y " + faltantes[-1]
        raise DatosInvalidos(f"Para agendar la cita falta seleccionar {detalle}.")

    cita = citas_service.crear(datos, actor=actor, contexto=contexto)

    # Respuesta con las claves de la v1 ademas de las de la v2.
    return {
        **cita,
        "hora": _hhmm(cita.get("hora_inicio")),
        "id_usuario": cuerpo.get("id_usuario"),
    }
