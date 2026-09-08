import { foreignKey, int, mysqlEnum, mysqlTable, text, timestamp, unique, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "doctor", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Patient-facing health assessment records. These records are scoped to the
 * signed-in account and only the minimum data used by the assessment flow is kept.
 */
export const patientAssessments = mysqlTable("patientAssessments", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  symptoms: text("symptoms").notNull(),
  age: int("age").notNull(),
  gender: varchar("gender", { length: 32 }).notNull(),
  conditions: text("conditions"),
  duration: varchar("duration", { length: 64 }).notNull(),
  urgency: mysqlEnum("urgency", ["LOW", "MODERATE", "EMERGENCY", "ERROR"]).notNull(),
  reason: text("reason").notNull(),
  specialty: varchar("specialty", { length: 160 }).notNull(),
  guidance: text("guidance").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PatientAssessment = typeof patientAssessments.$inferSelect;
export type InsertPatientAssessment = typeof patientAssessments.$inferInsert;

/** Native patient credentials are stored separately from framework identities. */
export const patientCredentials = mysqlTable("patientCredentials", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  email: varchar("email", { length: 320 }).notNull().unique(),
  passwordHash: varchar("passwordHash", { length: 512 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

/** Synthetic doctor credentials map one stable controlled directory doctor to one login identity. */
export const syntheticDoctorCredentials = mysqlTable("syntheticDoctorCredentials", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  doctorId: varchar("doctorId", { length: 80 }).notNull().unique(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  passwordHash: varchar("passwordHash", { length: 512 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

/** Provider identities are separate from native credentials and are added only after a verified provider callback. */
export const patientProviderIdentities = mysqlTable("patientProviderIdentities", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  provider: mysqlEnum("provider", ["google"]).notNull(),
  subject: varchar("subject", { length: 255 }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [
  unique("provider_subject_unique").on(table.provider, table.subject),
]);

/** Existing Health Passport fields; absent clinical data remains absent rather than fabricated. */
export const patientProfiles = mysqlTable("patientProfiles", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  bloodGroup: varchar("bloodGroup", { length: 12 }),
  phone: varchar("phone", { length: 32 }),
  /** Managed-storage key for an optional patient-selected profile photo; image bytes never enter the database. */
  avatarKey: varchar("avatarKey", { length: 512 }),
  allergiesJson: text("allergiesJson").notNull(),
  conditionsJson: text("conditionsJson").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const patientEmergencyContacts = mysqlTable("patientEmergencyContacts", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 160 }).notNull(),
  relationship: varchar("relationship", { length: 80 }).notNull(),
  phone: varchar("phone", { length: 32 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const patientMedicines = mysqlTable("patientMedicines", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 200 }).notNull(),
  dosage: varchar("dosage", { length: 120 }).notNull(),
  frequency: varchar("frequency", { length: 120 }).notNull(),
  schedule: varchar("schedule", { length: 120 }).notNull(),
  startDate: varchar("startDate", { length: 10 }),
  endDate: varchar("endDate", { length: 10 }),
  quantity: int("quantity"),
  expiry: varchar("expiry", { length: 10 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

/** Appointment records remain real while their referenced doctors remain controlled mock directory entries. */
export const patientAppointments = mysqlTable("patientAppointments", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  doctorId: varchar("doctorId", { length: 80 }).notNull(),
  /** Patient-provided booking context, visible only to the patient and the assigned synthetic doctor. */
  reason: text("reason"),
  scheduledAt: timestamp("scheduledAt").notNull(),
  status: mysqlEnum("status", ["Requested", "Pending", "Confirmed", "Completed", "Cancelled"])
    .default("Requested")
    .notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const patientPrescriptions = mysqlTable("patientPrescriptions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  doctorId: varchar("doctorId", { length: 80 }).notNull(),
  issuedAt: timestamp("issuedAt").defaultNow().notNull(),
  status: mysqlEnum("status", ["UNSIGNED / CONTROLLED WORKSPACE", "SIGNED — CONTROLLED STATE"])
    .default("UNSIGNED / CONTROLLED WORKSPACE")
    .notNull(),
  clinicalNotes: text("clinicalNotes"),
  integrityReference: varchar("integrityReference", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const patientPrescriptionItems = mysqlTable("patientPrescriptionItems", {
  id: int("id").autoincrement().primaryKey(),
  prescriptionId: int("prescriptionId").notNull(),
  name: varchar("name", { length: 200 }).notNull(),
  dosage: varchar("dosage", { length: 120 }).notNull(),
  instructions: text("instructions").notNull(),
}, (table) => [
  foreignKey({
    columns: [table.prescriptionId],
    foreignColumns: [patientPrescriptions.id],
    name: "rx_item_prescription_fk",
  }).onDelete("cascade"),
]);

/** Event records are server-created and patient-scoped for authenticated realtime delivery. */
export const patientEvents = mysqlTable("patientEvents", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  type: mysqlEnum("type", [
    "PROFILE_UPDATED",
    "APPOINTMENT_UPDATED",
    "PRESCRIPTION_CREATED",
    "ASSESSMENT_COMPLETED",
    "MEDICINE_UPDATED",
  ]).notNull(),
  entityId: varchar("entityId", { length: 80 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

/**
 * Delivery records for the existing realtime layer when a controlled synthetic
 * doctor needs to refetch an appointment assigned to that doctor. The payload
 * remains notification-only; patient health data is never copied into events.
 */
export const doctorEvents = mysqlTable("doctorEvents", {
  id: int("id").autoincrement().primaryKey(),
  doctorId: varchar("doctorId", { length: 80 }).notNull(),
  patientUserId: int("patientUserId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  type: mysqlEnum("type", ["APPOINTMENT_UPDATED", "ASSESSMENT_COMPLETED", "PATIENT_RELATED_UPDATE"]).notNull(),
  entityId: varchar("entityId", { length: 80 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

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
