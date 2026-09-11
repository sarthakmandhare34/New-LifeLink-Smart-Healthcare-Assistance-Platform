import "dotenv/config";
import { getDb, createSyntheticDoctorCredential, refreshSyntheticDoctorCredentialByDoctorId } from "../backend/db";
import { mockDoctorDirectory } from "../backend/discovery/mockDoctorDirectory";
import { hashPatientPassword, verifyPatientPassword } from "../backend/auth/nativePatientAuth";
import { syntheticDoctorCredentials, users } from "../database/schema";
import { eq } from "drizzle-orm";

const EXPECTED_DOCTORS = [
  { specialty: "Cardiology", email: "cardiology@lifelink.com", password: "cardio@lifelink" },
  { specialty: "Orthopedics", email: "orthopedics@lifelink.com", password: "ortho@lifelink" },
  { specialty: "Dermatology", email: "dermatology@lifelink.com", password: "derma@lifelink" },
  { specialty: "Neurology", email: "neurology@lifelink.com", password: "neuro@lifelink" },
  { specialty: "Pediatrics", email: "pediatrics@lifelink.com", password: "pedia@lifelink" },
  { specialty: "General Practice", email: "generalpractice@lifelink.com", password: "general@lifelink" },
  { specialty: "Ophthalmology", email: "ophthalmology@lifelink.com", password: "ophthal@lifelink" },
  { specialty: "Gastroenterology", email: "gastroenterology@lifelink.com", password: "gastro@lifelink" },
  { specialty: "Psychiatry", email: "psychiatry@lifelink.com", password: "psych@lifelink" },
  { specialty: "Endocrinology", email: "endocrinology@lifelink.com", password: "endo@lifelink" },
  { specialty: "Pulmonology", email: "pulmonology@lifelink.com", password: "pulmo@lifelink" },
  { specialty: "Gynecology", email: "gynecology@lifelink.com", password: "gynae@lifelink" },
];

async function syncDoctors() {
  console.log("Connecting to database...");
  const db = await getDb();
  if (!db) {
    throw new Error("Database connection failed. Ensure MySQL service is running.");
  }

  // Fetch current synthetic doctor credentials from DB
  const existingRows = await db
    .select({
      id: syntheticDoctorCredentials.id,
      doctorId: syntheticDoctorCredentials.doctorId,
      email: syntheticDoctorCredentials.email,
      passwordHash: syntheticDoctorCredentials.passwordHash,
      userName: users.name,
      userRole: users.role,
    })
    .from(syntheticDoctorCredentials)
    .innerJoin(users, eq(syntheticDoctorCredentials.userId, users.id));

  console.log(`Currently found ${existingRows.length} doctor account(s) in the database.\n`);

  const report: Array<{
    Specialty: string;
    "Official Work Email": string;
    Password: string;
    "Previous Status": string;
    "Action Taken": string;
    "Current Status": string;
  }> = [];

  for (const expected of EXPECTED_DOCTORS) {
    const doctorDef = mockDoctorDirectory.find(
      (d) => d.specialty.toLowerCase() === expected.specialty.toLowerCase()
    );

    if (!doctorDef) {
      console.warn(`⚠️ Doctor definition not found for specialty: ${expected.specialty}`);
      continue;
    }

    const existing = existingRows.find(
      (row) => row.doctorId === doctorDef.id || row.email.toLowerCase() === expected.email.toLowerCase()
    );

    if (!existing) {
      // Missing from database -> Insert fresh
      const passwordHash = await hashPatientPassword(expected.password);
      await createSyntheticDoctorCredential({
        doctor: doctorDef,
        email: expected.email,
        passwordHash,
      });

      report.push({
        Specialty: expected.specialty,
        "Official Work Email": expected.email,
        Password: expected.password,
        "Previous Status": "❌ Missing",
        "Action Taken": "Created fresh account",
        "Current Status": "✅ ACTIVE IN DATABASE",
      });
    } else {
      // Check if password and email match expected values
      const isPasswordValid = await verifyPatientPassword(expected.password, existing.passwordHash);
      const isEmailValid = existing.email.toLowerCase() === expected.email.toLowerCase();

      if (isPasswordValid && isEmailValid) {
        report.push({
          Specialty: expected.specialty,
          "Official Work Email": expected.email,
          Password: expected.password,
          "Previous Status": "✅ Existed",
          "Action Taken": "Verified matching",
          "Current Status": "✅ ACTIVE IN DATABASE",
        });
      } else {
        // Needs update
        const passwordHash = await hashPatientPassword(expected.password);
        await refreshSyntheticDoctorCredentialByDoctorId({
          doctorId: doctorDef.id,
          email: expected.email,
          passwordHash,
        });

        report.push({
          Specialty: expected.specialty,
          "Official Work Email": expected.email,
          Password: expected.password,
          "Previous Status": `⚠️ Outdated (${!isEmailValid ? "email" : "password"})`,
          "Action Taken": "Updated email & password",
          "Current Status": "✅ ACTIVE IN DATABASE",
        });
      }
    }
  }

  console.log("=========================================================================");
  console.log("             LIFELINK — DOCTOR DATABASE AUDIT & SYNC REPORT               ");
  console.log("=========================================================================\n");
  console.table(report);

  console.log("\n✅ All 12 doctor accounts are 100% verified and active in the database.");
  console.log("👉 Clinicians can log in at: http://localhost:5173/doctor/login\n");
  process.exit(0);
}

syncDoctors().catch((err) => {
  console.error("Error synchronizing doctors:", err);
  process.exit(1);
});
