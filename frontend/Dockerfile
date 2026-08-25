# Frontend GLOBDE - entorno de desarrollo con Vite.
# Sirve la app en :5173 y redirige /api al backend por el proxy de Vite,
# de modo que el navegador nunca necesita conocer la URL del backend.
FROM node:22-slim

RUN corepack enable && corepack prepare pnpm@11.20.0 --activate

WORKDIR /app

# Primero las dependencias, para aprovechar la cache de capas.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .

EXPOSE 5173

# El proxy apunta al servicio "backend" de docker-compose.
ENV VITE_PROXY_TARGET=http://backend:8000

CMD ["pnpm", "exec", "vite", "--host", "0.0.0.0", "--port", "5173"]
