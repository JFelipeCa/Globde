import os
import time
from functools import lru_cache

from dotenv import load_dotenv

load_dotenv()

# La barberia opera en Colombia. Si el proceso corre en UTC (el caso por
# defecto en Docker y en la mayoria de servidores), datetime.now() va 5
# horas adelantada y el backend rechaza como "pasado" citas de esta misma
# tarde. Se fija la zona antes de que nadie lea la hora.
os.environ.setdefault("TZ", "America/Bogota")
if hasattr(time, "tzset"):  # no existe en Windows
    time.tzset()


def _bool(nombre: str, por_defecto: bool = False) -> bool:
    valor = os.getenv(nombre)
    if valor is None:
        return por_defecto
    return valor.strip().lower() in {"1", "true", "yes", "si", "sí", "on"}


def _int(nombre: str, por_defecto: int) -> int:
    try:
        return int(os.getenv(nombre, por_defecto))
    except (TypeError, ValueError):
        return por_defecto


def _float(nombre: str, por_defecto: float) -> float:
    try:
        return float(os.getenv(nombre, por_defecto))
    except (TypeError, ValueError):
        return por_defecto


class Settings:
   
    APP_NAME: str = os.getenv("APP_NAME", "GLOBDE API")
    APP_VERSION: str = os.getenv("APP_VERSION", "2.0.0")
    APP_ENV: str = os.getenv("APP_ENV", "development")
    DEBUG: bool = _bool("DEBUG", True)

    
    DB_HOST: str = os.getenv("DB_HOST", "127.0.0.1")
    DB_PORT: int = _int("DB_PORT", 3306)
    DB_USER: str = os.getenv("DB_USER", "root")
    DB_PASSWORD: str = os.getenv("DB_PASSWORD", "")
    DB_NAME: str = os.getenv("DB_NAME", "globde")
    DB_POOL_SIZE: int = _int("DB_POOL_SIZE", 10)
    DB_CONNECT_TIMEOUT: int = _int("DB_CONNECT_TIMEOUT", 10)

    
    JWT_SECRET: str = os.getenv("JWT_SECRET", "")
    JWT_ALGORITHM: str = os.getenv("JWT_ALGORITHM", "HS256")
    ACCESS_TOKEN_MINUTES: int = _int("ACCESS_TOKEN_MINUTES", 60)
    REFRESH_TOKEN_DAYS: int = _int("REFRESH_TOKEN_DAYS", 7)
    BCRYPT_ROUNDS: int = _int("BCRYPT_ROUNDS", 12)

    LOGIN_MAX_INTENTOS: int = _int("LOGIN_MAX_INTENTOS", 5)
    LOGIN_VENTANA_MINUTOS: int = _int("LOGIN_VENTANA_MINUTOS", 15)

    
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:5173")
    CORS_ORIGINS: str = os.getenv("CORS_ORIGINS", "*")

    
    RESET_TOKEN_MINUTES: int = _int("RESET_TOKEN_MINUTES", 30)

    
    EMAIL_ENABLED: bool = _bool("EMAIL_ENABLED", False)
    SMTP_HOST: str = os.getenv("SMTP_HOST", "")
    SMTP_PORT: int = _int("SMTP_PORT", 587)
    SMTP_USER: str = os.getenv("SMTP_USER", "")
    SMTP_PASSWORD: str = os.getenv("SMTP_PASSWORD", "")
    SMTP_FROM: str = os.getenv("SMTP_FROM", "") or os.getenv("SMTP_USER", "")
    SMTP_STARTTLS: bool = _bool("SMTP_STARTTLS", True)
    SMTP_TIMEOUT: int = _int("SMTP_TIMEOUT", 15)

    SLOT_STEP_MINUTOS: int = _int("SLOT_STEP_MINUTOS", 15)
    CANCELACION_HORAS_MINIMAS: int = _int("CANCELACION_HORAS_MINIMAS", 2)
    PUNTO_VALOR_COP: float = _float("PUNTO_VALOR_COP", 100.0)
    IVA_PORCENTAJE: float = _float("IVA_PORCENTAJE", 0.0)
    PENALIDAD_NO_ASISTENCIA: float = _float("PENALIDAD_NO_ASISTENCIA", 0.0)
    PENALIDAD_CANCELACION_TARDIA: float = _float("PENALIDAD_CANCELACION_TARDIA", 0.0)

  
    NIVEL_PLATA_DESDE: int = _int("NIVEL_PLATA_DESDE", 300)
    NIVEL_ORO_DESDE: int = _int("NIVEL_ORO_DESDE", 700)
    NIVEL_DIAMANTE_DESDE: int = _int("NIVEL_DIAMANTE_DESDE", 1500)

    
    # Rutas de compatibilidad v1 (/api/datos, /api/login, POST /api/clientes,
    # POST /api/citas). La API v2 las reemplaza por completo; se dejan APAGADAS
    # por defecto porque /api/datos respondia sin autenticacion exponiendo
    # correos, telefonos y citas (incumplia RNF-001 y OWASP A01).
    ENABLE_LEGACY_ROUTES: bool = _bool("ENABLE_LEGACY_ROUTES", False)

   
    ROL_ADMINISTRADOR: int = 1
    ROL_BARBERO: int = 2
    ROL_CLIENTE: int = 3

    @property
    def db_config(self) -> dict:
        return {
            "host": self.DB_HOST,
            "port": self.DB_PORT,
            "user": self.DB_USER,
            "password": self.DB_PASSWORD,
            "database": self.DB_NAME,
            "charset": "utf8mb4",
            "collation": "utf8mb4_unicode_ci",
            "connection_timeout": self.DB_CONNECT_TIMEOUT,
            "autocommit": False,
            "time_zone": "+00:00",
        }

    @property
    def cors_origins(self) -> list[str]:
        if self.CORS_ORIGINS.strip() == "*":
            return ["*"]
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]

    @property
    def smtp_configurado(self) -> bool:
        return bool(self.SMTP_HOST and self.SMTP_USER and self.SMTP_PASSWORD and self.SMTP_FROM)

    def validar(self) -> list[str]:
        """Devuelve advertencias de configuracion (no detiene el arranque en dev)."""
        avisos: list[str] = []
        if not self.JWT_SECRET:
            avisos.append(
                "JWT_SECRET no esta definido: se generara uno temporal y los tokens "
                "dejaran de ser validos al reiniciar. Definelo en el .env."
            )
        elif len(self.JWT_SECRET) < 32:
            avisos.append("JWT_SECRET es corto: se recomiendan minimo 32 caracteres.")
        if not self.DB_PASSWORD:
            avisos.append("DB_PASSWORD vacio: revisa la conexion a MySQL.")
        if self.EMAIL_ENABLED and not self.smtp_configurado:
            avisos.append(
                "EMAIL_ENABLED=true pero faltan SMTP_HOST/SMTP_USER/SMTP_PASSWORD/SMTP_FROM."
            )
        if self.APP_ENV == "production" and "*" in self.cors_origins:
            avisos.append("CORS_ORIGINS='*' en produccion: restringe los origenes permitidos.")
        return avisos


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
