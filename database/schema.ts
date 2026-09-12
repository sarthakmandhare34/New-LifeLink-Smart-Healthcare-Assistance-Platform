import { foreignKey, int, mysqlEnum, mysqlTable, text, timestamp, unique, varchar } from "drizzle-orm/mysql-core";

// ============================================================================
// LIFELINK DATABASE SCHEMA (Drizzle ORM for MySQL)
// ============================================================================

// --- Table 1: Core Users (Patient, Doctor, Admin) ---
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),                    // Auto-incrementing unique user ID (Primary Key)
  openId: varchar("openId", { length: 64 }).notNull().unique(),  // Unique session subject key (e.g. "native:...", "synthetic-doctor:...")
  name: text("name"),                                            // Full legal or preferred name of the user
  email: varchar("email", { length: 320 }),                      // User's verified email address
  loginMethod: varchar("loginMethod", { length: 64 }),           // Auth provider used ("native-patient", "google-oauth", "synthetic-clinician")
  role: mysqlEnum("role", ["user", "doctor", "admin"]).default("user").notNull(), // User access permission tier
  createdAt: timestamp("createdAt").defaultNow().notNull(),      // Timestamp when user account was registered
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(), // Automatically updates whenever user record changes
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),// Timestamp of most recent successful login
});

export type User = typeof users.$inferSelect;                    // TypeScript type representing a selected user record
export type InsertUser = typeof users.$inferInsert;              // TypeScript type for inserting a new user record

// --- Table 2: Patient AI Health Assessments ---
// Stores records of AI symptom evaluations performed by Google Gemini
export const patientAssessments = mysqlTable("patientAssessments", {
  id: int("id").autoincrement().primaryKey(),                    // Unique assessment record ID
  userId: int("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),        // Foreign key linking to the patient (deletes if user is deleted)
  symptoms: text("symptoms").notNull(),                          // Raw symptoms entered by the patient
  age: int("age").notNull(),                                     // Patient age at time of evaluation
  gender: varchar("gender", { length: 32 }).notNull(),           // Patient gender ("Man", "Woman", "Other")
  conditions: text("conditions"),                                // Optional preexisting health conditions (e.g. "Asthma, Diabetes")
  duration: varchar("duration", { length: 64 }).notNull(),       // How long symptoms have persisted (e.g. "3 days")
  urgency: mysqlEnum("urgency", ["LOW", "MODERATE", "EMERGENCY", "ERROR"]).notNull(), // Clinical urgency tier assigned by triage
  reason: text("reason").notNull(),                              // Objective, non-diagnostic reasoning from Gemini AI
  specialty: varchar("specialty", { length: 160 }).notNull(),    // Recommended in-system specialty (e.g. "Cardiology")
  guidance: text("guidance").notNull(),                          // Actionable next-step guidance for the patient
  createdAt: timestamp("createdAt").defaultNow().notNull(),      // Timestamp of assessment creation
});

export type PatientAssessment = typeof patientAssessments.$inferSelect;
export type InsertPatientAssessment = typeof patientAssessments.$inferInsert;

// --- Table 3: Native Patient Credentials ---
// Stores hashed passwords for native email/password patient authentication
export const patientCredentials = mysqlTable("patientCredentials", {
  id: int("id").autoincrement().primaryKey(),                    // Unique credential row ID
  userId: int("userId")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),        // Foreign key: exactly one credential row per patient
  email: varchar("email", { length: 320 }).notNull().unique(),   // Unique login email address
  passwordHash: varchar("passwordHash", { length: 512 }).notNull(), // Secure salted SHA-256 password hash (passwords never stored in plain text!)
  createdAt: timestamp("createdAt").defaultNow().notNull(),      // Timestamp when password was created
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(), // Timestamp when password was last changed
});

// --- Table 4: Synthetic Doctor Credentials ---
// Connects Mumbai specialist doctor directory entries to login credentials
export const syntheticDoctorCredentials = mysqlTable("syntheticDoctorCredentials", {
  id: int("id").autoincrement().primaryKey(),                    // Unique doctor credential row ID
  userId: int("userId")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),        // Foreign key: links credential to user account
  doctorId: varchar("doctorId", { length: 80 }).notNull().unique(), // Stable specialist identifier (e.g. "doctor-cardio-1")
  email: varchar("email", { length: 320 }).notNull().unique(),   // Doctor's official clinical email (e.g. "cardiology@lifelink.com")
  passwordHash: varchar("passwordHash", { length: 512 }).notNull(), // Salted password hash for clinician sign-in
  createdAt: timestamp("createdAt").defaultNow().notNull(),      // Record creation timestamp
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(), // Password update timestamp
});

// --- Table 5: External Provider OAuth Identities ---
// Links third-party OAuth providers (like Google) to LifeLink accounts
export const patientProviderIdentities = mysqlTable("patientProviderIdentities", {
  id: int("id").autoincrement().primaryKey(),                    // Unique identity record ID
  userId: int("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),        // Foreign key linking to user account
  provider: mysqlEnum("provider", ["google"]).notNull(),         // Name of the OAuth provider (Google)
  subject: varchar("subject", { length: 255 }).notNull(),        // Google's unique user ID ("sub" claim from ID token)
  email: varchar("email", { length: 320 }).notNull(),            // Email verified by Google
  createdAt: timestamp("createdAt").defaultNow().notNull(),      // Link creation timestamp
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(), // Link update timestamp
}, (table) => [
  unique("provider_subject_unique").on(table.provider, table.subject), // Prevents duplicate provider registrations
]);

// --- Table 6: Patient Profiles & Health Passport ---
// Stores personal health passport data (blood group, allergies, conditions, avatar)
export const patientProfiles = mysqlTable("patientProfiles", {
  id: int("id").autoincrement().primaryKey(),                    // Unique profile ID
  userId: int("userId")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),        // Exactly one profile record per patient
  bloodGroup: varchar("bloodGroup", { length: 12 }),             // Patient blood group (e.g. "O+", "A+", "B-")
  phone: varchar("phone", { length: 32 }),                       // Contact telephone number
  avatarKey: varchar("avatarKey", { length: 512 }),              // Filesystem path key for uploaded profile photo
  allergiesJson: text("allergiesJson").notNull(),                // JSON array of verified allergies (e.g. '["Penicillin", "Peanuts"]')
  conditionsJson: text("conditionsJson").notNull(),              // JSON array of chronic conditions (e.g. '["Hypertension"]')
  createdAt: timestamp("createdAt").defaultNow().notNull(),      // Profile creation timestamp
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(), // Profile update timestamp
});

// --- Table 7: Patient Emergency Contacts ---
// Stores emergency contacts reachable during urgent medical distress
export const patientEmergencyContacts = mysqlTable("patientEmergencyContacts", {
  id: int("id").autoincrement().primaryKey(),                    // Unique contact ID
  userId: int("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),        // Linked patient account
  name: varchar("name", { length: 160 }).notNull(),              // Name of emergency contact person
  relationship: varchar("relationship", { length: 80 }).notNull(), // Relationship (e.g. "Spouse", "Parent", "Sibling")
  phone: varchar("phone", { length: 32 }).notNull(),             // Emergency phone number
  createdAt: timestamp("createdAt").defaultNow().notNull(),      // Record timestamp
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// --- Table 8: Patient Medicine Cabinet ---
// Virtual medicine tracker for scheduled dosages, reminders, and inventory
export const patientMedicines = mysqlTable("patientMedicines", {
  id: int("id").autoincrement().primaryKey(),                    // Unique medication entry ID
  userId: int("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),        // Linked patient account
  name: varchar("name", { length: 200 }).notNull(),              // Medication brand or generic name (e.g. "Metformin")
  dosage: varchar("dosage", { length: 120 }).notNull(),          // Dosage strength (e.g. "500 mg")
  frequency: varchar("frequency", { length: 120 }).notNull(),    // Daily frequency (e.g. "Twice daily after meals")
  schedule: varchar("schedule", { length: 120 }).notNull(),      // Time schedule (e.g. "Morning & Evening")
  startDate: varchar("startDate", { length: 10 }),               // Regimen start date (YYYY-MM-DD)
  endDate: varchar("endDate", { length: 10 }),                   // Regimen completion date (YYYY-MM-DD)
  quantity: int("quantity"),                                     // Number of pills/doses remaining in inventory
  expiry: varchar("expiry", { length: 10 }),                     // Package expiration date
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// --- Table 9: Patient Appointments ---
// Records medical consultations booked with Mumbai specialist doctors
export const patientAppointments = mysqlTable("patientAppointments", {
  id: int("id").autoincrement().primaryKey(),                    // Unique appointment ID
  userId: int("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),        // Patient booking the consultation
  doctorId: varchar("doctorId", { length: 80 }).notNull(),       // Doctor ID chosen from mock directory
  reason: text("reason"),                                        // Patient's chief medical complaint for the visit
  scheduledAt: timestamp("scheduledAt").notNull(),               // Scheduled appointment date and time
  status: mysqlEnum("status", ["Requested", "Pending", "Confirmed", "Completed", "Cancelled"])
    .default("Requested")
    .notNull(),                                                  // Current clinical appointment status
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// --- Table 10: Prescriptions ---
// Official medical prescriptions written and signed by doctors
export const patientPrescriptions = mysqlTable("patientPrescriptions", {
  id: int("id").autoincrement().primaryKey(),                    // Unique prescription ID
  userId: int("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),        // Patient for whom prescription was written
  doctorId: varchar("doctorId", { length: 80 }).notNull(),       // Doctor who authorized the prescription
  issuedAt: timestamp("issuedAt").defaultNow().notNull(),        // Date prescription was signed and issued
  status: mysqlEnum("status", ["UNSIGNED / CONTROLLED WORKSPACE", "SIGNED — CONTROLLED STATE"])
    .default("UNSIGNED / CONTROLLED WORKSPACE")
    .notNull(),                                                  // Signing status of the medical document
  clinicalNotes: text("clinicalNotes"),                          // Doctor's diagnosis and medical notes
  integrityReference: varchar("integrityReference", { length: 255 }), // Cryptographic digital signature hash
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// --- Table 11: Prescription Line Items ---
// Individual medications prescribed within an overarching prescription document
export const patientPrescriptionItems = mysqlTable("patientPrescriptionItems", {
  id: int("id").autoincrement().primaryKey(),                    // Unique line-item ID
  prescriptionId: int("prescriptionId").notNull(),               // Foreign key linking to parent prescription
  name: varchar("name", { length: 200 }).notNull(),              // Prescribed medicine name
  dosage: varchar("dosage", { length: 120 }).notNull(),          // Prescribed dosage (e.g. "10mg")
  instructions: text("instructions").notNull(),                  // Doctor's specific usage instructions
}, (table) => [
  foreignKey({
    columns: [table.prescriptionId],
    foreignColumns: [patientPrescriptions.id],
    name: "rx_item_prescription_fk",
  }).onDelete("cascade"),                                        // Automatically deletes items if parent prescription is removed
]);

// --- Table 12: Real-time Patient Events ---
// Event stream for instant frontend UI updates via Server-Sent Events (SSE)
export const patientEvents = mysqlTable("patientEvents", {
  id: int("id").autoincrement().primaryKey(),                    // Unique event ID
  userId: int("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),        // Target patient receiving notification
  type: mysqlEnum("type", [
    "PROFILE_UPDATED",
    "APPOINTMENT_UPDATED",
    "PRESCRIPTION_CREATED",
    "ASSESSMENT_COMPLETED",
    "MEDICINE_UPDATED",
  ]).notNull(),                                                  // Event category triggering UI refetch
  entityId: varchar("entityId", { length: 80 }),                 // Affected ID (e.g. appointment ID or prescription ID)
  createdAt: timestamp("createdAt").defaultNow().notNull(),      // Event timestamp
});

// --- Table 13: Real-time Doctor Events ---
// Real-time events delivered to the doctor's workstation when appointments change
export const doctorEvents = mysqlTable("doctorEvents", {
  id: int("id").autoincrement().primaryKey(),                    // Unique doctor event ID
  doctorId: varchar("doctorId", { length: 80 }).notNull(),       // Doctor receiving notification
  patientUserId: int("patientUserId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),        // Related patient
  type: mysqlEnum("type", ["APPOINTMENT_UPDATED", "ASSESSMENT_COMPLETED", "PATIENT_RELATED_UPDATE"]).notNull(),
  entityId: varchar("entityId", { length: 80 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// --- Type Exports for Application Use ---
export type PatientCredential = typeof patientCredentials.$inferSelect;
export type SyntheticDoctorCredential = typeof syntheticDoctorCredentials.$inferSelect;
export type PatientProfile = typeof patientProfiles.$inferSelect;
export type PatientEmergencyContact = typeof patientEmergencyContacts.$inferSelect;
export type PatientMedicine = typeof patientMedicines.$inferSelect;
export type PatientAppointment = typeof patientAppointments.$inferSelect;
export type PatientPrescription = typeof patientPrescriptions.$inferSelect;
export type PatientPrescriptionItem = typeof patientPrescriptionItems.$inferSelect;
export type PatientEvent = typeof patientEvents.$inferSelect;
export type DoctorEvent = typeof doctorEvents.$inferSelect;
