import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

const backendPort = process.env.BACKEND_PORT || "3000";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@yt-auto-downloader/shared": path.resolve(
        __dirname,
        "../../packages/shared/types",
      ),
    },
  },
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: `http://localhost:${backendPort}`,
        changeOrigin: true,
      },
      "/ws": {
        target: `ws://localhost:${backendPort}`,
        ws: true,
      },
    },
  },
});
