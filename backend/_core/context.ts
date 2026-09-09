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
import { COOKIE_NAME, DOCTOR_COOKIE_NAME } from "../../shared/const";

/**
 * Type definition for the context passed to all tRPC resolvers.
 */
export type TrpcContext = {
  req: CreateExpressContextOptions["req"];  // Native Express Request
  res: CreateExpressContextOptions["res"];  // Native Express Response
  user: User | null;                        // Authenticated database user (or null if guest)
  patientUser: User | null;                 // Authenticated patient session
  doctorUser: User | null;                  // Authenticated clinician session
};

/**
 * Creates the tRPC context for each incoming request.
 * Supports simultaneous clinician and patient sessions without session-cookie collision.
 * 
 * @param opts - Express context options containing req and res
 * @returns Promise resolving to TrpcContext
 */
export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let patientUser: User | null = null;
  let doctorUser: User | null = null;

  try {
    patientUser = await authSession.authenticateRequest(opts.req, COOKIE_NAME);
  } catch {
    patientUser = null;
  }

  try {
    doctorUser = await authSession.authenticateRequest(opts.req, DOCTOR_COOKIE_NAME);
  } catch {
    doctorUser = null;
  }

  // Smart resolution for ctx.user:
  // If request URL targets doctor procedures, prioritize doctorUser; otherwise prioritize patientUser.
  const reqUrl = opts.req.url || "";
  const isDoctorReq = reqUrl.includes("doctor");
  const user = isDoctorReq ? (doctorUser ?? patientUser) : (patientUser ?? doctorUser);

  return {
    req: opts.req,
    res: opts.res,
    user,
    patientUser,
    doctorUser,
  };
}
