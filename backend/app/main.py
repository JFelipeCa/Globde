import logging
import time
from contextlib import asynccontextmanager

from fastapi import APIRouter, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.exceptions import registrar_manejadores
from app.db.database import cerrar_pool, ping, version_mysql
from app.routers import (
    auditoria,
    auth,
    barberos,
    citas,
    clientes,
    facturas,
    legacy,
    notificaciones,
    penalidades,
    puntos,
    reportes,
    resenas,
    servicios,
    usuarios,
)

logging.basicConfig(
    level=logging.DEBUG if settings.DEBUG else logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("globde")


def esperar_base_de_datos(intentos: int = 30, espera: float = 2.0) -> bool:
    
    for intento in range(1, intentos + 1):
        if ping():
            return True
        if intento == 1:
            logger.info(
                "La base de datos aun no responde en %s:%s. Reintentando "
                "durante %.0f segundos...",
                settings.DB_HOST, settings.DB_PORT, intentos * espera,
            )
        # El pool guarda el fallo; hay que descartarlo antes de reintentar.
        cerrar_pool()
        time.sleep(espera)
    return False


@asynccontextmanager
async def ciclo_de_vida(_: FastAPI):
    
    for aviso in settings.validar():
        logger.warning("Configuracion: %s", aviso)

    if esperar_base_de_datos():
        logger.info(
            "Conexion a la base de datos '%s' establecida (MySQL %s)",
            settings.DB_NAME, version_mysql(),
        )
    else:
        logger.error(
            "No se pudo conectar a la base de datos %s:%s. La API respondera 503 "
            "en los endpoints que la usen.",
            settings.DB_HOST, settings.DB_PORT,
        )

    yield

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
    auth,
    usuarios,
    clientes,
    barberos,
    servicios,
    citas,
    facturas,
    resenas,
    puntos,
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
