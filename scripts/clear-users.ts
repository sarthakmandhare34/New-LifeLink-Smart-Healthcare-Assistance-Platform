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

  console.log("Clearing all synthetic doctor credentials and user accounts...");
  await db.execute(sql.raw("SET FOREIGN_KEY_CHECKS = 0;"));
  await db.execute(sql.raw("TRUNCATE TABLE syntheticDoctorCredentials;"));
  await db.execute(sql.raw("TRUNCATE TABLE patientCredentials;"));
  await db.execute(sql.raw("TRUNCATE TABLE patientProviderIdentities;"));
  await db.execute(sql.raw("TRUNCATE TABLE users;"));
  await db.execute(sql.raw("SET FOREIGN_KEY_CHECKS = 1;"));
  
  console.log("✅ All user accounts and doctor credentials cleared successfully!");
  process.exit(0);
}

clearUsers().catch((err) => {
  console.error("Error clearing users:", err);
  process.exit(1);
});
