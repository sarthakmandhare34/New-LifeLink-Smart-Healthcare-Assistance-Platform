import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { defineConfig } from "vite";

const plugins = [react(), tailwindcss()];

// Read the dynamic API port injected by scripts/dev.mjs, or fallback to PORT/4000
const API_PORT = process.env.VITE_API_PORT || process.env.PORT || "4000";
const target = `http://localhost:${API_PORT}`;

export default defineConfig({
  plugins,
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "frontend", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  envDir: path.resolve(import.meta.dirname),
  root: path.resolve(import.meta.dirname, "frontend"),
  publicDir: path.resolve(import.meta.dirname, "frontend", "public"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    host: true,
    open: true,
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
    proxy: {
      "/api": {
        target: target,
        changeOrigin: true,
        ws: true,
      },
      "/uploads": {
        target: target,
        changeOrigin: true,
      },
    },
  },
});
