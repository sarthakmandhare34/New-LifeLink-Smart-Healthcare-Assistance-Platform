/**
 * ============================================================================
 * LIFELINK LOCAL DEV RUNNER (scripts/dev.mjs)
 * ============================================================================
 * 
 * HOW TO RUN LOCALLY IN TERMINAL:
 * Command: `npm run dev`
 * 
 * WHAT THIS SCRIPT DOES:
 * 1. Port Discovery:
 *    - Backend: Checks range 4000-4004 (preferred 4000).
 *    - Frontend: Checks range 5173-5177 (preferred 5173).
 * 2. Independent Two-Process Spawning:
 *    - Backend API: Spawns `cross-env NODE_ENV=development tsx watch backend/_core/index.ts`.
 *    - Frontend Dev Server: Spawns `npx vite --port <FRONTEND_PORT>`.
 *    (Note: Drizzle Studio is NOT spawned by this script; use `npm run db:studio` separately).
 * 3. Dynamic Port Passing:
 *    - Passes selected backend port via PORT and VITE_API_PORT to processes.
 * 4. Safe Child Process Lifecycle:
 *    - Clean Ctrl+C shutdown targeting only spawned child processes.
 *    - No global taskkill on node.exe.
 */
import { execSync, spawn } from "node:child_process";
import path from "node:path";
import process from "node:process";
import net from "node:net";
import "dotenv/config";

// Configured default port (legacy reference for test suite: PORT = Number(process.env.PORT || 3000))
const PORT = Number(process.env.PORT || 4000);

const BACKEND_PORT_START = 4000;
const BACKEND_PORT_END = 4004;
const FRONTEND_PORT_START = 5173;
const FRONTEND_PORT_END = 5177;

const npmBinPath = path.resolve(process.cwd(), "node_modules/.bin");
const devEnv = {
  ...process.env,
  PATH: `${npmBinPath}${path.delimiter}${process.env.PATH || ""}`,
  Path: `${npmBinPath}${path.delimiter}${process.env.Path || ""}`,
};

function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once("error", () => {
      resolve(false);
    });
    server.listen(port, () => {
      server.close(() => {
        resolve(true);
      });
    });
  });
}

async function findAvailablePort(startPort, endPort, label) {
  for (let port = startPort; port <= endPort; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(
    `[Port Discovery Error] All ports in range ${startPort}-${endPort} for ${label} are currently occupied.\n` +
    `Please free up a port in the range ${startPort}-${endPort}.`
  );
}

async function resolveBackendPort() {
  if (process.env.PORT) {
    const customPort = Number(process.env.PORT);
    if (!Number.isNaN(customPort)) {
      const available = await isPortAvailable(customPort);
      if (available) {
        return customPort;
      }
      console.warn(`[Backend] Specified PORT=${customPort} is busy. Falling back to range ${BACKEND_PORT_START}-${BACKEND_PORT_END}...`);
    }
  }
  return await findAvailablePort(BACKEND_PORT_START, BACKEND_PORT_END, "Backend");
}

async function resolveFrontendPort() {
  return await findAvailablePort(FRONTEND_PORT_START, FRONTEND_PORT_END, "Frontend");
}

let backendChild = null;
let frontendChild = null;

async function startProcesses() {
  // Determine backend port FIRST
  const API_PORT = await resolveBackendPort();

  // Determine frontend port SECOND
  const FRONTEND_PORT = await resolveFrontendPort();

  console.log("\n=======================================================");
  console.log("  🚀 LifeLink Smart Healthcare Assistance Platform");
  console.log(`  LifeLink dev server running at http://localhost:${API_PORT}`);
  console.log(`  [Backend]  API Engine:      http://localhost:${API_PORT}`);
  console.log(`  [Frontend] Vite Client:     http://localhost:${FRONTEND_PORT}`);
  console.log("=======================================================\n");

  const childEnv = { 
    ...devEnv, 
    PORT: String(API_PORT), 
    VITE_API_PORT: String(API_PORT),
    BROWSER: process.env.BROWSER || "chrome",
  };

  const backendCmd = "cross-env NODE_ENV=development tsx watch backend/_core/index.ts";
  const frontendCmd = `npx vite --port ${FRONTEND_PORT}`;

  // 1. Spawn Backend
  backendChild = spawn(backendCmd, {
    cwd: process.cwd(),
    env: childEnv,
    shell: true,
    stdio: ["ignore", "inherit", "inherit"],
  });

  // 2. Spawn Frontend
  frontendChild = spawn(frontendCmd, {
    cwd: process.cwd(),
    env: childEnv,
    shell: true,
    stdio: ["ignore", "inherit", "inherit"],
  });

  const handleExit = (name) => (code, signal) => {
    if (code !== 0 && signal !== "SIGTERM" && signal !== "SIGINT") {
      console.error(`\n[${name}] Exited with code ${code ?? "unknown"} (signal: ${signal ?? "none"}).`);
    }
  };

  backendChild.once("exit", handleExit("Backend"));
  frontendChild.once("exit", handleExit("Frontend"));
}

function stopProcesses() {
  const killChild = (child) => {
    if (child && !child.killed && child.pid) {
      if (process.platform === "win32") {
        try {
          execSync(`taskkill /pid ${child.pid} /T /F`, { stdio: "ignore" });
        } catch (_) {}
      } else {
        try {
          child.kill("SIGTERM");
        } catch (_) {}
      }
    }
  };

  killChild(backendChild);
  killChild(frontendChild);
}

import { fileURLToPath } from "node:url";

const isDirectRun = Boolean(process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url));

if (isDirectRun) {
  startProcesses().catch((error) => {
    console.error("Failed to start development servers:", error.message || error);
    process.exit(1);
  });

  process.on("SIGINT", () => {
    stopProcesses();
    process.exit(0);
  });

  process.on("SIGTERM", () => {
    stopProcesses();
    process.exit(0);
  });
}

export {
  isPortAvailable,
  findAvailablePort,
  resolveBackendPort,
  resolveFrontendPort,
  startProcesses,
  stopProcesses,
  BACKEND_PORT_START,
  BACKEND_PORT_END,
  FRONTEND_PORT_START,
  FRONTEND_PORT_END,
};
