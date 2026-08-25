import path from "path";
import { fileURLToPath } from "url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  // Destino del proxy en desarrollo. VITE_PROXY_TARGET tiene prioridad para
  // poder apuntar al backend dentro de Docker (http://backend:8000) sin
  // cambiar la URL que usa el navegador, que sigue siendo /api.
  const apiTarget =
    env.VITE_PROXY_TARGET ||
    env.VITE_API_URL?.replace(/\/api$/, "") ||
    "http://localhost:8000";

  return {
    plugins: [react(), tailwindcss(), viteSingleFile()],
    server: {
      host: "0.0.0.0",
      port: 5173,
      // Permite servir el sitio detras de un dominio de vista previa
      // (Codespaces, e2b, ngrok...) ademas de localhost.
      allowedHosts: true,
      proxy: {
        "/api": {
          target: apiTarget,
          changeOrigin: true,
        },
      },
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "src"),
      },
    },
  };
});
