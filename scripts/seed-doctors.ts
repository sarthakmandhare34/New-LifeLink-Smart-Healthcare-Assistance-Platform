import "dotenv/config";
import { getDb, createNativePatient, createSyntheticDoctorCredential } from "../backend/db";
import { mockDoctorDirectory } from "../backend/discovery/mockDoctorDirectory";
import { hashPatientPassword } from "../backend/auth/nativePatientAuth";

async function resetAndSeedDatabase() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("DANGER: Database reset script (seed-doctors.ts) is strictly disabled in production (NODE_ENV=production).");
  }

  console.log("Connecting to database...");
  const db = await getDb();
  if (!db) {
    throw new Error("Database connection failed. Make sure DATABASE_URL is set in .env.");
  }

  console.log("Clearing all existing users and associated tables...");
  await db.execute("SET FOREIGN_KEY_CHECKS = 0;");
  await db.execute("TRUNCATE TABLE patientPrescriptionItems;");
  await db.execute("TRUNCATE TABLE patientPrescriptions;");
  await db.execute("TRUNCATE TABLE patientAppointments;");
  await db.execute("TRUNCATE TABLE patientMedicines;");
  await db.execute("TRUNCATE TABLE patientEmergencyContacts;");
  await db.execute("TRUNCATE TABLE patientProfiles;");
  await db.execute("TRUNCATE TABLE patientAssessments;");
  await db.execute("TRUNCATE TABLE patientEvents;");
  await db.execute("TRUNCATE TABLE doctorEvents;");
  await db.execute("TRUNCATE TABLE patientProviderIdentities;");
  await db.execute("TRUNCATE TABLE patientCredentials;");
  await db.execute("TRUNCATE TABLE syntheticDoctorCredentials;");
  await db.execute("TRUNCATE TABLE users;");
  await db.execute("SET FOREIGN_KEY_CHECKS = 1;");
  console.log("✅ All existing users and related data deleted successfully.");

  // 1. Create Patient Accounts with email, username, and password
  console.log("\nSeeding Patient Accounts with username, email, and password...");

  const samplePatients = [
    { username: "patient", name: "Demo Patient", email: "patient@lifelink.com", password: "patient@lifelink" },
    { username: "sarthak", name: "Sarthak Mishra", email: "sarthak@lifelink.com", password: "sarthak@lifelink" },
    { username: "aarav", name: "Aarav Sharma", email: "aarav.sharma@lifelink.com", password: "aarav@lifelink" },
    { username: "priya", name: "Priya Patel", email: "priya.patel@lifelink.com", password: "priya@lifelink" },
  ];

  const seededPatients: { Username: string; Email: string; Password: string; Role: string }[] = [];

  for (const patient of samplePatients) {
    const passwordHash = await hashPatientPassword(patient.password);
    const user = await createNativePatient({
      name: patient.name,
      email: patient.email,
      passwordHash,
    });
    if (user) {
      seededPatients.push({
        Username: patient.username,
        Email: patient.email,
        Password: patient.password,
        Role: "patient",
      });
    }
  }

  // 2. Create Doctor Accounts with email and password only (consistent naming convention)
  console.log("\nSeeding Doctor Accounts with clean emails and identical simple password pattern...");

  const SPECIALTY_PASSWORDS: Record<string, { short: string; password: string }> = {
    cardiology: { short: "cardio", password: "cardio@lifelink" },
    orthopedics: { short: "ortho", password: "ortho@lifelink" },
    dermatology: { short: "derma", password: "derma@lifelink" },
    neurology: { short: "neuro", password: "neuro@lifelink" },
    pediatrics: { short: "pedia", password: "pedia@lifelink" },
    generalpractice: { short: "general", password: "general@lifelink" },
    ophthalmology: { short: "ophthal", password: "ophthal@lifelink" },
    gastroenterology: { short: "gastro", password: "gastro@lifelink" },
    psychiatry: { short: "psych", password: "psych@lifelink" },
    endocrinology: { short: "endo", password: "endo@lifelink" },
    pulmonology: { short: "pulmo", password: "pulmo@lifelink" },
    gynecology: { short: "gynae", password: "gynae@lifelink" },
  };

  const seededDoctors: { Specialty: string; Email: string; Password: string; "Alias Login": string }[] = [];

  for (const doctor of mockDoctorDirectory) {
    const specialtySlug = doctor.specialty.toLowerCase().replace(/[^a-z]/g, "");
    const doctorEmail = `${specialtySlug}@lifelink.com`;
    const config = SPECIALTY_PASSWORDS[specialtySlug] || { short: specialtySlug, password: `${specialtySlug}@lifelink` };
    const doctorPassword = config.password;
    const doctorPasswordHash = await hashPatientPassword(doctorPassword);

    try {
      await createSyntheticDoctorCredential({
        doctor,
        email: doctorEmail,
        passwordHash: doctorPasswordHash,
      });

      seededDoctors.push({
        Specialty: doctor.specialty,
        Email: doctorEmail,
        Password: doctorPassword,
        "Alias Login": `${config.short}@lifelink.com or ${config.short}`,
      });
    } catch (e: any) {
      console.error(`Failed to seed ${doctor.name}: ${e.message}`);
    }
  }

  console.log("\n========================================================");
  console.log("   LIFELINK — FRESH DATABASE RESET & SEEDING REPORT");
  console.log("========================================================\n");

  console.log("--- PATIENT ACCOUNTS (Email, Username & Password) ---");
  console.table(seededPatients);
  console.log("👉 Login at http://localhost:5173/login using any Email or Username above.\n");

  console.log("--- DOCTOR ACCOUNTS (Email & Password) ---");
  console.table(seededDoctors);
  console.log("👉 Login at http://localhost:5173/doctor/login using any Doctor Email and Password above.\n");

  process.exit(0);
}

resetAndSeedDatabase().catch((err) => {
  console.error("Fatal error during seeding:", err);
  process.exit(1);
});
