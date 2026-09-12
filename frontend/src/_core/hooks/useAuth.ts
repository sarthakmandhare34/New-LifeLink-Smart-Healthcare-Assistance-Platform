import { startLogin } from "@/lib/auth";                                                       // Auth redirection helper
import { trpc } from "@/lib/trpc";                                                             // Type-safe tRPC client bridge
import { TRPCClientError } from "@trpc/client";                                                 // tRPC error class
import { useCallback, useEffect, useMemo } from "react";                                        // Core React hooks

// Configuration options for useAuth hook
type UseAuthOptions = {
  redirectOnUnauthenticated?: boolean;                                                          // If true, automatically boots unauthenticated users to login
  redirectPath?: string;                                                                        // Custom redirect URL path (defaults to OAuth startLogin)
};

// =========================================================================================
// UNIVERSAL CLIENT AUTHENTICATION HOOK (useAuth)
// Reads the active patient session from `trpc.auth.me`, exposes user metadata,
// login/logout state machine, and handles automated security redirects.
// =========================================================================================
export function useAuth(options?: UseAuthOptions) {
  const { redirectOnUnauthenticated = false, redirectPath } = options ?? {};
  const utils = trpc.useUtils();                                                                // Cache invalidator

  // Query authenticated user session from backend cookie
  const meQuery = trpc.auth.me.useQuery(undefined, {
    retry: false,                                                                               // Do not retry 401s
    refetchOnWindowFocus: false,                                                                // Prevent unnecessary refetches
  });

  // Logout mutation clearing auth cookies
  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => {
      utils.auth.me.setData(undefined, null);                                                   // Clear local user cache immediately
    },
  });

  // Memoized logout callback function
  const logout = useCallback(async () => {
    try {
      await logoutMutation.mutateAsync();                                                       // Tell server to delete auth session cookie
    } catch (error: unknown) {
      if (
        error instanceof TRPCClientError &&
        error.data?.code === "UNAUTHORIZED"
      ) {
        return;                                                                                 // Ignore if already unauthenticated
      }
      throw error;
    } finally {
      utils.auth.me.setData(undefined, null);                                                   // Clear cache
      await utils.auth.me.invalidate();                                                         // Force re-evaluation
    }
  }, [logoutMutation, utils]);

  // Derived user state
  const state = useMemo(() => {
    return {
      user: meQuery.data ?? null,                                                               // User object or null
      loading: meQuery.isLoading || logoutMutation.isPending || (meQuery.isFetching && !meQuery.data), // Loading indicator
      error: meQuery.error ?? logoutMutation.error ?? null,                                     // Error state
      isAuthenticated: Boolean(meQuery.data),                                                   // True if user is logged in
    };
  }, [
    meQuery.data,
    meQuery.error,
    meQuery.isLoading,
    meQuery.isFetching,
    logoutMutation.error,
    logoutMutation.isPending,
  ]);

  // Automated redirect effect when unauthenticated user visits protected page
  useEffect(() => {
    if (!redirectOnUnauthenticated) return;
    if (meQuery.isLoading || logoutMutation.isPending) return;
    if (state.user) return;
    if (typeof window === "undefined") return;
    if (redirectPath && window.location.pathname === redirectPath) return;

    if (redirectPath) {
      window.location.href = redirectPath;                                                      // Redirect to designated path
    } else {
      startLogin();                                                                             // Initiate OAuth portal login
    }
  }, [
    redirectOnUnauthenticated,
    redirectPath,
    logoutMutation.isPending,
    meQuery.isLoading,
    state.user,
  ]);

  return {
    ...state,
    refresh: () => meQuery.refetch(),                                                           // Manual refresh trigger
    logout,                                                                                     // Logout function
  };
}
