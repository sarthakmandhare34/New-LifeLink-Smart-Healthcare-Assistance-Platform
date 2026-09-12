import { TRPCError } from "@trpc/server";                                                  // Standard tRPC error throwing utility
import { z } from "zod";                                                                   // Input schema validation library
import { 
  createDoctorAuthorizedPrescription, 
  createPatientEvent, 
  createDoctorEvent, 
  getDoctorAuthorizedPatientDetail, 
  getDoctorAuthorizedPrescriptionDetail, 
  listDoctorAppointments, 
  listDoctorAuthorizedAssessments, 
  listDoctorPrescriptions, 
  updateDoctorAppointmentStatus 
} from "../db";                                                                            // Database CRUD operations for doctor queries
import { doctorProcedure, router } from "../_core/trpc";                                   // Doctor-authenticated procedure and router constructors
import { doctorIdFromSyntheticOpenId, doctorDisplayName, getSyntheticDoctor } from "../syntheticDoctor"; // Clinician lookup and formatting helpers

// Resolves and authorizes the doctor profile from the session OpenID
function currentDoctor(openId: string) {
  const doctorId = doctorIdFromSyntheticOpenId(openId);                                    // Extract doctor ID from synthetic openId
  const doctor = doctorId ? getSyntheticDoctor(doctorId) : null;                           // Fetch doctor metadata
  if (!doctor) {
    throw new TRPCError({ code: "FORBIDDEN", message: "This synthetic doctor session is not authorized." }); // Reject if doctor not found
  }
  return doctor;                                                                           // Return authorized doctor profile
}

// Transforms a raw database appointment record into a clean UI presentation view
function appointmentView(appointment: Awaited<ReturnType<typeof listDoctorAppointments>>[number]) {
  return {
    id: appointment.id,                                                                    // Appointment sequence ID
    scheduledAt: appointment.scheduledAt,                                                  // Scheduled consultation date & time
    status: appointment.status,                                                            // Current status (Requested, Confirmed, etc.)
    reason: appointment.reason || "No booking reason was provided.",                       // Reason for clinical visit
    createdAt: appointment.createdAt,                                                      // Booking timestamp
    patient: { id: appointment.patientId, name: appointment.patientName || "LifeLink patient" }, // Patient name and ID
  };
}

// Clinician workspace router handling appointments, prescriptions, and patient management
export const doctorWorkspaceRouter = router({
  // Returns currently signed-in doctor's clinical profile
  profile: doctorProcedure.query(({ ctx }) => {
    const doctor = currentDoctor(ctx.user.openId);                                         // Validate doctor session
    return {
      id: doctor.id,                                                                       // Unique doctor ID
      displayName: doctorDisplayName(doctor),                                              // Formatted doctor name and title
      specialty: doctor.specialty,                                                         // Medical discipline
      locality: doctor.locality,                                                           // Clinic station locality
      railLine: doctor.railLine,                                                           // Rail transit corridor
      isSynthetic: true as const,                                                          // Platform-controlled indicator
    };
  }),

  // Returns clinical dashboard metrics: completed appointments, upcoming visits, active patients, and recent symptom assessments
  dashboard: doctorProcedure.query(async ({ ctx }) => {
    const doctor = currentDoctor(ctx.user.openId);                                         // Authenticate clinician
    const appointments = await listDoctorAppointments(doctor.id);                          // Fetch all appointments
    const now = Date.now();                                                                // Current timestamp
    const patients = new Set(appointments.map((appointment) => appointment.patientId));   // Unique patient count
    const recentAssessments = await listDoctorAuthorizedAssessments(doctor.id, 5);         // Recent assessments relevant to specialty

    const upcomingAppointments = appointments.filter(
      (appointment) =>
        appointment.scheduledAt.getTime() >= now &&
        ["Requested", "Pending", "Confirmed"].includes(appointment.status)                 // Active future bookings
    );

    return {
      appointmentCount: appointments.filter((appointment) => appointment.status === "Completed").length, // Total completed visits
      pendingCount: appointments.filter((appointment) => appointment.status === "Requested" || appointment.status === "Pending").length, // Pending requests
      upcomingCount: upcomingAppointments.length,                                          // Future scheduled visits
      patientCount: patients.size,                                                         // Number of distinct patients
      assessmentCount: recentAssessments.length,                                           // Count of recent assessments
      recentAssessments,                                                                   // List of recent triage assessments
      appointments: appointments.slice(0, 5).map(appointmentView),                        // Top 5 upcoming appointments
    };
  }),

  // Doctor appointment management procedures
  appointments: router({
    list: doctorProcedure.query(async ({ ctx }) => {
      const doctor = currentDoctor(ctx.user.openId);                                       // Verify doctor
      return (await listDoctorAppointments(doctor.id)).map(appointmentView);               // Return formatted appointment list
    }),
    updateStatus: doctorProcedure
      .input(z.object({ id: z.number().int().positive(), status: z.enum(["Confirmed", "Cancelled", "Completed"]) })) // Valid status transitions
      .mutation(async ({ ctx, input }) => {
        const doctor = currentDoctor(ctx.user.openId);                                     // Authenticate clinician
        const updated = await updateDoctorAppointmentStatus(doctor.id, input.id, input.status); // Update status in database
        if (!updated) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Appointment was not found or the requested status transition is not allowed." });
        }
        await createPatientEvent(updated.userId, "APPOINTMENT_UPDATED", String(input.id));  // Notify patient via SSE
        await createDoctorEvent(doctor.id, updated.userId, "APPOINTMENT_UPDATED", String(input.id)); // Notify clinician via SSE
        return { success: true } as const;
      }),
  }),

  // Returns unique patients who have scheduled appointments with this doctor
  patients: doctorProcedure.query(async ({ ctx }) => {
    const doctor = currentDoctor(ctx.user.openId);                                         // Validate doctor
    const appointments = await listDoctorAppointments(doctor.id);                          // Get doctor's appointments
    return Array.from(
      new Map(appointments.map((appointment) => [appointment.patientId, { id: appointment.patientId, name: appointment.patientName || "LifeLink patient" }])).values(), // Deduplicate patients
    );
  }),

  // Returns detailed medical profile for an assigned patient
  patientDetail: doctorProcedure
    .input(z.object({ patientId: z.number().int().positive() }))                           // Patient user ID
    .query(async ({ ctx, input }) => {
      const doctor = currentDoctor(ctx.user.openId);                                       // Validate doctor
      const detail = await getDoctorAuthorizedPatientDetail(doctor.id, input.patientId);   // Fetch patient profile if assigned
      if (!detail) throw new TRPCError({ code: "FORBIDDEN", message: "This patient is not assigned to the signed clinician account." });
      return detail;                                                                       // Return profile and medical history
    }),

  // Doctor prescription management procedures
  prescriptions: router({
    list: doctorProcedure.query(async ({ ctx }) => {
      const doctor = currentDoctor(ctx.user.openId);                                       // Validate doctor
      return listDoctorPrescriptions(doctor.id);                                           // List all prescriptions issued by this doctor
    }),
    getById: doctorProcedure
      .input(z.object({ id: z.number().int().positive() }))                                // Prescription ID
      .query(async ({ ctx, input }) => {
        const doctor = currentDoctor(ctx.user.openId);                                     // Validate doctor
        const detail = await getDoctorAuthorizedPrescriptionDetail(doctor.id, input.id);   // Fetch prescription detail
        if (!detail) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Prescription record not found." });
        }
        return detail;                                                                     // Return prescription with items
      }),
    create: doctorProcedure
      .input(z.object({
        patientId: z.number().int().positive(),                                            // Target patient user ID
        clinicalNotes: z.string().trim().max(4000).optional(),                             // Optional clinician notes
        items: z.array(z.object({                                                          // Prescribed medication items
          name: z.string().trim().min(1).max(200), 
          dosage: z.string().trim().min(1).max(120), 
          instructions: z.string().trim().min(1).max(2000) 
        })).min(1).max(20),
      }))
      .mutation(async ({ ctx, input }) => {
        const doctor = currentDoctor(ctx.user.openId);                                     // Authenticate doctor
        const prescriptionId = await createDoctorAuthorizedPrescription({                  // Create prescription record in MySQL
          doctorId: doctor.id, 
          patientUserId: input.patientId, 
          clinicalNotes: input.clinicalNotes || null, 
          items: input.items 
        });
        if (!prescriptionId) throw new TRPCError({ code: "FORBIDDEN", message: "A confirmed appointment assigned to this doctor is required before a prescription can be created." });
        await createPatientEvent(input.patientId, "PRESCRIPTION_CREATED", String(prescriptionId)); // Send real-time SSE event to patient
        return { id: prescriptionId, status: "UNSIGNED / CONTROLLED WORKSPACE" as const }; // Return issued prescription ID
      }),
  }),
});
