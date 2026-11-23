import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import APIRouter, FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.exceptions import registrar_manejadores
from app.db.database import cerrar_pool, ping, version_mysql
from app.routers import (
    agenda,
    auditoria,
    auth,
    barberos,
    citas,
    clientes,
    facturas,
    legacy,
    lista_espera,
    notificaciones,
    penalidades,
    puntos,
    reportes,
    resenas,
    servicios,
    usuarios,
)
from app.services import lista_espera_service, recordatorios_service

logging.basicConfig(
    level=logging.DEBUG if settings.DEBUG else logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("globde")

async def _procesar_recordatorios_periodicamente() -> None:
    while True:
        try:
            enviados = await asyncio.to_thread(recordatorios_service.procesar_recordatorios)
            if enviados:
                logger.info("Se enviaron %s recordatorios de citas.", enviados)
        except Exception:
            logger.exception("Falló el procesamiento de recordatorios de citas.")
        try:
            ofertas = await asyncio.to_thread(lista_espera_service.procesar_ofertas)
            if ofertas:
                logger.info("Se ofrecieron %s turnos liberados.", ofertas)
        except Exception:
            logger.exception("Falló el procesamiento de ofertas de lista de espera.")
        await asyncio.sleep(60)


@asynccontextmanager
async def ciclo_de_vida(_: FastAPI):
    
    for aviso in settings.validar():
        logger.warning("Configuracion: %s", aviso)

    logger.info("API disponible. El estado de la base de datos se consulta en /api/health.")
    tarea_recordatorios = asyncio.create_task(_procesar_recordatorios_periodicamente())

    try:
        yield
    finally:
        tarea_recordatorios.cancel()
        try:
            await tarea_recordatorios
        except asyncio.CancelledError:
            pass

        cerrar_pool()
        logger.info("Pool de conexiones cerrado. Hasta luego.")


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description=(
        "API REST de la barberia GLOBDE. Autenticacion JWT por roles "
        "(administrador, barbero y cliente) sobre el esquema de base de datos v2."
    ),
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    lifespan=ciclo_de_vida,
)

app.mount("/api/media", StaticFiles(directory="media"), name="media")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

registrar_manejadores(app)


# ----------------------------------------------------------------------
# Routers de dominio
# ----------------------------------------------------------------------

api = APIRouter(prefix="/api")

if settings.ENABLE_LEGACY_ROUTES:
    api.include_router(legacy.router)
    logger.info(
        "Rutas de compatibilidad v1 activas (/api/datos, /api/login, "
        "POST /api/clientes, POST /api/citas)"
    )

for modulo in (
    agenda,
    auth,
    usuarios,
    clientes,
    barberos,
    servicios,
    citas,
    facturas,
    resenas,
    puntos,
    lista_espera,
    notificaciones,
    penalidades,
    reportes,
    auditoria,
):
    api.include_router(modulo.router)


@api.get("/health", tags=["Sistema"], summary="Estado del servicio")
def health():
    conectado = ping()
    return {
        "estado": "ok" if conectado else "degradado",
        "aplicacion": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "entorno": settings.APP_ENV,
        "base_datos": {
            "conectada": conectado,
            "nombre": settings.DB_NAME,
            "motor": version_mysql() if conectado else None,
        },
    }


app.include_router(api)


@app.get("/", tags=["Sistema"], summary="Bienvenida")
def raiz():
    return {
        "mensaje": f"{settings.APP_NAME} v{settings.APP_VERSION}",
        "documentacion": "/docs",
        "health": "/api/health",
    }
