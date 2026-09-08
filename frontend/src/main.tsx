/**
 * ============================================================================
 * LIFELINK FRONTEND: CLIENT ENTRY POINT (frontend/src/main.tsx)
 * ============================================================================
 * 
 * WHAT THIS FILE DOES:
 * This is the root bootstrap file of the LifeLink React 19 application.
 * It configures and mounts the core application providers:
 * 1. React Query (`QueryClient`): Manages async state caching, retries, and data synchronization.
 * 2. tRPC Client (`trpc.createClient`): End-to-end type-safe RPC client communicating with `/api/trpc`.
 *    - Uses `superjson` for seamless serialization of complex objects (Dates, BigInt, Sets).
 *    - Configures `credentials: "include"` so HTTP cookies are sent on every request for session auth.
 * 3. Theme Provider: Supplies persistent dark/light liquid-glass aesthetic variables.
 * 4. App Component: Mounts the application routing layer.
 */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import React from "react";
import ReactDOM from "react-dom/client";
import superjson from "superjson";
import App from "./App.tsx";
import { ThemeProvider } from "./context/ThemeContext.tsx";
import "./index.css";
import { trpc } from "./lib/trpc";

// STEP 1: Initialize TanStack Query Client with no-retry policy for fast UX failure feedback
const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } },
});

// STEP 2: Configure tRPC batch client pointing to local Express API server
const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: "/api/trpc",
      transformer: superjson,
      // Ensure cross-origin or local cookie headers are passed for session verification
      fetch: (url, options) => fetch(url, { ...options, credentials: "include" })
    })
  ],
});


ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <App />
        </ThemeProvider>
      </QueryClientProvider>
    </trpc.Provider>
  </React.StrictMode>,
);
