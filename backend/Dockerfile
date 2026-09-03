FROM python:3.13-slim

COPY --from=ghcr.io/astral-sh/uv:0.11.7 /uv /uvx /usr/local/bin/

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy

# python:3.13-slim no trae la base de zonas horarias: sin tzdata la
# variable TZ se ignora y el contenedor se queda en UTC (5 horas por
# delante de Colombia), rechazando como "pasado" las citas de hoy.
RUN apt-get update \
    && apt-get install -y --no-install-recommends tzdata \
    && rm -rf /var/lib/apt/lists/*
ENV TZ=America/Bogota

WORKDIR /app

COPY pyproject.toml uv.lock .
RUN uv sync --frozen --no-dev

COPY . .

ENV PATH="/app/.venv/bin:$PATH"

RUN chmod +x /app/docker-entrypoint.sh \
    && useradd --create-home --shell /bin/bash globde \
    && mkdir -p /app/media/avatars \
    && chown -R globde:globde /app
USER globde

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD python -c "import urllib.request,sys; sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:8000/api/health', timeout=4).status == 200 else 1)"

# El entrypoint aplica 'alembic upgrade head' antes de ceder el control
# al CMD, para que la API nunca arranque contra un esquema desactualizado.
ENTRYPOINT ["/app/docker-entrypoint.sh"]

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
