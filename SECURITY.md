# Security Policy — LifeLink Smart Healthcare Assistance Platform

## 1. Supported Versions

We provide security updates and patches for the following versions of the LifeLink platform:

| Version | Supported          | Status |
| :--- | :---: | :--- |
| **1.1.x** | :white_check_mark: | Active production release |
| **1.0.x** | :white_check_mark: | Supported maintenance release |
| **< 1.0** | :x:                | End of life (development milestones) |

---

## 2. Reporting a Vulnerability

As a healthcare-focused platform dealing with medical symptoms, clinical triage, and clinician interactions, system integrity and data confidentiality are of paramount importance.

If you identify a security vulnerability, please disclose it responsibly:

1. **Do NOT open a public GitHub issue** or post details on social media.
2. **Submit a confidential security report** directly to the project lead at **`sarthakmandhare34@gmail.com`** with the subject line: `[SECURITY] LifeLink Vulnerability Report`.
3. **Include the following information**:
   - Detailed description of the vulnerability and attack vector.
   - Exact steps or proof-of-concept (PoC) scripts to reproduce the issue.
   - Affected files, API endpoints, or user roles (`patient` vs `doctor`).
   - Assessment of potential impact (e.g., unauthorized data access, privilege escalation, denial of service).
4. **Response Timeline**:
   - **Initial Acknowledgement**: Within 48 hours.
   - **Status & Remediation Assessment**: Within 5 business days.
   - **Fix Deployment & Advisory**: Prioritized based on CVSS severity.

---

## 3. Core Architectural Security Controls

### 3.1. Dual-Session Cookie Isolation
LifeLink enforces strict cryptographic separation between patient and clinician contexts within the same browser:
- **Patient Session**: Issued as `app_session_id` (`httpOnly: true`, `sameSite: "lax"`, `secure` in production).
- **Doctor Session**: Issued as `doctor_session_id` (`httpOnly: true`, `sameSite: "lax"`, `secure` in production).
- Each tRPC procedure independently verifies the corresponding session token in `backend/_core/context.ts`, preventing session token confusion and cross-role privilege leakage.

### 3.2. Automated 5-Minute Inactivity Session Termination
- Client-side monitoring listens to active user input events (`mousemove`, `keydown`, `mousedown`, `touchstart`, `scroll`).
- An idle duration of 300,000 ms (5 minutes) triggers automated session invalidation across both patient and doctor workspaces.
- Local session tokens are destroyed, the active tRPC logout mutation is invoked on the backend, and the user is redirected to the login view with an alert notice, preventing unauthorized physical access to unattended terminals in hospital environments.

### 3.3. Insecure Direct Object Reference (IDOR) Mitigation
- All database queries and mutations executed under `protectedProcedure` derive the target patient ID strictly from the verified session payload (`ctx.user.id`).
- All clinician actions executed under `doctorProcedure` derive the clinician's identity strictly from `ctx.user.openId`.
- Access to patient records and medical passport data requires an active, verified appointment linking the patient to the requesting clinician. Client-provided user IDs are strictly rejected.

### 3.4. Multi-Layer Clinical AI Safety & Hallucination Prevention
To prevent medical hallucinations, dangerous clinical advice, or AI prompt injection:
1. **Layer 1 — Biological Consistency**: Validates symptom inputs against biological gender invariants prior to model evaluation.
2. **Layer 2 — 0ms Deterministic Regex Overrides**: Life-threatening conditions (chest pain, stroke symptoms, acute respiratory distress, anaphylaxis, suicidal ideation) completely bypass LLM inference and immediately trigger emergency routing to `112`.
3. **Layer 3 — Server-Side LLM Execution**: Google Gemini Flash API calls are strictly executed on the backend with JSON Schema constraints. API keys are never exposed to the client.
4. **Layer 4 — Pediatric & Adolescent Safeguards**: Patients <18 years are strictly routed to pediatric specialists, and non-medical input queries return structured `ERROR` statuses.
5. **Layer 5 — Offline Deterministic Fallback**: In the event of network partition or upstream AI quota exhaustion, the engine falls back to pre-defined clinical safety recommendations.

### 3.5. Cryptographic Digital Prescription Integrity
- When a clinician issues a prescription, the server generates a SHA-256 hash incorporating the issuing doctor ID, patient ID, canonicalized medication list, and authorization timestamp.
- The resulting `integrityReference` hash is stored alongside the prescription, ensuring tamper evidence across the complete prescription lifecycle.

### 3.6. Privacy-Bounded Geospatial Architecture
- The Mumbai Specialist Rail Network Finder operates completely in-memory on the client browser.
- Patient GPS coordinates are never transmitted to the backend server, never written to log files, and never stored in the database.

### 3.7. Password Hashing & Secret Management
- Passwords for native patient accounts and synthetic doctor credentials are salted and hashed using standard bcrypt algorithms.
- All secrets (`JWT_SECRET`, `GEMINI_API_KEY`, `DATABASE_URL`) are read strictly from environment variables and must never be committed to version control.
- In production (`NODE_ENV=production`), the application strictly throws an error if `JWT_SECRET` is omitted or empty, preventing fallback secret keys.
- Database provisioning scripts (`scripts/seed-doctors.ts`) enforce strict `NODE_ENV=production` guards, preventing destructive table truncations in production database environments.

### 3.8. Google OAuth 2.0 Security & Patient-Clinician Role Separation
- **Cryptographic State & Nonce Protection**: During OAuth initialization, a cryptographically random 32-byte state and nonce pair is signed into a secure, `httpOnly`, short-lived (10-minute) cookie (`lifelink_google_oauth_state`). On callback, the state is compared using constant-time evaluation (`crypto.timingSafeEqual`) to prevent Cross-Site Request Forgery (CSRF) and token replay attacks.
- **Strict Role Sandboxing**: Google OAuth authentication is strictly limited to the patient domain (`resolveProviderPatient`). Clinician accounts cannot authenticate or be provisioned via Google OAuth, safeguarding medical governance and preventing unauthorized access to the Doctor Workspace.
- **Account Hijacking Mitigation**: If a Google OAuth account attempts to authenticate with an email that is already registered natively as a patient or doctor, the system detects the collision (`ProviderAccountConflictError`) and halts authorization, prompting the user to sign in using their established credentials.
- **Strict Origin Validation**: OAuth callback URLs are validated via `googleAvailabilityFromConfig` to strictly enforce HTTPS in production environments while securely permitting loopback development (`http://localhost:5173`).

