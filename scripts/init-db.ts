import "dotenv/config";                                          // Load environment variables from .env into process.env
import mysql from "mysql2/promise";                               // Modern promise-based MySQL client for Node.js

// --- Cluster: Automated Database Initialization ---
// Ensures the MySQL database exists before Drizzle ORM runs migrations or starts the server
async function initDatabase() {
  const databaseUrl = process.env.DATABASE_URL;                   // Read MySQL connection string from environment
  if (!databaseUrl) {
    console.error("❌ DATABASE_URL is not defined in .env");      // Halt if connection credentials are missing
    process.exit(1);
  }

  console.log("Checking MySQL connection and database presence...");
  
  try {
    // --- Cluster: Parse Connection URL ---
    // Converts mysql:// URL format into individual host, port, user, password, and dbName components
    const parsed = new URL(databaseUrl.replace(/^mysql:\/\//, "http://")); // Temporarily swap protocol for standard URL parser
    const host = parsed.hostname || "127.0.0.1";                  // Target database server host
    const port = Number(parsed.port) || 3306;                     // Default MySQL port (3306)
    const user = decodeURIComponent(parsed.username) || "root";    // MySQL username (default: root)
    const password = decodeURIComponent(parsed.password) || "";   // MySQL password
    const dbName = parsed.pathname.replace(/^\//, "") || "lifelink"; // Target schema name (lifelink)

    console.log(`Connecting to MySQL at ${host}:${port} as ${user}...`);

    // Create raw connection to the MySQL server (without specifying database yet)
    const connection = await mysql.createConnection({
      host,
      port,
      user,
      password,
    });

    console.log(`Ensuring database '${dbName}' exists...`);
    // Automatically creates the database with full UTF-8 Unicode support if it doesn't already exist
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
    console.log(`✅ Database '${dbName}' is ready.`);

    await connection.end();                                       // Gracefully close temporary setup connection
    process.exit(0);                                              // Exit cleanly with success code 0
  } catch (error: any) {
    // Friendly error message for common undergraduate local setup issues
    if (error.code === "ECONNREFUSED") {
      console.error("\n❌ Could not connect to MySQL (ECONNREFUSED).");
      console.error("Please make sure your MySQL service is running.");
      console.error("On Windows: Start the 'MySQL80' service via services.msc or run 'net start MySQL80' as Administrator.\n");
    } else {
      console.error("\n❌ Error initializing database:", error.message || error);
    }
    process.exit(1);                                              // Exit with error code 1
  }
}

initDatabase();                                                   // Execute initialization function immediately on run
