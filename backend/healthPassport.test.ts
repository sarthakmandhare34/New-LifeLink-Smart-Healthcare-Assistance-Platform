import { expect, test, describe, beforeAll, afterAll } from "vitest";
import { config } from "dotenv";
config();
import { getDb, upsertUser } from "./db";
import { appRouter } from "./routers";
import { users, patientProfiles, patientEmergencyContacts } from "./database/schema";
import { eq } from "drizzle-orm";

let db: NonNullable<Awaited<ReturnType<typeof getDb>>>;

beforeAll(async () => {
  const maybeDb = await getDb();
  if (!maybeDb) throw new Error("Database not available");
  db = maybeDb;

  await upsertUser({
    openId: "test:patient-passport-1",
    name: "Passport Patient 1",
    email: "pp1@example.com",
    loginMethod: "native-patient",
    role: "user",
  });

  await upsertUser({
    openId: "test:patient-passport-2",
    name: "Passport Patient 2",
    email: "pp2@example.com",
    loginMethod: "native-patient",
    role: "user",
  });
});

describe("Digital Health Passport & Emergency Contacts", () => {
  let patient1Id: number;
  let patient2Id: number;
  let contact1Id: number;

  beforeAll(async () => {
    const u1 = await db.select().from(users).where(eq(users.openId, "test:patient-passport-1"));
    patient1Id = u1[0].id;
    const u2 = await db.select().from(users).where(eq(users.openId, "test:patient-passport-2"));
    patient2Id = u2[0].id;

    // Ensure initial profiles exist
    const p1 = await db.select().from(patientProfiles).where(eq(patientProfiles.userId, patient1Id));
    if (!p1.length) {
      await db.insert(patientProfiles).values({ userId: patient1Id, allergiesJson: "[]", conditionsJson: "[]" });
    }
    const p2 = await db.select().from(patientProfiles).where(eq(patientProfiles.userId, patient2Id));
    if (!p2.length) {
      await db.insert(patientProfiles).values({ userId: patient2Id, allergiesJson: "[]", conditionsJson: "[]" });
    }
  });

  afterAll(async () => {
    await db.delete(patientEmergencyContacts).where(eq(patientEmergencyContacts.userId, patient1Id));
    await db.delete(patientEmergencyContacts).where(eq(patientEmergencyContacts.userId, patient2Id));
  });

  // HEALTH PASSPORT TESTS
  describe("Health Passport", () => {
    test("1. Authenticated read: Patient 1 reads own passport", async () => {
      const caller1 = appRouter.createCaller({ user: { id: patient1Id, openId: "test:patient-passport-1", role: "user" } });
      const passport = await caller1.patientProfile.get();

      expect(passport).toBeDefined();
      expect(passport?.id).toBe(patient1Id);
      expect(passport?.name).toBe("Passport Patient 1");
      expect(Array.isArray(passport?.allergies)).toBe(true);
      expect(Array.isArray(passport?.conditions)).toBe(true);
    });

    test("2. Update: Patient 1 updates blood group, allergies, and conditions", async () => {
      const caller1 = appRouter.createCaller({ user: { id: patient1Id, openId: "test:patient-passport-1", role: "user" } });
      const updated = await caller1.patientProfile.update({
        bloodGroup: "O+",
        allergies: ["Penicillin", "Peanuts"],
        conditions: ["Asthma"],
      });

      expect(updated?.bloodGroup).toBe("O+");
      expect(updated?.allergies).toEqual(["Penicillin", "Peanuts"]);
      expect(updated?.conditions).toEqual(["Asthma"]);
    });

    test("3. Persistence: Verify updated passport persists in DB", async () => {
      const rows = await db.select().from(patientProfiles).where(eq(patientProfiles.userId, patient1Id));
      expect(rows.length).toBe(1);
      expect(rows[0].bloodGroup).toBe("O+");
      expect(JSON.parse(rows[0].allergiesJson)).toEqual(["Penicillin", "Peanuts"]);
      expect(JSON.parse(rows[0].conditionsJson)).toEqual(["Asthma"]);
    });

    test("4. Validation: Rejects invalid passport inputs", async () => {
      const caller1 = appRouter.createCaller({ user: { id: patient1Id, openId: "test:patient-passport-1", role: "user" } });
      // bloodGroup exceeds max 12 chars
      await expect(caller1.patientProfile.update({
        bloodGroup: "VERY_LONG_INVALID_BLOOD_GROUP",
      })).rejects.toThrow();
    });

    test("5. Patient isolation / IDOR: Patient 2 cannot alter Patient 1 passport", async () => {
      const caller2 = appRouter.createCaller({ user: { id: patient2Id, openId: "test:patient-passport-2", role: "user" } });
      
      // Patient 2 updates their own profile
      await caller2.patientProfile.update({
        bloodGroup: "AB-",
        allergies: ["Latex"],
        conditions: ["Hypertension"],
      });

      // Verify Patient 1's data in DB is unchanged
      const rows = await db.select().from(patientProfiles).where(eq(patientProfiles.userId, patient1Id));
      expect(rows[0].bloodGroup).toBe("O+");
      expect(JSON.parse(rows[0].allergiesJson)).toEqual(["Penicillin", "Peanuts"]);

      // Verify Patient 2's data in DB is separate
      const p2Rows = await db.select().from(patientProfiles).where(eq(patientProfiles.userId, patient2Id));
      expect(p2Rows[0].bloodGroup).toBe("AB-");
      expect(JSON.parse(p2Rows[0].allergiesJson)).toEqual(["Latex"]);
    });
  });

  // EMERGENCY CONTACTS TESTS
  describe("Emergency Contacts", () => {
    test("6. Create contact: Patient 1 creates an emergency contact", async () => {
      const caller1 = appRouter.createCaller({ user: { id: patient1Id, openId: "test:patient-passport-1", role: "user" } });
      const result = await caller1.patientProfile.emergencyContacts.create({
        name: "Jane Doe",
        relationship: "Spouse",
        phone: "+91 98765 43210",
      });

      expect(result.id).toBeGreaterThan(0);
      contact1Id = result.id;

      const inDb = await db.select().from(patientEmergencyContacts).where(eq(patientEmergencyContacts.id, contact1Id));
      expect(inDb.length).toBe(1);
      expect(inDb[0].userId).toBe(patient1Id);
      expect(inDb[0].name).toBe("Jane Doe");
      expect(inDb[0].relationship).toBe("Spouse");
      expect(inDb[0].phone).toBe("+91 98765 43210");
    });

    test("7. Read contacts: Patient 1 reads emergency contacts in passport", async () => {
      const caller1 = appRouter.createCaller({ user: { id: patient1Id, openId: "test:patient-passport-1", role: "user" } });
      const passport = await caller1.patientProfile.get();

      const contact = passport?.emergencyContacts.find((c) => c.id === String(contact1Id));
      expect(contact).toBeDefined();
      expect(contact?.name).toBe("Jane Doe");
      expect(contact?.relationship).toBe("Spouse");
      expect(contact?.phone).toBe("+91 98765 43210");
    });

    test("8. Update contact: Patient 1 updates own emergency contact", async () => {
      const caller1 = appRouter.createCaller({ user: { id: patient1Id, openId: "test:patient-passport-1", role: "user" } });
      const result = await caller1.patientProfile.emergencyContacts.update({
        id: contact1Id,
        values: {
          name: "Jane Doe-Smith",
          relationship: "Partner",
          phone: "+91 98765 43211",
        },
      });

      expect(result.success).toBe(true);

      const inDb = await db.select().from(patientEmergencyContacts).where(eq(patientEmergencyContacts.id, contact1Id));
      expect(inDb[0].name).toBe("Jane Doe-Smith");
      expect(inDb[0].relationship).toBe("Partner");
      expect(inDb[0].phone).toBe("+91 98765 43211");
    });

    test("9. Ownership / IDOR: Patient 2 cannot update or delete Patient 1's contact", async () => {
      const caller2 = appRouter.createCaller({ user: { id: patient2Id, openId: "test:patient-passport-2", role: "user" } });

      // Patient 2 attempts to update Patient 1's contact
      await expect(caller2.patientProfile.emergencyContacts.update({
        id: contact1Id,
        values: {
          name: "Attacker",
          relationship: "None",
          phone: "+91 00000 00000",
        },
      })).rejects.toThrow(/Emergency contact not found/);

      // Patient 2 attempts to delete Patient 1's contact
      await expect(caller2.patientProfile.emergencyContacts.remove({
        id: contact1Id,
      })).rejects.toThrow(/Emergency contact not found/);

      // Verify contact was not changed or deleted in DB
      const inDb = await db.select().from(patientEmergencyContacts).where(eq(patientEmergencyContacts.id, contact1Id));
      expect(inDb.length).toBe(1);
      expect(inDb[0].name).toBe("Jane Doe-Smith");
    });

    test("10. Validation: Emergency contact inputs are validated", async () => {
      const caller1 = appRouter.createCaller({ user: { id: patient1Id, openId: "test:patient-passport-1", role: "user" } });

      // Invalid phone
      await expect(caller1.patientProfile.emergencyContacts.create({
        name: "Test Contact",
        relationship: "Friend",
        phone: "short",
      })).rejects.toThrow();

      // Empty name
      await expect(caller1.patientProfile.emergencyContacts.create({
        name: "",
        relationship: "Friend",
        phone: "+91 98765 43210",
      })).rejects.toThrow();
    });

    test("11. Delete contact: Patient 1 deletes own emergency contact", async () => {
      const caller1 = appRouter.createCaller({ user: { id: patient1Id, openId: "test:patient-passport-1", role: "user" } });
      const result = await caller1.patientProfile.emergencyContacts.remove({
        id: contact1Id,
      });

      expect(result.success).toBe(true);

      const inDb = await db.select().from(patientEmergencyContacts).where(eq(patientEmergencyContacts.id, contact1Id));
      expect(inDb.length).toBe(0);
    });

    test("12. Persistence after deletion: Contact remains absent on read", async () => {
      const caller1 = appRouter.createCaller({ user: { id: patient1Id, openId: "test:patient-passport-1", role: "user" } });
      const passport = await caller1.patientProfile.get();

      const contact = passport?.emergencyContacts.find((c) => c.id === String(contact1Id));
      expect(contact).toBeUndefined();
    });
  });
});
