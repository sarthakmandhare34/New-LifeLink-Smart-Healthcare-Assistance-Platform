import "dotenv/config";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { appRouter } from "../routers";
import { createContext } from "../_core/context";
import {
  createNativePatient,
  findOrCreateSyntheticDoctorUser,
  createPatientMedicine,
  createPatientAssessment,
  createPatientEmergencyContact,
  createPatientAppointment,
  createDoctorAuthorizedPrescription,
  updateDoctorAppointmentStatus,
} from "../db";
import { getMockDoctorById } from "../discovery/mockDoctorDirectory";

// We will mock the context creation manually to test router directly
function createCaller(user: any) {
  return appRouter.createCaller({
    req: {} as any,
    res: { cookie: () => {}, clearCookie: () => {} } as any,
    user,
  });
}

describe("BATCH 13: Authentication, Security, and IDOR Deep Audit", () => {
  let patientA: any;
  let patientB: any;
  let doctorA: any;
  let doctorB: any;

  let patientAMedicineId: number;
  let patientAEmergencyContactId: number;
  let patientAAppointmentId: number;
  let patientAPrescriptionId: number;

  beforeAll(async () => {
    // 1. Setup Patients
    patientA = await createNativePatient({
      name: "Patient A",
      email: `patient.a.${Date.now()}@test.com`,
      passwordHash: "dummyhash",
    });

    patientB = await createNativePatient({
      name: "Patient B",
      email: `patient.b.${Date.now()}@test.com`,
      passwordHash: "dummyhash",
    });

    // 2. Setup Doctors
    const mockDocA = getMockDoctorById("mock-central-cardiology-csmt")!;
    doctorA = await findOrCreateSyntheticDoctorUser(mockDocA);
    doctorA.role = "doctor"; // Explicitly set role for auth
    const mockDocB = getMockDoctorById("mock-harbour-pulmonology-vashi")!;
    doctorB = await findOrCreateSyntheticDoctorUser(mockDocB);
    doctorB.role = "doctor";

    // 3. Setup Resources for Patient A
    patientAMedicineId = await createPatientMedicine(patientA.id, {
      name: "Medicine A",
      dosage: "10mg",
      frequency: "Daily",
      schedule: "Morning",
      startDate: null,
      endDate: null,
      quantity: 30,
      expiry: null,
    });

    patientAEmergencyContactId = await createPatientEmergencyContact(patientA.id, {
      name: "Contact A",
      relationship: "Brother",
      phone: "+1234567890",
    });

    patientAAppointmentId = await createPatientAppointment(
      patientA.id,
      mockDocA.id,
      new Date(Date.now() + 86400000),
      "Heart checkup"
    );

    // Doctor A confirms appointment
    await updateDoctorAppointmentStatus(mockDocA.id, patientAAppointmentId, "Confirmed");

    // Doctor A creates a prescription for Patient A
    const prescriptionId = await createDoctorAuthorizedPrescription({
      doctorId: mockDocA.id,
      patientUserId: patientA.id,
      clinicalNotes: "Notes A",
      items: [{ name: "Med A", dosage: "10mg", instructions: "Take daily" }],
    });
    patientAPrescriptionId = prescriptionId!;
  });

  describe("PATIENT -> PATIENT (Cross-Tenant Boundaries)", () => {
    it("1. Patient B cannot read Patient A profile", async () => {
      const callerB = createCaller(patientB);
      // TRPC `patientProfile.get` always fetches for `ctx.user.id`, no parameter accepted.
      const profile = await callerB.patientProfile.get();
      expect(profile?.id).not.toBe(patientA.id);
      expect(profile?.id).toBe(patientB.id);
    });

    it("2. Patient B cannot read Patient A emergency contacts", async () => {
      const callerB = createCaller(patientB);
      const contacts = await callerB.patientProfile.get();
      expect(contacts?.emergencyContacts).toHaveLength(0); // B has 0
    });

    it("3. Patient B cannot read Patient A medicines", async () => {
      const callerB = createCaller(patientB);
      const meds = await callerB.patientMedicine.list();
      expect(meds).toHaveLength(0); // B has 0
    });

    it("4. Patient B cannot read Patient A assessments", async () => {
      const callerB = createCaller(patientB);
      const assessments = await callerB.assessment.list();
      expect(assessments).toHaveLength(0); // B has 0
    });

    it("5. Patient B cannot read Patient A appointments", async () => {
      const callerB = createCaller(patientB);
      const appointments = await callerB.patientAppointment.list();
      expect(appointments).toHaveLength(0); // B has 0
    });

    it("6. Patient B cannot read Patient A prescriptions", async () => {
      const callerB = createCaller(patientB);
      const prescriptions = await callerB.patientPrescription.list();
      expect(prescriptions).toHaveLength(0); // B has 0

      // Try specific ID
      await expect(
        callerB.patientPrescription.getById({ id: patientAPrescriptionId })
      ).rejects.toThrow(/Prescription record not found/);
    });

    it("7. Patient B cannot modify Patient A resource", async () => {
      const callerB = createCaller(patientB);
      await expect(
        callerB.patientMedicine.update({
          id: patientAMedicineId,
          values: { name: "Hacked" },
        })
      ).rejects.toThrow(/Medicine record not found/);

      await expect(
        callerB.patientProfile.emergencyContacts.update({
          id: patientAEmergencyContactId,
          values: { name: "Hacked", relationship: "Hacked", phone: "+000000000" },
        })
      ).rejects.toThrow(/Emergency contact not found/);
    });

    it("8. Patient B cannot delete Patient A resource", async () => {
      const callerB = createCaller(patientB);
      await expect(
        callerB.patientMedicine.remove({ id: patientAMedicineId })
      ).rejects.toThrow(/Medicine record not found/);

      await expect(
        callerB.patientAppointment.cancel({ id: patientAAppointmentId })
      ).rejects.toThrow(/Appointment record not found/);
    });
  });

  describe("DOCTOR -> DOCTOR (Cross-Tenant Boundaries)", () => {
    it("10. Doctor B cannot read Doctor A prescriptions", async () => {
      const callerB = createCaller(doctorB);
      const prescriptions = await callerB.doctorWorkspace.prescriptions.list();
      expect(prescriptions).toHaveLength(0);

      await expect(
        callerB.doctorWorkspace.prescriptions.getById({ id: patientAPrescriptionId })
      ).rejects.toThrow(/Prescription record not found/);
    });

    it("11. Doctor B cannot access Doctor A patient data", async () => {
      const callerB = createCaller(doctorB);
      const patients = await callerB.doctorWorkspace.patients();
      expect(patients).toHaveLength(0);

      await expect(
        callerB.doctorWorkspace.patientDetail({ patientId: patientA.id })
      ).rejects.toThrow(/not assigned to the signed clinician account/);
    });

    it("12. Doctor B cannot modify Doctor A appointment data", async () => {
      const callerB = createCaller(doctorB);
      await expect(
        callerB.doctorWorkspace.appointments.updateStatus({
          id: patientAAppointmentId,
          status: "Completed",
        })
      ).rejects.toThrow(/NOT_FOUND|appointment was not found/i);
    });
  });

  describe("DOCTOR -> UNRELATED PATIENT (Authorization Boundaries)", () => {
    it("13. Doctor A cannot access Patient B (Unrelated)", async () => {
      const callerA = createCaller(doctorA);
      await expect(
        callerA.doctorWorkspace.patientDetail({ patientId: patientB.id })
      ).rejects.toThrow(/not assigned to the signed clinician account/);
    });

    it("14. Doctor A cannot create a prescription for Patient B (Unrelated)", async () => {
      const callerA = createCaller(doctorA);
      await expect(
        callerA.doctorWorkspace.prescriptions.create({
          patientId: patientB.id,
          items: [{ name: "Med", dosage: "10mg", instructions: "Take daily" }],
        })
      ).rejects.toThrow(/FORBIDDEN|appointment assigned to this doctor is required/i);
    });
  });

  describe("UNAUTHENTICATED (Role Boundaries)", () => {
    it("16. Unauthenticated access is rejected for Patient endpoints", async () => {
      const unauthCaller = createCaller(null);
      await expect(unauthCaller.patientProfile.get()).rejects.toThrow(/Please login|UNAUTHORIZED/);
    });

    it("17. Unauthenticated access is rejected for Doctor endpoints", async () => {
      const unauthCaller = createCaller(null);
      await expect(unauthCaller.doctorWorkspace.dashboard()).rejects.toThrow(/Please login|UNAUTHORIZED|synthetic doctor session is required/i);
    });
  });
});
