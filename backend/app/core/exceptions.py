import logging

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from app.db.database import MySQLError

logger = logging.getLogger("globde.errors")


class GlobdeError(Exception):
    """Error de dominio de la aplicacion."""

    status_code: int = status.HTTP_400_BAD_REQUEST
    mensaje: str = "Ocurrio un error en la operacion"

    def __init__(self, mensaje: str | None = None, status_code: int | None = None):
        self.mensaje = mensaje or self.mensaje
        self.status_code = status_code or self.status_code
        super().__init__(self.mensaje)


class NoEncontrado(GlobdeError):
    status_code = status.HTTP_404_NOT_FOUND
    mensaje = "Recurso no encontrado"


class DatosInvalidos(GlobdeError):
    status_code = status.HTTP_400_BAD_REQUEST
    mensaje = "Datos invalidos"


class Conflicto(GlobdeError):
    status_code = status.HTTP_409_CONFLICT
    mensaje = "La operacion genera un conflicto con el estado actual"


class NoAutorizado(GlobdeError):
    status_code = status.HTTP_401_UNAUTHORIZED
    mensaje = "Credenciales invalidas o token ausente"


class Prohibido(GlobdeError):
    status_code = status.HTTP_403_FORBIDDEN
    mensaje = "No tienes permisos para realizar esta accion"


class DemasiadosIntentos(GlobdeError):
    status_code = status.HTTP_429_TOO_MANY_REQUESTS
    mensaje = "Demasiados intentos. Intenta de nuevo mas tarde"


def registrar_manejadores(app: FastAPI) -> None:
   
    @app.exception_handler(GlobdeError)
    async def _globde_error(_: Request, exc: GlobdeError):
        return JSONResponse(
            status_code=exc.status_code,
            content={"detail": exc.mensaje, "error": exc.__class__.__name__},
        )

    @app.exception_handler(RequestValidationError)
    async def _validacion(_: Request, exc: RequestValidationError):
        errores = []
        for error in exc.errors():
            campo = ".".join(str(p) for p in error.get("loc", []) if p != "body")
            errores.append({"campo": campo or "body", "mensaje": error.get("msg", "")})
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content={"detail": "Datos de entrada invalidos", "errores": errores},
        )

    @app.exception_handler(MySQLError)
    async def _mysql_error(_: Request, exc: MySQLError):
        # No se expone el detalle del motor al cliente (OWASP A05)
        logger.exception("Error de base de datos: %s", exc)
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={"detail": "Error de base de datos. Intenta nuevamente."},
        )

    @app.exception_handler(Exception)
    async def _error_no_controlado(_: Request, exc: Exception):
        logger.exception("Error no controlado: %s", exc)
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"detail": "Error interno del servidor"},
        )


__all__ = [
    "GlobdeError",
    "NoEncontrado",
    "DatosInvalidos",
    "Conflicto",
    "NoAutorizado",
    "Prohibido",
    "DemasiadosIntentos",
    "registrar_manejadores",
]
