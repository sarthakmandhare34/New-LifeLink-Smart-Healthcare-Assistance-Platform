import { COOKIE_NAME } from "@shared/const";
import { z } from "zod";
import { createPatientAssessment, createPatientEvent, getPatientAssessments } from "./db";
import { analyzeAssessmentWithGemini, assessmentRequestInput } from "./ai/assessmentService";
import { getSessionCookieOptions } from "./_core/cookies";
import { getProviderAvailability } from "./auth/providerAuth";
import { doctorAuthRouter } from "./auth/doctorAuth";
import { doctorWorkspaceRouter } from "./routers/doctor";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import {
  patientAppointmentRouter,
  patientAuthRouter,
  patientDashboardRouter,
  patientDiscoveryRouter,
  patientMedicineRouter,
  patientPrescriptionRouter,
  patientProfileRouter,
} from "./routers/patient";

export { assessmentRequestInput } from "./ai/assessmentService";

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.patientUser ?? (opts.ctx.user?.role !== "doctor" ? opts.ctx.user : null)),
    providers: publicProcedure.query(() => getProviderAvailability()),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      const { maxAge: _, ...clearOptions } = cookieOptions as any;
      ctx.res.clearCookie(COOKIE_NAME, clearOptions);
      return {
        success: true,
      } as const;
    }),
  }),
  patientAuth: patientAuthRouter,
  doctorAuth: doctorAuthRouter,
  doctorWorkspace: doctorWorkspaceRouter,
  patientProfile: patientProfileRouter,
  patientDashboard: patientDashboardRouter,
  patientMedicine: patientMedicineRouter,
  patientAppointment: patientAppointmentRouter,
  patientPrescription: patientPrescriptionRouter,
  patientDiscovery: patientDiscoveryRouter,
  assessment: router({
    list: protectedProcedure.query(({ ctx }) => getPatientAssessments(ctx.user.id)),
    analyze: protectedProcedure.input(assessmentRequestInput).mutation(async ({ ctx, input }) => {
      const result = await analyzeAssessmentWithGemini(input);
      const id = await createPatientAssessment({
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
      await createPatientEvent(ctx.user.id, "ASSESSMENT_COMPLETED", String(id));
      return { id, createdAt: new Date(), ...input, ...result };
    }),
  }),
});

export type AppRouter = typeof appRouter;
