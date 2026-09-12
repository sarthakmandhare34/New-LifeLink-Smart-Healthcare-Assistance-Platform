import { defineConfig } from "vitest/config";                 // Vitest configuration helper function for typed test runner settings
import path from "path";                                         // Node.js path module for resolving absolute filesystem paths

// --- Cluster: Root Workspace Directory ---
const templateRoot = path.resolve(import.meta.dirname);          // Resolves the absolute root directory path of the LifeLink project

export default defineConfig({
  root: templateRoot,                                            // Sets the testing root directory to the repository root
  resolve: {
    // --- Cluster: Path Aliases for Tests ---
    // Mirrors Vite's path aliases so test imports like "@/components/..." work seamlessly without errors
    alias: {
      "@": path.resolve(templateRoot, "frontend", "src"),        // Alias pointing to frontend source folder
      "@shared": path.resolve(templateRoot, "shared"),           // Alias pointing to shared schemas and constants
      "@assets": path.resolve(templateRoot, "attached_assets"),   // Alias pointing to static image and design assets
    },
  },
  test: {
    environment: "node",                                         // Runs tests in a Node.js server environment (fast and lightweight)
    // --- Cluster: Test Discovery Patterns ---
    // Automatically detects and runs all unit & integration tests across backend, frontend, and scripts
    include: [
      "backend/**/*.test.ts",                                    // Backend unit and integration tests (tRPC routers, auth, DB)
      "backend/**/*.spec.ts",                                    // Backend specification test files
      "frontend/**/*.test.ts",                                   // Frontend TypeScript utility and hook test files
      "frontend/**/*.spec.ts",                                   // Frontend specification test files
      "frontend/**/*.test.tsx",                                  // Frontend React component UI test files
      "frontend/**/*.spec.tsx",                                  // Frontend React component specification files
      "scripts/**/*.test.ts"                                     // Build and dev script validation test files
    ],
  },
});
