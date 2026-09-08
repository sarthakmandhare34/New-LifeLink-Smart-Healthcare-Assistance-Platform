import "dotenv/config";
import mysql from "mysql2/promise";

async function initDatabase() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("❌ DATABASE_URL is not defined in .env");
    process.exit(1);
  }

  console.log("Checking MySQL connection and database presence...");
  
  try {
    // Parse connection URL or extract host/user/password
    const parsed = new URL(databaseUrl.replace(/^mysql:\/\//, "http://"));
    const host = parsed.hostname || "127.0.0.1";
    const port = Number(parsed.port) || 3306;
    const user = decodeURIComponent(parsed.username) || "root";
    const password = decodeURIComponent(parsed.password) || "";
    const dbName = parsed.pathname.replace(/^\//, "") || "lifelink";

    console.log(`Connecting to MySQL at ${host}:${port} as ${user}...`);

    const connection = await mysql.createConnection({
      host,
      port,
      user,
      password,
    });

    console.log(`Ensuring database '${dbName}' exists...`);
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
    console.log(`✅ Database '${dbName}' is ready.`);

    await connection.end();
    process.exit(0);
  } catch (error: any) {
    if (error.code === "ECONNREFUSED") {
      console.error("\n❌ Could not connect to MySQL (ECONNREFUSED).");
      console.error("Please make sure your MySQL service is running.");
      console.error("On Windows: Start the 'MySQL80' service via services.msc or run 'net start MySQL80' as Administrator.\n");
    } else {
      console.error("\n❌ Error initializing database:", error.message || error);
    }
    process.exit(1);
  }
}

initDatabase();
