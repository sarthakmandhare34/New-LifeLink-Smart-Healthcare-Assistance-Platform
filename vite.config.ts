import tailwindcss from "@tailwindcss/vite";                   // Vite plugin for compiling Tailwind CSS utility classes
import react from "@vitejs/plugin-react";                        // Official Vite plugin providing React Fast Refresh and JSX support
import path from "node:path";                                    // Node.js built-in module for resolving cross-platform file paths
import { defineConfig } from "vite";                             // Helper function providing full TypeScript type-hinting for Vite config

// --- Cluster: Build Plugins ---
const plugins = [
  react(),                                                       // Enables React 19 JSX compilation and hot module reloading (HMR)
  tailwindcss()                                                  // Processes and bundles modern Tailwind CSS styles automatically
];

// --- Cluster: Dynamic API Port Configuration ---
// In development, scripts/dev.mjs finds an open port and injects VITE_API_PORT.
// If not found, it defaults to the standard Express port (4000).
const API_PORT = process.env.VITE_API_PORT || process.env.PORT || "4000"; // Read backend port from environment or fallback to 4000
const target = `http://localhost:${API_PORT}`;                            // Destination URL for forwarding API calls to backend Express

export default defineConfig({
  plugins,                                                       // Registers our React and Tailwind plugins with Vite
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "frontend", "src"), // "@" maps directly to frontend source code folder
      "@shared": path.resolve(import.meta.dirname, "shared"),    // "@shared" maps to shared constants and validation logic
      "@assets": path.resolve(import.meta.dirname, "attached_assets"), // "@assets" maps to static design assets and icons
    },
  },
  envDir: path.resolve(import.meta.dirname),                      // Look for .env files in the project root directory
  root: path.resolve(import.meta.dirname, "frontend"),            // Set Vite's project root to the frontend folder
  publicDir: path.resolve(import.meta.dirname, "frontend", "public"), // Folder containing static files served directly as-is
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),     // Compile production frontend bundle into dist/public folder
    emptyOutDir: true,                                           // Clean old files in dist/public before starting a new build
  },
  server: {
    port: 5173,                                                  // Run Vite local dev server on standard port 5173
    host: true,                                                  // Listen on all network interfaces (allows mobile / LAN testing)
    open: true,                                                  // Automatically open the app in the default web browser on launch
    fs: {
      strict: true,                                              // Enforce security by restricting file access inside project root
      deny: ["**/.*"],                                           // Prevent serving hidden files (like .env or .git files) to browsers
    },
    // --- Cluster: Reverse Proxy Settings ---
    // Forwards API requests from port 5173 to port 4000 seamlessly to avoid browser CORS errors
    proxy: {
      "/api": {
        target: target,                                          // Forward all /api/trpc calls directly to the Express backend
        changeOrigin: true,                                      // Changes the Host header to match backend target
        ws: true,                                                // Enable WebSocket / SSE forwarding for live event streaming
      },
      "/uploads": {
        target: target,                                          // Forward avatar and document requests to Express static folder
        changeOrigin: true,                                      // Rewrite origin header for static asset access
      },
    },
  },
});
