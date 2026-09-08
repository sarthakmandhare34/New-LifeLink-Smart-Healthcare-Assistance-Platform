# 02. Database Model & Authentication

## Database Architecture
The platform is backed by a relational MySQL schema defined in `database/schema.ts` using Drizzle ORM.

### Core Tables
1. **`users`**: Core identity table storing user role (`user`, `doctor`, `admin`), `openId`, and `loginMethod`.
2. **`patientCredentials`**: Stores salted and hashed passwords for native email/password patient accounts.
3. **`syntheticDoctorCredentials`**: Pre-seeded clinician login records mapping specialties directly to credentials with secure bcrypt-compatible password hashes.
4. **`patientProfiles`**: Patient demographic data, blood groups, emergency contacts, allergy lists, and medical history.
5. **`patientAppointments`**: Relational appointment entries linked by `userId` and `doctorId`.
6. **`patientAssessments`**: Historical AI symptom triage evaluations.
7. **`patientPrescriptions` & `patientPrescriptionItems`**: Prescriptions authorized during clinician consultations.
8. **`patientEvents` & `doctorEvents`**: Scoped notification events delivered via SSE.

## Authentication Models

### 1. Patient Authentication
* **Native Flow**: Patients register and log in with email and password, verified via `backend/nativePatientAuth.ts`.
* **Google OAuth Flow**: Supports secure single-sign-on callback handling.
* **Session Management**: Uses HTTP-only secure cookie sessions (`appRouter` context extraction).

### 2. Clinician / Doctor Authentication
* **Pre-Seeded Accounts**: All 12 Mumbai specialist doctors are provisioned into the database with pre-configured usernames matching their specialty (e.g., `cardiology`, `gynecology`, `pediatrics`) and default password `demo`.
* **Workspace Isolation**: Clinicians only see appointments assigned to their specific `doctorId`.

### 3. Database Sanitization & Seeding Utility
* Script: `scripts/seed-doctors.ts`
* Execution: `npx tsx scripts/seed-doctors.ts`
* Action: Clears dynamic test patient data (`DELETE FROM users` with cascading constraints) and restores the default synthetic doctor directory.
