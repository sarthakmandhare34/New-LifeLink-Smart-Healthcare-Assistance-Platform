import "dotenv/config";
import { getDb } from "../backend/db";
import { sql } from "drizzle-orm";

async function clearUsers() {
  console.log("Connecting to database...");
  const db = await getDb();
  if (!db) {
    console.error("❌ Failed to connect to MySQL database. Ensure MySQL service is running.");
    process.exit(1);
  }

  console.log("Clearing all existing users, credentials, and medical history...");
  await db.execute(sql.raw("SET FOREIGN_KEY_CHECKS = 0;"));
  await db.execute(sql.raw("TRUNCATE TABLE patientPrescriptionItems;"));
  await db.execute(sql.raw("TRUNCATE TABLE patientPrescriptions;"));
  await db.execute(sql.raw("TRUNCATE TABLE patientAppointments;"));
  await db.execute(sql.raw("TRUNCATE TABLE patientMedicines;"));
  await db.execute(sql.raw("TRUNCATE TABLE patientEmergencyContacts;"));
  await db.execute(sql.raw("TRUNCATE TABLE patientProfiles;"));
  await db.execute(sql.raw("TRUNCATE TABLE patientAssessments;"));
  await db.execute(sql.raw("TRUNCATE TABLE patientEvents;"));
  await db.execute(sql.raw("TRUNCATE TABLE doctorEvents;"));
  await db.execute(sql.raw("TRUNCATE TABLE patientProviderIdentities;"));
  await db.execute(sql.raw("TRUNCATE TABLE patientCredentials;"));
  await db.execute(sql.raw("TRUNCATE TABLE syntheticDoctorCredentials;"));
  await db.execute(sql.raw("TRUNCATE TABLE users;"));
  await db.execute(sql.raw("SET FOREIGN_KEY_CHECKS = 1;"));
  
  console.log("✅ All user accounts, history, and credentials completely deleted! Database is 100% fresh and clean.");
  process.exit(0);
}

clearUsers().catch((err) => {
  console.error("Error clearing users:", err);
  process.exit(1);
});
