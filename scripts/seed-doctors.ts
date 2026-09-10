import "dotenv/config";
import { getDb, createNativePatient, createSyntheticDoctorCredential } from "../backend/db";
import { mockDoctorDirectory } from "../backend/discovery/mockDoctorDirectory";
import { hashPatientPassword } from "../backend/auth/nativePatientAuth";

async function resetAndSeedDatabase() {
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
  const patientPassword = "Password123!";
  const patientPasswordHash = await hashPatientPassword(patientPassword);

  const samplePatients = [
    { username: "patient", name: "Demo Patient", email: "patient@lifelink.com" },
    { username: "sarthak", name: "Sarthak Mishra", email: "sarthak@lifelink.com" },
    { username: "aarav", name: "Aarav Sharma", email: "aarav.sharma@lifelink.com" },
    { username: "priya", name: "Priya Patel", email: "priya.patel@lifelink.com" },
  ];

  const seededPatients: { Username: string; Email: string; Password: string; Role: string }[] = [];

  for (const patient of samplePatients) {
    const user = await createNativePatient({
      name: patient.name,
      email: patient.email,
      passwordHash: patientPasswordHash,
    });
    if (user) {
      seededPatients.push({
        Username: patient.username,
        Email: patient.email,
        Password: patientPassword,
        Role: "patient",
      });
    }
  }

  // 2. Create Doctor Accounts with email and password only (consistent naming convention)
  console.log("\nSeeding Doctor Accounts with email and password only (consistent naming convention)...");
  const doctorPassword = "demo";
  const doctorPasswordHash = await hashPatientPassword(doctorPassword);

  const seededDoctors: { Specialty: string; Email: string; Password: string; "Alias Login": string }[] = [];

  for (const doctor of mockDoctorDirectory) {
    // Consistent naming convention: lowercase specialty name ending in @lifelink.com
    // e.g. pediatrics@lifelink.com, cardiology@lifelink.com, dermatology@lifelink.com
    const specialtySlug = doctor.specialty.toLowerCase().replace(/[^a-z]/g, "");
    const doctorEmail = `${specialtySlug}@lifelink.com`;

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
        "Alias Login": specialtySlug === "pediatrics" ? "pediatrician@lifelink.com or pediatrics" : specialtySlug,
      });
    } catch (e: any) {
      console.error(`Failed to seed ${doctor.name}: ${e.message}`);
    }
  }

  console.log("\n========================================================");
  console.log("   LIFELINK — DATABASE USER RESET & SEEDING REPORT");
  console.log("========================================================\n");

  console.log("--- PATIENT ACCOUNTS (Email, Username & Password) ---");
  console.table(seededPatients);
  console.log("👉 Login at http://localhost:3000/login using any Email or Username above.\n");

  console.log("--- DOCTOR ACCOUNTS (Email & Password Only) ---");
  console.table(seededDoctors);
  console.log("👉 Login at http://localhost:3000/doctor/login using any Doctor Email above (e.g. pediatrics@lifelink.com or pediatrician@lifelink.com) with password 'demo'.\n");

  process.exit(0);
}

resetAndSeedDatabase().catch((err) => {
  console.error("Fatal error during seeding:", err);
  process.exit(1);
});
