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
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";               // TanStack React Query cache and provider
import { httpBatchLink } from "@trpc/client";                                              // tRPC HTTP batch network link
import React from "react";                                                                 // React library
import ReactDOM from "react-dom/client";                                                   // React DOM root renderer
import superjson from "superjson";                                                         // Superjson serializer supporting complex types
import App from "./App.tsx";                                                               // Root application router component
import { ThemeProvider } from "./context/ThemeContext.tsx";                                // Dark/light mode theme provider
import "./index.css";                                                                      // Global liquid-glass CSS styles and animations
import { trpc } from "./lib/trpc";                                                         // Type-safe tRPC React hooks

// STEP 1: Initialize TanStack Query Client with no-retry policy for fast UX failure feedback
const queryClient = new QueryClient({
  defaultOptions: { 
    queries: { 
      retry: false,                                                                        // Fail fast without continuous retries on network error
      refetchOnWindowFocus: false                                                          // Prevent unwanted refetches when switching browser tabs
    } 
  },
});

// STEP 2: Configure tRPC batch client pointing to local Express API server
const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: "/api/trpc",                                                                    // Relative URL routing to Express backend
      transformer: superjson,                                                              // Preserve JavaScript Date objects across HTTP boundary
      // Ensure cross-origin or local cookie headers are passed for session verification
      fetch: (url, options) => fetch(url, { ...options, credentials: "include" })          // Send HTTP-only session cookies with every request
    })
  ],
});

// Mount the React tree into the root DOM element
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
