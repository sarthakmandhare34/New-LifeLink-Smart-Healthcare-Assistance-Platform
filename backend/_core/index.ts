/**
 * LifeLink Backend API Server Entry Point
 * 
 * This file initializes the Express server, HTTP server, and all essential middlewares.
 * It is responsible for wiring up:
 * 1. Express body parsers for handling JSON and URL-encoded payloads.
 * 2. Specialized routes (e.g., OAuth authentication, realtime WebSockets, profile photo uploads).
 * 3. The tRPC API layer which serves as the primary data exchange protocol between frontend and backend.
 * 4. Development/Production Vite setups for serving frontend assets.
 */
import "dotenv/config";
import express from "express";
import path from "node:path";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";

import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { registerDoctorRealtimeRoute, registerPatientRealtimeRoute } from "../realtime/patientRealtime";
import { registerProviderAuthRoutes } from "../auth/providerAuth";
import { registerPatientProfilePhotoRoute } from "../profilePhoto";

/**
 * Helper function to check if a port is available on the system.
 */
function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

/**
 * Searches for an available port starting from the given startPort.
 */
async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 5; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // Register isolated route handlers outside of tRPC
  registerProviderAuthRoutes(app);
  registerPatientRealtimeRoute(app);
  registerDoctorRealtimeRoute(app);
  registerPatientProfilePhotoRoute(app);
  
  // Serve uploaded assets statically
  app.use("/uploads", express.static(path.resolve(process.cwd(), 'uploads')));
  
  // Initialize tRPC API endpoint
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );

  // In development mode with standalone Vite, Express runs as a dedicated API server.
  if (process.env.NODE_ENV === "development" && process.env.EMBED_VITE === "true") {
    await setupVite(app, server);
  } else if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    // Default fallback UI for the API server when running disconnected from frontend
    app.get("/", (_req, res) => {
      res.status(200).send(`
        <!DOCTYPE html>
        <html>
          <head><title>LifeLink API Server</title></head>
          <body style="font-family: system-ui, sans-serif; padding: 40px; background: #E6F9FC; color: #102B2D; text-align: center;">
            <h1 style="color: #00C4CC; margin-bottom: 8px;">LifeLink Backend API Server</h1>
            <p style="font-size: 1.1rem; color: #2D9D9C;">Running on port ${process.env.PORT || 4000}</p>
            <p style="margin-top: 24px;">Open the frontend application at: <br/><a href="http://localhost:5173" style="display: inline-block; margin-top: 12px; padding: 12px 24px; background: #00C4CC; color: #FFF; text-decoration: none; border-radius: 12px; font-weight: bold;">http://localhost:5173</a></p>
          </body>
        </html>
      `);
    });
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
