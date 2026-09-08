import { expect, test, describe, beforeAll, afterAll } from "vitest";
import { config } from "dotenv";
config();
import { getDb, upsertUser, createPatientMedicine, removeOwnedPatientMedicine, listPatientMedicines, updateOwnedPatientMedicine } from "./db";
import { appRouter } from "./routers";
import { users, patientMedicines } from "./database/schema";
import { eq } from "drizzle-orm";

let db: NonNullable<Awaited<ReturnType<typeof getDb>>>;

beforeAll(async () => {
  const maybeDb = await getDb();
  if (!maybeDb) throw new Error("Database not available");
  db = maybeDb;

  await upsertUser({
    openId: "test:patient-medicine-1",
    name: "Medicine Patient 1",
    email: "mp1@example.com",
    loginMethod: "native-patient",
    role: "user",
  });
  
  await upsertUser({
    openId: "test:patient-medicine-2",
    name: "Medicine Patient 2",
    email: "mp2@example.com",
    loginMethod: "native-patient",
    role: "user",
  });
});

describe("Medicine Cabinet CRUD", () => {
  let patient1Id: number;
  let patient2Id: number;
  let medicineId: number;

  beforeAll(async () => {
    const u1 = await db.select().from(users).where(eq(users.openId, "test:patient-medicine-1"));
    patient1Id = u1[0].id;
    const u2 = await db.select().from(users).where(eq(users.openId, "test:patient-medicine-2"));
    patient2Id = u2[0].id;
  });

  afterAll(async () => {
    await db.delete(patientMedicines).where(eq(patientMedicines.userId, patient1Id));
    await db.delete(patientMedicines).where(eq(patientMedicines.userId, patient2Id));
  });

  test("1. Patient creates medicine", async () => {
    const caller = appRouter.createCaller({ user: { id: patient1Id, openId: "test:patient-medicine-1", role: "user" } });
    
    const response = await caller.patientMedicine.create({
      name: "Amoxicillin",
      dosage: "500mg",
      frequency: "Twice daily",
      schedule: "Morning and Evening",
      quantity: 30,
    });

    expect(response.id).toBeGreaterThan(0);
    medicineId = response.id;
    
    const inDb = await db.select().from(patientMedicines).where(eq(patientMedicines.id, medicineId));
    expect(inDb.length).toBe(1);
    expect(inDb[0].userId).toBe(patient1Id);
    expect(inDb[0].name).toBe("Amoxicillin");
  });

  test("2. Patient reads own medicine", async () => {
    const caller = appRouter.createCaller({ user: { id: patient1Id, openId: "test:patient-medicine-1", role: "user" } });
    const list = await caller.patientMedicine.list();
    const med = list.find((m) => m.id === medicineId);
    expect(med).toBeDefined();
    expect(med?.dosage).toBe("500mg");
    expect(med?.quantity).toBe(30);
  });

  test("3. Patient edits own medicine", async () => {
    const caller = appRouter.createCaller({ user: { id: patient1Id, openId: "test:patient-medicine-1", role: "user" } });
    const response = await caller.patientMedicine.update({
      id: medicineId,
      values: { dosage: "250mg", quantity: 28 },
    });
    expect(response.success).toBe(true);

    const inDb = await db.select().from(patientMedicines).where(eq(patientMedicines.id, medicineId));
    expect(inDb[0].dosage).toBe("250mg");
    expect(inDb[0].quantity).toBe(28);
  });

  test("4. Ownership: Patient cannot read/edit/delete another patient's medicine", async () => {
    const caller2 = appRouter.createCaller({ user: { id: patient2Id, openId: "test:patient-medicine-2", role: "user" } });
    
    const list = await caller2.patientMedicine.list();
    expect(list.find((m) => m.id === medicineId)).toBeUndefined();

    await expect(caller2.patientMedicine.update({
      id: medicineId,
      values: { name: "Hacked" }
    })).rejects.toThrow(/Medicine record not found/);

    await expect(caller2.patientMedicine.remove({
      id: medicineId
    })).rejects.toThrow(/Medicine record not found/);
    
    // Ensure it wasn't modified
    const inDb = await db.select().from(patientMedicines).where(eq(patientMedicines.id, medicineId));
    expect(inDb[0].name).toBe("Amoxicillin");
  });

  test("5. Validation: Requires name, dosage, frequency, schedule", async () => {
    const caller = appRouter.createCaller({ user: { id: patient1Id, openId: "test:patient-medicine-1", role: "user" } });
    
    // @ts-expect-error Testing invalid input
    await expect(caller.patientMedicine.create({
      dosage: "10mg",
      frequency: "Daily",
      schedule: "Morning"
    })).rejects.toThrow();

    await expect(caller.patientMedicine.create({
      name: "",
      dosage: "10mg",
      frequency: "Daily",
      schedule: "Morning"
    })).rejects.toThrow();
  });

  test("6. Dashboard integration reflects medicine state", async () => {
    const caller = appRouter.createCaller({ user: { id: patient1Id, openId: "test:patient-medicine-1", role: "user" } });
    const dashboard = await caller.patientDashboard.summary();
    const med = dashboard.medicines.find(m => m.id === medicineId);
    expect(med).toBeDefined();
    expect(med?.dosage).toBe("250mg");
  });

  test("7. Patient deletes medicine", async () => {
    const caller = appRouter.createCaller({ user: { id: patient1Id, openId: "test:patient-medicine-1", role: "user" } });
    const response = await caller.patientMedicine.remove({ id: medicineId });
    expect(response.success).toBe(true);

    const inDb = await db.select().from(patientMedicines).where(eq(patientMedicines.id, medicineId));
    expect(inDb.length).toBe(0);
  });
});
