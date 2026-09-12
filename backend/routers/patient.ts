/**
 * ============================================================================
 * LIFELINK BACKEND: PATIENT tRPC ROUTER (backend/routers/patient.ts)
 * ============================================================================
 * 
 * WHAT THIS FILE DOES:
 * This module defines all patient-facing tRPC API procedures.
 * It provides secure, strongly-typed endpoints for:
 * 1. Authentication: Native email/password registration and login with cookie issuance.
 * 2. Profile Management: Emergency contacts, blood group, allergies, conditions.
 * 3. Dashboard Summary: Real-time aggregated stats (prescriptions, medicines, upcoming appointments).
 * 4. Medicine Cabinet: CRUD tracking of patient medications and dosage schedules.
 * 5. Appointments: Booking consultations with controlled Mumbai specialists.
 * 6. Prescriptions: Viewing digital prescriptions issued by authorized doctors.
 * 7. Mumbai Specialist Discovery: Filtering doctors across Central, Harbour, and Western railway lines.
 * 
 * SECURITY PATTERNS:
 * - `publicProcedure`: Unauthenticated routes for registration and login.
 * - `protectedProcedure`: Enforces valid user session (ctx.user), preventing IDOR attacks.
 * - `Zod`: Strict schema validation on all inputs before reaching DB query logic.
 */
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  cancelOwnedPatientAppointment,
  createPatientAppointment,
  createDoctorEvent,
  createPatientEmergencyContact,
  createNativePatient,
  createPatientMedicine,
  createPatientEvent,
  getNativePatientByEmail,
  getPatientDashboard,
  getPatientProfile,
  listPatientAppointments,
  getOwnedPatientPrescription,
  listPatientMedicines,
  listPatientPrescriptions,
  removeOwnedPatientMedicine,
  updateOwnedPatientMedicine,
  removeOwnedPatientEmergencyContact,
  updateOwnedPatientEmergencyContact,
  updatePatientProfile,
} from "../db";
import { filterMockDoctorDirectory, getMockDoctorById, getMockDoctorDirectoryFacets } from "../discovery/mockDoctorDirectory";
import { hashPatientPassword, verifyPatientPassword } from "../auth/nativePatientAuth";
import { getSessionCookieOptions } from "../_core/cookies";
import { authSession } from "../auth/authUtil";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { COOKIE_NAME, ONE_YEAR_MS } from "../../shared/const";

/** Zod input schema for patient registration */
const registrationInput = z.object({
  name: z.string().trim().min(2).max(160),                                                 // Full patient name
  email: z.string().trim().email().max(320),                                               // Unique valid email address
  password: z.string().min(8).max(128),                                                    // Password with minimum 8 characters
});

// Zod schema for patient email/password login
const loginInput = z.object({
  email: z.string().trim().min(1).max(320),                                                // Registered patient email
  password: z.string().min(1).max(128),                                                    // Account password
});

// Zod schema for editing patient health passport / profile details
const profileInput = z.object({
  name: z.string().trim().min(2).max(160).optional(),                                      // Optional name change
  bloodGroup: z.string().trim().max(12).optional(),                                        // Blood group (e.g. "O+", "B-")
  phone: z.string().trim().max(32).optional(),                                             // Contact phone number
  allergies: z.array(z.string().trim().min(1).max(160)).max(50).optional(),               // Known drug/environmental allergies
  conditions: z.array(z.string().trim().min(1).max(160)).max(50).optional(),              // Pre-existing medical conditions
});

// Phone number regex validation for emergency contacts
const emergencyContactPhone = z
  .string()
  .trim()
  .min(7, "Enter a valid contact number.")
  .max(32)
  .regex(/^\+?[0-9][0-9\s().-]*$/, "Enter a valid contact number.");                      // Validates international and local phone numbers

// Zod schema for creating or updating emergency contacts
export const emergencyContactInput = z.object({
  name: z.string().trim().min(2).max(160),                                                 // Contact person's name
  relationship: z.string().trim().min(2).max(80),                                          // Kinship/relationship (e.g. "Spouse", "Parent")
  phone: emergencyContactPhone,                                                            // Validated emergency telephone number
});

// Normalizes email string for uniform database matching
function normalizedEmail(email: string) {
  return email.trim().toLowerCase();                                                       // Lowercase and trim
}

// Signs JWT token and sets secure HTTP-only patient session cookie
async function establishNativeSession(
  ctx: { req: Parameters<typeof getSessionCookieOptions>[0]; res: { cookie: (name: string, value: string, options: Record<string, unknown>) => void } },
  user: { openId: string; name: string | null }
) {
  const token = await authSession.createSessionToken(user.openId, {                        // Generate signed JWT
    name: user.name || "LifeLink Patient",
    expiresInMs: ONE_YEAR_MS,                                                              // 1-year expiration
  });
  ctx.res.cookie(COOKIE_NAME, token, {                                                     // Inject session cookie into response
    ...getSessionCookieOptions(ctx.req),
    maxAge: ONE_YEAR_MS,
  });
}

// Patient authentication router (registration and login)
export const patientAuthRouter = router({
  register: publicProcedure.input(registrationInput).mutation(async ({ ctx, input }) => {
    const email = normalizedEmail(input.email);                                            // Normalize email address
    const passwordHash = await hashPatientPassword(input.password);                         // Hash password using memory-hard scrypt
    const user = await createNativePatient({ name: input.name, email, passwordHash });      // Insert patient into MySQL
    if (!user) {
      throw new TRPCError({ code: "CONFLICT", message: "An account with this email already exists." }); // Prevent duplicate emails
    }
    await establishNativeSession(ctx, user);                                               // Sign in newly registered patient
    return { id: user.id, name: user.name ?? "", email: user.email ?? "" };                // Return patient summary
  }),

  login: publicProcedure.input(loginInput).mutation(async ({ ctx, input }) => {
    const record = await getNativePatientByEmail(normalizedEmail(input.email));            // Fetch patient from MySQL
    const isValid = record ? await verifyPatientPassword(input.password, record.credential.passwordHash) : false; // Constant-time password check
    if (!record || !isValid || record.user.loginMethod !== "native-patient") {
      throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid email or password." }); // Authentication failure
    }
    await establishNativeSession(ctx, record.user);                                        // Issue session cookie
    return { id: record.user.id, name: record.user.name ?? "", email: record.user.email ?? "" }; // Return authenticated patient
  }),
});

// Patient profile and health passport router
export const patientProfileRouter = router({
  get: protectedProcedure.query(({ ctx }) => getPatientProfile(ctx.user.id)),              // Query complete patient medical profile
  update: protectedProcedure.input(profileInput).mutation(async ({ ctx, input }) => {
    const profile = await updatePatientProfile(ctx.user.id, input);                         // Update blood group, allergies, conditions
    await createPatientEvent(ctx.user.id, "PROFILE_UPDATED", String(ctx.user.id));         // Broadcast SSE update event
    return profile;
  }),
  emergencyContacts: router({
    create: protectedProcedure.input(emergencyContactInput).mutation(async ({ ctx, input }) => {
      const id = await createPatientEmergencyContact(ctx.user.id, input);                  // Insert emergency contact in DB
      await createPatientEvent(ctx.user.id, "PROFILE_UPDATED", String(id));                // Broadcast SSE event
      return { id };
    }),
    update: protectedProcedure
      .input(z.object({ id: z.number().int().positive(), values: emergencyContactInput }))
      .mutation(async ({ ctx, input }) => {
        const updated = await updateOwnedPatientEmergencyContact(ctx.user.id, input.id, input.values); // Update contact
        if (!updated) throw new TRPCError({ code: "NOT_FOUND", message: "Emergency contact not found." });
        await createPatientEvent(ctx.user.id, "PROFILE_UPDATED", String(input.id));        // Trigger SSE update
        return { success: true } as const;
      }),
    remove: protectedProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        const removed = await removeOwnedPatientEmergencyContact(ctx.user.id, input.id);    // Delete contact
        if (!removed) throw new TRPCError({ code: "NOT_FOUND", message: "Emergency contact not found." });
        await createPatientEvent(ctx.user.id, "PROFILE_UPDATED", String(input.id));        // Trigger SSE update
        return { success: true } as const;
      }),
  }),
});

// Patient dashboard summary metrics router
export const patientDashboardRouter = router({
  summary: protectedProcedure.query(({ ctx }) => getPatientDashboard(ctx.user.id)),       // Aggregates upcoming appointments, medicines, and stats
});

// Zod schema for medicine entries
const medicineInput = z.object({
  name: z.string().trim().min(1).max(200),                                                 // Drug/medication brand or generic name
  dosage: z.string().trim().min(1).max(120),                                               // Dosage amount (e.g. "500 mg")
  frequency: z.string().trim().min(1).max(120),                                             // Frequency (e.g. "Twice daily")
  schedule: z.string().trim().min(1).max(120),                                              // Schedule timing (e.g. "After meals")
  startDate: z.string().trim().max(10).optional(),                                         // Regimen start date
  endDate: z.string().trim().max(10).optional(),                                           // Regimen completion date
  quantity: z.number().int().min(0).max(1_000_000).optional(),                             // Current pill/unit quantity in cabinet
  expiry: z.string().trim().max(10).optional(),                                            // Expiration date
});

// Medicine cabinet router for tracking prescription medications
export const patientMedicineRouter = router({
  list: protectedProcedure.query(({ ctx }) => listPatientMedicines(ctx.user.id)),          // List all active medicines
  create: protectedProcedure.input(medicineInput).mutation(async ({ ctx, input }) => {
    const id = await createPatientMedicine(ctx.user.id, {                                  // Save medicine in MySQL
      ...input,
      startDate: input.startDate ?? null,
      endDate: input.endDate ?? null,
      quantity: input.quantity ?? null,
      expiry: input.expiry ?? null,
    });
    await createPatientEvent(ctx.user.id, "MEDICINE_UPDATED", String(id));                 // Trigger SSE event
    return { id };
  }),
  update: protectedProcedure
    .input(z.object({ id: z.number().int().positive(), values: medicineInput.partial() }))
    .mutation(async ({ ctx, input }) => {
      const updated = await updateOwnedPatientMedicine(ctx.user.id, input.id, input.values); // Update medicine record
      if (!updated) throw new TRPCError({ code: "NOT_FOUND", message: "Medicine record not found." });
      await createPatientEvent(ctx.user.id, "MEDICINE_UPDATED", String(input.id));         // Trigger SSE event
      return { success: true } as const;
    }),
  remove: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
    const removed = await removeOwnedPatientMedicine(ctx.user.id, input.id);                // Delete medicine
    if (!removed) throw new TRPCError({ code: "NOT_FOUND", message: "Medicine record not found." });
    await createPatientEvent(ctx.user.id, "MEDICINE_UPDATED", String(input.id));           // Trigger SSE event
    return { success: true } as const;
  }),
});

// Zod schema for appointment booking
const appointmentInput = z.object({
  doctorId: z.string().trim().min(1).max(80),                                              // Targeted specialist ID
  scheduledAt: z.coerce.date(),                                                            // Selected date and time
  reason: z.string().trim().min(3).max(1000),                                              // Reason for booking visit
});

// Patient appointment booking and scheduling router
export const patientAppointmentRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const appointments = await listPatientAppointments(ctx.user.id);                        // Fetch patient's appointments
    return appointments.map((appointment) => ({                                            // Attach specialist directory metadata
      ...appointment,
      doctor: getMockDoctorById(appointment.doctorId),
    }));
  }),
  request: protectedProcedure.input(appointmentInput).mutation(async ({ ctx, input }) => {
    const doctor = getMockDoctorById(input.doctorId);                                      // Find targeted doctor
    if (!doctor) throw new TRPCError({ code: "NOT_FOUND", message: "Selected controlled specialist was not found." });
    if (input.scheduledAt.getTime() <= Date.now()) {                                       // Enforce booking in the future
      throw new TRPCError({ code: "BAD_REQUEST", message: "Appointment time must be in the future." });
    }
    const id = await createPatientAppointment(ctx.user.id, doctor.id, input.scheduledAt, input.reason); // Save appointment in DB
    await createPatientEvent(ctx.user.id, "APPOINTMENT_UPDATED", String(id));              // Notify patient via SSE
    await createDoctorEvent(doctor.id, ctx.user.id, "APPOINTMENT_UPDATED", String(id));    // Notify clinician via SSE
    return { id, status: "Requested" as const };
  }),
  cancel: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
    const cancelled = await cancelOwnedPatientAppointment(ctx.user.id, input.id);           // Cancel appointment in DB
    if (!cancelled) throw new TRPCError({ code: "NOT_FOUND", message: "Appointment record not found." });
    await createPatientEvent(ctx.user.id, "APPOINTMENT_UPDATED", String(input.id));        // Notify patient
    await createDoctorEvent(cancelled.doctorId, ctx.user.id, "APPOINTMENT_UPDATED", String(input.id)); // Notify doctor
    return { success: true } as const;
  }),
});

// Patient digital prescriptions router
export const patientPrescriptionRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const prescriptions = await listPatientPrescriptions(ctx.user.id);                      // Fetch patient's prescriptions
    return prescriptions.map((prescription) => ({                                         // Enrich with doctor information
      ...prescription,
      doctor: getMockDoctorById(prescription.doctorId),
    }));
  }),
  getById: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const prescription = await getOwnedPatientPrescription(ctx.user.id, input.id);       // Fetch prescription with item list
      if (!prescription) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Prescription record not found." });
      }
      return {
        ...prescription,
        doctor: getMockDoctorById(prescription.doctorId),                                  // Enrich with doctor details
      };
    }),
});

// Zod schema for doctor directory search filters
const discoveryInput = z.object({
  city: z.literal("Mumbai").optional(),                                                    // Filter by city
  specialty: z.string().trim().min(1).max(160).optional(),                                 // Filter by medical specialty
  railLine: z.enum(["Central", "Harbour", "Western"]).optional(),                          // Filter by Mumbai rail line
  station: z.string().trim().min(1).max(160).optional(),                                  // Filter by transit station
  locality: z.string().trim().min(1).max(160).optional(),                                  // Filter by neighborhood
  query: z.string().trim().min(1).max(160).optional(),                                     // Keyword search
}).optional();

// Mumbai specialist directory and discovery search router
export const patientDiscoveryRouter = router({
  facets: protectedProcedure.query(() => getMockDoctorDirectoryFacets()),                  // Retrieve available specialties, lines, and stations
  list: protectedProcedure.input(discoveryInput).query(({ input }) => filterMockDoctorDirectory(input)), // Execute filtered doctor search
});
