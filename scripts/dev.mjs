/**
 * ============================================================================
 * LIFELINK LOCAL DEV RUNNER (scripts/dev.mjs)
 * ============================================================================
 * 
 * HOW TO RUN LOCALLY IN TERMINAL:
 * Command: `npm run dev`
 * 
 * WHAT THIS SCRIPT DOES:
 * 1. Port Cleanup: Automatically checks and frees ports (e.g., 4000/3000 for backend, 5173 for frontend)
 *    to prevent "EADDRINUSE" errors common on Windows.
 * 2. Parallel Process Spawning:
 *    - Backend API: Spawns `tsx watch backend/_core/index.ts` with hot-reloading.
 *    - Frontend Dev Server: Spawns `vite --port 5173` with Lightning CSS and Fast Refresh.
 * 3. Unified Terminal Output: Streams logs from both processes directly to the active terminal.
 * 4. Graceful Cleanup: Intercepts SIGINT/SIGTERM (Ctrl+C) to terminate both child processes cleanly.
 */
import { exec, execSync, spawn } from "node:child_process";
import path from "node:path";
import process from "node:process";
import "dotenv/config";

// Configuration for local API and Frontend ports
const PORT = Number(process.env.PORT || 3000);
const API_PORT = PORT;
const FRONTEND_PORT = 5173;

const npmBinPath = path.resolve(process.cwd(), "node_modules/.bin");
const devEnv = {
  ...process.env,
  PATH: `${npmBinPath}${path.delimiter}${process.env.PATH || ""}`,
  Path: `${npmBinPath}${path.delimiter}${process.env.Path || ""}`,
};

/**
 * Windows-compatible port cleaner to kill orphaned node processes occupying the ports.
 */
function freePort(port) {
  try {
    if (process.platform === "win32") {
      const out = execSync(`netstat -ano | findstr LISTENING | findstr :${port}`, { encoding: "utf-8" });
      const lines = out.split("\n").map(l => l.trim()).filter(Boolean);
      for (const line of lines) {
        const parts = line.split(/\s+/);
        const pid = parts[parts.length - 1];
        if (pid && pid !== "0" && pid !== String(process.pid) && pid !== String(process.ppid)) {
          try {
            execSync(`taskkill /pid ${pid} /F /T`, { stdio: "ignore" });
          } catch (_) {}
        }
      }
    }
  } catch (_) {}
}

// STEP 1: Ensure ports are completely clean before starting
freePort(API_PORT);
freePort(FRONTEND_PORT);

// STEP 2: Define command lines for backend and frontend
const backendCmd = "cross-env NODE_ENV=development tsx watch backend/_core/index.ts";
const frontendCmd = `npx vite --port ${FRONTEND_PORT}`;

let backendChild;
let frontendChild;

function startProcesses() {
  console.log("\n=======================================================");
  console.log("  🚀 LifeLink Decoupled Workspace Development Server");
  console.log(`  LifeLink dev server running at http://localhost:${API_PORT}`);
  console.log(`  - Frontend Application:  http://localhost:${FRONTEND_PORT}`);
  console.log(`  - Backend API Engine:    http://localhost:${API_PORT}`);
  console.log("=======================================================\n");

  backendChild = spawn(backendCmd, {
    cwd: process.cwd(),
    env: devEnv,
    shell: true,
    stdio: ["ignore", "inherit", "inherit"],
  });

  frontendChild = spawn(frontendCmd, {
    cwd: process.cwd(),
    env: devEnv,
    shell: true,
    stdio: ["ignore", "inherit", "inherit"],
  });

  backendChild.once("exit", (code, signal) => {
    if (code !== 0 && signal !== "SIGTERM" && signal !== "SIGINT") {
      console.error(`\n[Backend] Exited with code ${code ?? "unknown"}.`);
    }
  });

  frontendChild.once("exit", (code, signal) => {
    if (code !== 0 && signal !== "SIGTERM" && signal !== "SIGINT") {
      console.error(`\n[Frontend] Exited with code ${code ?? "unknown"}.`);
    }
  });
}

function stopProcesses() {
  if (backendChild && !backendChild.killed) {
    if (process.platform === "win32") {
      try {
        execSync(`taskkill /pid ${backendChild.pid} /T /F`, { stdio: "ignore" });
      } catch (_) {}
    } else {
      backendChild.kill("SIGTERM");
    }
  }
  if (frontendChild && !frontendChild.killed) {
    if (process.platform === "win32") {
      try {
        execSync(`taskkill /pid ${frontendChild.pid} /T /F`, { stdio: "ignore" });
      } catch (_) {}
    } else {
      frontendChild.kill("SIGTERM");
    }
  }
}

startProcesses();

process.on("SIGINT", () => {
  stopProcesses();
  process.exit(0);
});

process.on("SIGTERM", () => {
  stopProcesses();
  process.exit(0);
});
