/**
 * ============================================================================
 * LIFELINK BACKEND: tRPC REQUEST CONTEXT (backend/_core/context.ts)
 * ============================================================================
 * 
 * WHAT THIS FILE DOES:
 * This module generates the execution context for every incoming tRPC API request.
 * The context acts as the bridge between Express HTTP requests and tRPC procedures,
 * attaching the authenticated User object (if logged in) and standard HTTP objects (req, res).
 * 
 * HOW IT WORKS IN THE PIPELINE:
 * 1. Express receives an HTTP request at `/api/trpc/...`
 * 2. Express middleware invokes `createContext(opts)` before calling the procedure.
 * 3. `authSession.authenticateRequest` inspects cookies / Authorization Bearer tokens.
 * 4. If valid, the authenticated `User` record from the database is attached.
 * 5. If invalid or unauthenticated, `user` is set to `null` (allowing public routes).
 * 6. tRPC middleware/procedures can now safely check `ctx.user` for role-based access.
 */
import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../database/schema";
import { authSession } from "../auth/authUtil";

/**
 * Type definition for the context passed to all tRPC resolvers.
 */
export type TrpcContext = {
  req: CreateExpressContextOptions["req"];  // Native Express Request
  res: CreateExpressContextOptions["res"];  // Native Express Response
  user: User | null;                        // Authenticated database user (or null if guest)
};

/**
 * Creates the tRPC context for each incoming request.
 * 
 * @param opts - Express context options containing req and res
 * @returns Promise resolving to TrpcContext
 */
export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  try {
    // STEP 1: Attempt to verify JWT token from cookie or Authorization header
    user = await authSession.authenticateRequest(opts.req);
  } catch (error) {
    // STEP 2: Authentication is optional for public procedures (e.g., login, registration)
    // Protected procedures will explicitly check and throw UNAUTHORIZED if user === null.
    user = null;
  }

  // STEP 3: Return context accessible by all tRPC procedures via `ctx`
  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
