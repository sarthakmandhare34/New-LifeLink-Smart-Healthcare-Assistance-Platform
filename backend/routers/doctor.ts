import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createDoctorAuthorizedPrescription, createPatientEvent, createDoctorEvent, getDoctorAuthorizedPatientDetail, getDoctorAuthorizedPrescriptionDetail, listDoctorAppointments, listDoctorAuthorizedAssessments, listDoctorPrescriptions, updateDoctorAppointmentStatus } from "../db";
import { doctorProcedure, router } from "../_core/trpc";
import { doctorIdFromSyntheticOpenId, doctorDisplayName, getSyntheticDoctor } from "../syntheticDoctor";

function currentDoctor(openId: string) {
  const doctorId = doctorIdFromSyntheticOpenId(openId);
  const doctor = doctorId ? getSyntheticDoctor(doctorId) : null;
  if (!doctor) {
    throw new TRPCError({ code: "FORBIDDEN", message: "This synthetic doctor session is not authorized." });
  }
  return doctor;
}

function appointmentView(appointment: Awaited<ReturnType<typeof listDoctorAppointments>>[number]) {
  return {
    id: appointment.id,
    scheduledAt: appointment.scheduledAt,
    status: appointment.status,
    reason: appointment.reason || "No booking reason was provided.",
    createdAt: appointment.createdAt,
    patient: { id: appointment.patientId, name: appointment.patientName || "LifeLink patient" },
  };
}

export const doctorWorkspaceRouter = router({
  profile: doctorProcedure.query(({ ctx }) => {
    const doctor = currentDoctor(ctx.user.openId);
    return {
      id: doctor.id,
      displayName: doctorDisplayName(doctor),
      specialty: doctor.specialty,
      locality: doctor.locality,
      railLine: doctor.railLine,
      isSynthetic: true as const,
    };
  }),
  dashboard: doctorProcedure.query(async ({ ctx }) => {
    const doctor = currentDoctor(ctx.user.openId);
    const appointments = await listDoctorAppointments(doctor.id);
    const now = Date.now();
    const patients = new Set(appointments.map((appointment) => appointment.patientId));
    const recentAssessments = await listDoctorAuthorizedAssessments(doctor.id, 5);

    const upcomingAppointments = appointments.filter(
      (appointment) =>
        appointment.scheduledAt.getTime() >= now &&
        ["Requested", "Pending", "Confirmed"].includes(appointment.status)
    );

    return {
      appointmentCount: appointments.filter((appointment) => appointment.status === "Completed").length,
      pendingCount: appointments.filter((appointment) => appointment.status === "Requested" || appointment.status === "Pending").length,
      upcomingCount: upcomingAppointments.length,
      patientCount: patients.size,
      assessmentCount: recentAssessments.length,
      recentAssessments,
      appointments: appointments.slice(0, 5).map(appointmentView),
    };
  }),
  appointments: router({
    list: doctorProcedure.query(async ({ ctx }) => {
      const doctor = currentDoctor(ctx.user.openId);
      return (await listDoctorAppointments(doctor.id)).map(appointmentView);
    }),
    updateStatus: doctorProcedure
      .input(z.object({ id: z.number().int().positive(), status: z.enum(["Confirmed", "Cancelled", "Completed"]) }))
      .mutation(async ({ ctx, input }) => {
        const doctor = currentDoctor(ctx.user.openId);
        const updated = await updateDoctorAppointmentStatus(doctor.id, input.id, input.status);
        if (!updated) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Appointment was not found or the requested status transition is not allowed." });
        }
        await createPatientEvent(updated.userId, "APPOINTMENT_UPDATED", String(input.id));
        await createDoctorEvent(doctor.id, updated.userId, "APPOINTMENT_UPDATED", String(input.id));
        return { success: true } as const;
      }),
  }),
  patients: doctorProcedure.query(async ({ ctx }) => {
    const doctor = currentDoctor(ctx.user.openId);
    const appointments = await listDoctorAppointments(doctor.id);
    return Array.from(
      new Map(appointments.map((appointment) => [appointment.patientId, { id: appointment.patientId, name: appointment.patientName || "LifeLink patient" }])).values(),
    );
  }),
  patientDetail: doctorProcedure
    .input(z.object({ patientId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const doctor = currentDoctor(ctx.user.openId);
      const detail = await getDoctorAuthorizedPatientDetail(doctor.id, input.patientId);
      if (!detail) throw new TRPCError({ code: "FORBIDDEN", message: "This patient is not assigned to the signed clinician account." });
      return detail;
    }),
  prescriptions: router({
    list: doctorProcedure.query(async ({ ctx }) => {
      const doctor = currentDoctor(ctx.user.openId);
      return listDoctorPrescriptions(doctor.id);
    }),
    getById: doctorProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .query(async ({ ctx, input }) => {
        const doctor = currentDoctor(ctx.user.openId);
        const detail = await getDoctorAuthorizedPrescriptionDetail(doctor.id, input.id);
        if (!detail) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Prescription record not found." });
        }
        return detail;
      }),
    create: doctorProcedure
      .input(z.object({
        patientId: z.number().int().positive(),
        clinicalNotes: z.string().trim().max(4000).optional(),
        items: z.array(z.object({ name: z.string().trim().min(1).max(200), dosage: z.string().trim().min(1).max(120), instructions: z.string().trim().min(1).max(2000) })).min(1).max(20),
      }))
      .mutation(async ({ ctx, input }) => {
        const doctor = currentDoctor(ctx.user.openId);
        const prescriptionId = await createDoctorAuthorizedPrescription({ doctorId: doctor.id, patientUserId: input.patientId, clinicalNotes: input.clinicalNotes || null, items: input.items });
        if (!prescriptionId) throw new TRPCError({ code: "FORBIDDEN", message: "A confirmed appointment assigned to this doctor is required before a prescription can be created." });
        await createPatientEvent(input.patientId, "PRESCRIPTION_CREATED", String(prescriptionId));
        return { id: prescriptionId, status: "UNSIGNED / CONTROLLED WORKSPACE" as const };
      }),
  }),
});
