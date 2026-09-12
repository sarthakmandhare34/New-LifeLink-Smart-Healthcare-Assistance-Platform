import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from '@shared/const';                    // Standard error messages for forbidden and unauthorized responses
import { initTRPC, TRPCError } from "@trpc/server";                                        // Core tRPC initialization and typed error constructors
import superjson from "superjson";                                                         // Serializer/deserializer preserving Dates, Maps, Sets over JSON
import type { TrpcContext } from "./context";                                              // Context type containing Express req, res, and authenticated user

// Initialize tRPC instance bound to our typed request context
const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,                                                                  // Use superjson so client/server can exchange native Date objects seamlessly
});

// Export foundational tRPC router builder and open public procedure constructor
export const router = t.router;                                                            // Function to create tRPC router branches
export const publicProcedure = t.procedure;                                                // Procedure that any caller can invoke without signing in

// Middleware that ensures the request belongs to an authenticated user (patient, doctor, or admin)
const requireUser = t.middleware(async opts => {
  const { ctx, next } = opts;                                                              // Extract request context and the next pipeline step
  const user = ctx.patientUser || (ctx.user?.role !== "doctor" ? ctx.user : ctx.user);     // Prioritize patientUser or general user identity

  if (!user) {                                                                             // If no user found in cookie/token
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });              // Reject with 401 Unauthorized status
  }

  return next({                                                                            // Continue to next middleware or route handler
    ctx: {
      ...ctx,                                                                              // Preserve existing context
      user,                                                                                // Guaranteed non-null authenticated user object
    },
  });
});

// Protected procedure: requires a valid logged-in session (patient or general user)
export const protectedProcedure = t.procedure.use(requireUser);

// Doctor-only procedure: strictly requires a doctor session with role === 'doctor'
export const doctorProcedure = t.procedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;                                                            // Unpack request context and next handler
    const user = ctx.doctorUser || (ctx.user?.role === "doctor" ? ctx.user : null);        // Locate active clinician session

    if (!user || user.role !== "doctor") {                                                 // Reject if not logged in or role is not clinician
      throw new TRPCError({ code: "FORBIDDEN", message: "A synthetic doctor session is required." }); // Return 403 Forbidden
    }

    return next({ ctx: { ...ctx, user } });                                                // Pass clinician user down to the handler
  }),
);

// Admin-only procedure: strictly requires role === 'admin'
export const adminProcedure = t.procedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;                                                            // Unpack context and next handler

    if (!ctx.user || ctx.user.role !== 'admin') {                                          // Check if user exists and is an admin
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });              // Reject non-admin access with 403 Forbidden
    }

    return next({                                                                          // Continue execution for verified admins
      ctx: {
        ...ctx,
        user: ctx.user,                                                                    // Verified admin user profile
      },
    });
  }),
);
