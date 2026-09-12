import { COOKIE_NAME } from "@shared/const";                                             // Patient session cookie constant name
import { z } from "zod";                                                                   // Input validation schema builder
import { createPatientAssessment, createPatientEvent, getPatientAssessments } from "./db"; // Database queries for symptom records and event dispatch
import { analyzeAssessmentWithGemini, assessmentRequestInput } from "./ai/assessmentService"; // Gemini AI triage engine and schema
import { getSessionCookieOptions } from "./_core/cookies";                                // Secure cookie attribute helper
import { getProviderAvailability } from "./auth/providerAuth";                             // Google OAuth availability detector
import { doctorAuthRouter } from "./auth/doctorAuth";                                      // Doctor authentication routes
import { doctorWorkspaceRouter } from "./routers/doctor";                                  // Doctor clinical workspace endpoints
import { systemRouter } from "./_core/systemRouter";                                       // System liveness and healthcheck routes
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";              // Foundation tRPC constructors
import {
  patientAppointmentRouter,
  patientAuthRouter,
  patientDashboardRouter,
  patientDiscoveryRouter,
  patientMedicineRouter,
  patientPrescriptionRouter,
  patientProfileRouter,
} from "./routers/patient";                                                                // Specialized patient domain routers

export { assessmentRequestInput } from "./ai/assessmentService";                           // Re-export input schema for frontend types

// Root tRPC application router combining all sub-routers under a unified typed API
export const appRouter = router({
  system: systemRouter,                                                                    // Healthchecks and system telemetry
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.patientUser ?? (opts.ctx.user?.role !== "doctor" ? opts.ctx.user : null)), // Returns current logged-in user profile
    providers: publicProcedure.query(() => getProviderAvailability()),                      // Returns OAuth provider statuses (e.g. Google)
    logout: publicProcedure.mutation(({ ctx }) => {                                        // Clears patient session cookie
      const cookieOptions = getSessionCookieOptions(ctx.req);                              // Get cookie configuration
      const { maxAge: _, ...clearOptions } = cookieOptions as any;                         // Strip maxAge for cookie deletion
      ctx.res.clearCookie(COOKIE_NAME, clearOptions);                                      // Instruct browser to delete cookie
      return {
        success: true,
      } as const;
    }),
  }),
  patientAuth: patientAuthRouter,                                                          // Patient registration and email/password login
  doctorAuth: doctorAuthRouter,                                                            // Clinician login and credential management
  doctorWorkspace: doctorWorkspaceRouter,                                                  // Clinician appointment and prescription management
  patientProfile: patientProfileRouter,                                                    // Patient medical profile and emergency contacts
  patientDashboard: patientDashboardRouter,                                                // Patient dashboard metrics and summary stats
  patientMedicine: patientMedicineRouter,                                                  // Patient medication schedule and tracking
  patientAppointment: patientAppointmentRouter,                                            // Patient specialist booking and cancellation
  patientPrescription: patientPrescriptionRouter,                                          // Patient digital prescription viewing
  patientDiscovery: patientDiscoveryRouter,                                                // Mumbai specialist search and directory filtering
  assessment: router({
    list: protectedProcedure.query(({ ctx }) => getPatientAssessments(ctx.user.id)),       // History of patient symptom assessments
    analyze: protectedProcedure.input(assessmentRequestInput).mutation(async ({ ctx, input }) => { // Live AI symptom triage execution
      const result = await analyzeAssessmentWithGemini(input);                             // Evaluate symptoms through Gemini + safeguards
      const id = await createPatientAssessment({                                           // Persist assessment result in MySQL
        userId: ctx.user.id,
        symptoms: input.symptoms,
        age: input.age,
        gender: input.gender,
        conditions: input.conditions ?? null,
        duration: input.duration,
        urgency: result.urgency,
        reason: result.reason,
        specialty: result.specialty,
        guidance: result.guidance,
      });
      await createPatientEvent(ctx.user.id, "ASSESSMENT_COMPLETED", String(id));           // Notify patient dashboard via SSE
      return { id, createdAt: new Date(), ...input, ...result };                           // Return saved triage assessment
    }),
  }),
});

export type AppRouter = typeof appRouter;                                                  // Root router type exported for client-side type-safety
