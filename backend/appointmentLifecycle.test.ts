import { expect, test, describe, beforeAll, afterAll } from "vitest";
import { config } from "dotenv";
config();
import { getDb, upsertUser, createPatientAppointment, cancelOwnedPatientAppointment, updateDoctorAppointmentStatus } from "./db";
import { appRouter } from "./routers";
import { users, patientAppointments } from "./database/schema";
import { eq } from "drizzle-orm";
import { mockDoctorDirectory } from "./discovery/mockDoctorDirectory";

const TEST_DOCTOR_1 = mockDoctorDirectory[0];
const TEST_DOCTOR_2 = mockDoctorDirectory[1];

let db: NonNullable<Awaited<ReturnType<typeof getDb>>>;

beforeAll(async () => {
  const maybeDb = await getDb();
  if (!maybeDb) throw new Error("Database not available");
  db = maybeDb;

  await upsertUser({
    openId: "test:patient-lifecycle-1",
    name: "Lifecycle Patient 1",
    email: "lp1@example.com",
    loginMethod: "native-patient",
    role: "user",
  });
  
  await upsertUser({
    openId: "test:patient-lifecycle-2",
    name: "Lifecycle Patient 2",
    email: "lp2@example.com",
    loginMethod: "native-patient",
    role: "user",
  });

  await upsertUser({
    openId: `synthetic-doctor:${TEST_DOCTOR_1.id}`,
    name: TEST_DOCTOR_1.name,
    email: null,
    loginMethod: "synthetic-clinician",
    role: "doctor",
  });

  await upsertUser({
    openId: `synthetic-doctor:${TEST_DOCTOR_2.id}`,
    name: TEST_DOCTOR_2.name,
    email: null,
    loginMethod: "synthetic-clinician",
    role: "doctor",
  });
});

describe("Appointment Lifecycle Integration", () => {
  let patient1Id: number;
  let patient2Id: number;
  let appointmentId: number;

  beforeAll(async () => {
    const u1 = await db.select().from(users).where(eq(users.openId, "test:patient-lifecycle-1"));
    patient1Id = u1[0].id;
    const u2 = await db.select().from(users).where(eq(users.openId, "test:patient-lifecycle-2"));
    patient2Id = u2[0].id;
  });

  afterAll(async () => {
    await db.delete(patientAppointments).where(eq(patientAppointments.userId, patient1Id));
    await db.delete(patientAppointments).where(eq(patientAppointments.userId, patient2Id));
  });

  test("1. Patient creates appointment & 2. Appointment persists", async () => {
    const caller = appRouter.createCaller({ user: { id: patient1Id, openId: "test:patient-lifecycle-1", role: "user" } });
    
    const futureDate = new Date(Date.now() + 86400000); // Tomorrow
    const response = await caller.patientAppointment.request({
      doctorId: TEST_DOCTOR_1.id,
      scheduledAt: futureDate,
      reason: "Lifecycle Integration Test Reason",
    });

    expect(response.id).toBeGreaterThan(0);
    expect(response.status).toBe("Requested");
    appointmentId = response.id;
    
    // Verify persistence
    const inDb = await db.select().from(patientAppointments).where(eq(patientAppointments.id, appointmentId));
    expect(inDb.length).toBe(1);
    expect(inDb[0].userId).toBe(patient1Id);
    expect(inDb[0].doctorId).toBe(TEST_DOCTOR_1.id);
  });

  test("3. Patient sees own appointment", async () => {
    const caller = appRouter.createCaller({ user: { id: patient1Id, openId: "test:patient-lifecycle-1", role: "user" } });
    const list = await caller.patientAppointment.list();
    const appt = list.find((a) => a.id === appointmentId);
    expect(appt).toBeDefined();
    expect(appt?.reason).toBe("Lifecycle Integration Test Reason");
    expect(appt?.doctor?.id).toBe(TEST_DOCTOR_1.id);
  });

  test("4. Doctor sees assigned appointment", async () => {
    const docCaller = appRouter.createCaller({ user: { id: -1, openId: `synthetic-doctor:${TEST_DOCTOR_1.id}`, role: "doctor" } });
    const list = await docCaller.doctorWorkspace.appointments.list();
    const appt = list.find((a) => a.id === appointmentId);
    expect(appt).toBeDefined();
    expect(appt?.status).toBe("Requested");
    expect(appt?.patient.id).toBe(patient1Id);
  });

  test("5. Doctor cannot see another doctor's appointment", async () => {
    const doc2Caller = appRouter.createCaller({ user: { id: -1, openId: `synthetic-doctor:${TEST_DOCTOR_2.id}`, role: "doctor" } });
    const list = await doc2Caller.doctorWorkspace.appointments.list();
    const appt = list.find((a) => a.id === appointmentId);
    expect(appt).toBeUndefined();
  });

  test("6. Doctor accepts/updates appointment", async () => {
    const docCaller = appRouter.createCaller({ user: { id: -1, openId: `synthetic-doctor:${TEST_DOCTOR_1.id}`, role: "doctor" } });
    const result = await docCaller.doctorWorkspace.appointments.updateStatus({
      id: appointmentId,
      status: "Confirmed",
    });
    expect(result.success).toBe(true);

    const inDb = await db.select().from(patientAppointments).where(eq(patientAppointments.id, appointmentId));
    expect(inDb[0].status).toBe("Confirmed");
  });

  test("7. Patient sees updated status", async () => {
    const caller = appRouter.createCaller({ user: { id: patient1Id, openId: "test:patient-lifecycle-1", role: "user" } });
    const list = await caller.patientAppointment.list();
    const appt = list.find((a) => a.id === appointmentId);
    expect(appt?.status).toBe("Confirmed");
  });

  test("8. Patient cannot mutate another patient's appointment", async () => {
    const caller2 = appRouter.createCaller({ user: { id: patient2Id, openId: "test:patient-lifecycle-2", role: "user" } });
    await expect(caller2.patientAppointment.cancel({ id: appointmentId })).rejects.toThrow(/Appointment record not found/);
  });

  test("9. Doctor cannot mutate another doctor's appointment", async () => {
    const doc2Caller = appRouter.createCaller({ user: { id: -1, openId: `synthetic-doctor:${TEST_DOCTOR_2.id}`, role: "doctor" } });
    await expect(doc2Caller.doctorWorkspace.appointments.updateStatus({ id: appointmentId, status: "Cancelled" })).rejects.toThrow(/Appointment was not found/);
  });

  test("10. Invalid appointment status transition is rejected", async () => {
    const docCaller = appRouter.createCaller({ user: { id: -1, openId: `synthetic-doctor:${TEST_DOCTOR_1.id}`, role: "doctor" } });
    
    // Transition from Confirmed to Requested is not allowed
    // Wait, the Zod schema only allows Confirmed | Cancelled | Completed anyway.
    // Let's test a transition that Zod allows but DB rejects, like Completed -> Confirmed? 
    // We have to put it into Completed first.
    await docCaller.doctorWorkspace.appointments.updateStatus({ id: appointmentId, status: "Completed" });

    // Now try to move it back to Confirmed
    await expect(docCaller.doctorWorkspace.appointments.updateStatus({ id: appointmentId, status: "Confirmed" })).rejects.toThrow(/Appointment was not found/);
  });

  test("11. Dashboard appointment metrics reflect DB state", async () => {
    const docCaller = appRouter.createCaller({ user: { id: -1, openId: `synthetic-doctor:${TEST_DOCTOR_1.id}`, role: "doctor" } });
    const dashboard = await docCaller.doctorWorkspace.dashboard();
    expect(dashboard.appointmentCount).toBeGreaterThanOrEqual(1); // Because it is "Completed" now

    const patientCaller = appRouter.createCaller({ user: { id: patient1Id, openId: "test:patient-lifecycle-1", role: "user" } });
    const patDashboard = await patientCaller.patientDashboard.summary();
    const appt = patDashboard.appointments.find(a => a.id === appointmentId);
    expect(appt).toBeDefined();
    expect(appt?.status).toBe("Completed");
  });
});
