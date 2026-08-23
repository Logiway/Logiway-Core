import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, loadEnv } from "vite";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, projectRoot, "");
  const proxyTarget = new URL(
    env.DEV_API_PROXY_TARGET || "http://localhost:6767",
  );
  if (proxyTarget.protocol !== "http:" && proxyTarget.protocol !== "https:") {
    throw new Error("DEV_API_PROXY_TARGET must be an HTTP or HTTPS URL");
  }

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        "@": path.resolve(projectRoot, "src"),
      },
    },
    server: {
      proxy: {
        "/api": {
          target: proxyTarget.origin,
          changeOrigin: true,
        },
      },
    },
  };
});
