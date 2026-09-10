# 02. Database Model, Authentication & Session Security

## 1. Relational Database Schema (`database/schema.ts`)

LifeLink utilizes a structured MySQL relational schema managed via Drizzle ORM. The schema comprises 11 core tables with explicit foreign key cascades to maintain referential integrity.

### Table Specifications

| Table | Primary Key | Foreign Keys | Key Columns & Responsibilities |
| :--- | :--- | :--- | :--- |
| **`users`** | `id` (int auto-inc) | None | `openId` (unique), `name`, `email`, `loginMethod` (`native-patient`, `google`, `synthetic-doctor`), `role` (`user`, `doctor`, `admin`), `createdAt`, `updatedAt`, `lastSignedIn`. |
| **`patientCredentials`** | `id` (int auto-inc) | `userId` ➔ `users.id` (1:1, unique) | `email` (unique), `passwordHash` (bcrypt-compatible salted hash for native patient accounts). |
| **`syntheticDoctorCredentials`** | `id` (int auto-inc) | `userId` ➔ `users.id` (1:1, unique) | `doctorId` (unique, e.g. `cardiology`), `email` (unique), `passwordHash`. |
| **`patientProviderIdentities`** | `id` (int auto-inc) | `userId` ➔ `users.id` | `provider` (`google`), `providerUserId`, `providerEmail` for federated single sign-on. |
| **`patientProfiles`** | `id` (int auto-inc) | `userId` ➔ `users.id` (1:1, unique) | `bloodGroup`, `phone`, `avatarKey`, `allergiesJson` (JSON array), `conditionsJson` (JSON array). |
| **`patientEmergencyContacts`** | `id` (int auto-inc) | `userId` ➔ `users.id` | `name`, `relationship`, `phone` for trusted emergency contact network. |
| **`patientMedicines`** | `id` (int auto-inc) | `userId` ➔ `users.id` | `name`, `dosage`, `frequency`, `schedule`, `quantity` for patient medicine cabinet tracking. |
| **`patientAssessments`** | `id` (int auto-inc) | `userId` ➔ `users.id` | `symptoms`, `age`, `gender`, `duration`, `urgency` (`LOW`, `MODERATE`, `EMERGENCY`, `ERROR`), `reason`, `specialty`, `guidance`. |
| **`patientAppointments`** | `id` (int auto-inc) | `userId` ➔ `users.id` | `doctorId`, `scheduledAt`, `status` (`Requested`, `Pending`, `Confirmed`, `Completed`, `Cancelled`), `reason`. |
| **`patientPrescriptions`** | `id` (int auto-inc) | `userId` ➔ `users.id` | `doctorId`, `issuedAt`, `status` (`UNSIGNED`, `SIGNED`), `clinicalNotes`, `integrityReference` (SHA-256 hash). |
| **`patientPrescriptionItems`** | `id` (int auto-inc) | `prescriptionId` ➔ `patientPrescriptions.id` | `name`, `dosage`, `instructions` for granular digital prescription items. |
| **`patientEvents` & `doctorEvents`** | `id` (int auto-inc) | `userId` ➔ `users.id` | `type` (`APPOINTMENT_UPDATED`, `ASSESSMENT_COMPLETED`, `PRESCRIPTION_CREATED`), `entityId` for SSE push dispatch. |

---

## 2. Authentication & Session Architecture

LifeLink features a **Dual Independent Session Architecture** supporting concurrent patient and clinician sessions without token collisions.

```text
Browser Request
      │
      ├── Cookie: "app_session_id" ────► Decoded by backend/_core/context.ts ──► ctx.user (Patient Session)
      │
      └── Cookie: "doctor_session_id" ──► Decoded by backend/_core/context.ts ──► ctx.doctor (Clinician Session)
```

### 1. Dual Independent Session Cookies
* **Patient Cookie**: `COOKIE_NAME = "app_session_id"`
  - Issued upon registration or login at `/login`.
  - Configured with `httpOnly: true`, `sameSite: "lax"`, and `secure` in production.
* **Clinician Cookie**: `DOCTOR_COOKIE_NAME = "doctor_session_id"`
  - Issued upon clinician login at `/doctor/login` or via `/workspace`.
  - Enables clinicians to test doctor workflows while simultaneously maintaining an active patient session in the same browser.

### 2. Native Patient Authentication Flow
* Handled in `backend/auth/nativePatientAuth.ts`.
* Passwords are encrypted using SHA-256 with cryptographically generated per-user salts.
* Registration automatically initializes a linked record in `patientCredentials` and an empty `patientProfiles` entry.

### 3. Google OAuth 2.0 Flow
* Server-side callback verification in `backend/auth/providerAuth.ts`.
* Uses `__Host-oauth_state` cookie containing base64-encoded state with a cryptographic CSRF nonce.

### 4. Synthetic Clinician Provisioning
* 12 pre-seeded Mumbai medical specialist accounts provisioned via `scripts/seed-doctors.ts`.
* Clinician credentials map directly to `syntheticDoctorCredentials` with fixed specialty usernames and default password `demo`.

---

## 3. 5-Minute Inactivity Session Expiration

To comply with healthcare workstation security best practices:
1. **Client Tracking**: `frontend/src/hooks/patientInactivity.ts` binds listeners to `mousemove`, `keydown`, `mousedown`, `touchstart`, and `scroll`.
2. **Timer Reset**: Any user activity resets a 300,000 ms (5-minute) timeout.
3. **Session Invalidation**: If no activity occurs for 5 minutes, the timer invokes the tRPC logout mutation, destroys local cookies, renders a toast alert, and redirects the user to `/login`.

---

## 4. Insecure Direct Object Reference (IDOR) Protection

* **Protected Patient Endpoints (`protectedProcedure`)**: Strict server-side derivation guarantees that queries (`patientDashboard.summary`, `patientMedicines.list`, `patientProfile.get`) automatically filter by `where(eq(schema.userId, ctx.user.id))`. Client-provided user IDs are rejected.
* **Doctor Workspace Endpoints (`doctorProcedure`)**: Clinician procedures derive the authenticated doctor ID exclusively from `ctx.user.openId`. Doctors can only view patient details and assessments if an active appointment links that specific patient to the clinician's `doctorId`.
