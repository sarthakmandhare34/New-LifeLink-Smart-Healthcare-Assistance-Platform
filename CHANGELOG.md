# Changelog

All notable changes to the LifeLink Smart Healthcare Assistance Platform will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2026-09-11

### Added & Refined
- **Development Runtime & Port Orchestration**:
  - Re-architected development runtime into two independent managed processes: Vite Frontend on preferred port `5173` (fallback range: `5173–5177`) and Express + tRPC Backend on preferred port `4000` (fallback range: `4000–4004`), orchestrated seamlessly via `scripts/dev.mjs`.
  - Configured Vite development proxy to seamlessly route `/api/trpc` and `/uploads` requests directly to the active Express backend port.
  - Decoupled Drizzle Studio from `npm run dev` to maintain a lean runtime (retained via explicit `npm run db:studio` command).
- **Batch 17 — Responsive Design & WCAG 2.1 AA Accessibility Implementation**:
  - Fixed responsive CSS layout grid constraints (`.responsive-list-grid` converted to `minmax(min(100%, 280px), 1fr)`) ensuring card wrapping across 320px mobile to 1920px widescreen viewports.
  - Added explicit HTML form element `<label>` associations and `aria-label` screen reader attributes across all Patient and Doctor workspace controls.
  - Enhanced visual accessibility for modal dialogs and integrated active countdown feedback into 5-minute patient auto-logout handlers.
- **Google OAuth 2.0 Integration & Resilient Patient Auth Architecture**:
  - Implemented one-click Google Sign-In and Registration exclusively for the Patient Portal (`/login` and `/register`) with authentic 4-color Google branding.
  - Enforced strict role sandboxing: OAuth authentication is strictly limited to the patient domain (`resolveProviderPatient`), completely preventing third-party escalation into clinician accounts.
  - Added resilient authorization start URL resolution with automatic fallback to relative `/api/auth/google` endpoints and React Query retries (`retry: 3, staleTime: 10000`) to eliminate Vite dev proxy startup race conditions.
  - Converted `ENV` configuration in `backend/_core/env.ts` to dynamic getters with top-level `dotenv/config`, preventing ESM module hoisting from evaluating empty environment variables.
  - Resolved local `ERR_SSL_PROTOCOL_ERROR` by validating `http://localhost:5173` origins for local development while preserving strict HTTPS checks in production.
- **Unified 2-Column Clinical Split Layout Across All Entry Portals**:
  - Standardized all 4 authentication and credential views (`/login`, `/register`, `/doctor/login`, `/doctor/reset`) to match the clinical 2-column split UI layout from `/doctor/setup`.
  - Added ambient ECG monitor wave background art, left branding showcase panel, responsive aqua card container, and 3 security trust badges.
- **Brand Identity & Favicon Standardization**:
  - Replaced default Vite lightning favicon with the official LifeLink heart-cross brand mark across `frontend/index.html`, `public/favicon.ico`, and `public/favicon.png`.
- **Windows Dev Runner Batch Termination Fix**:
  - Configured child process stdio options (`stdio: ["ignore", "inherit", "inherit"]`) in `scripts/dev.mjs` to eliminate Windows CMD "Terminate batch job (Y/N)?" prompt hangs on server reload.
- **Clinician Work Email & Password Standardization**:
  - Enforced strict `@lifelink.com` clinical work emails across the Doctor Portal (`cardiology@lifelink.com`, `orthopedics@lifelink.com`, etc.), completely removing informal usernames and aliases.
  - Updated Doctor Login (`/doctor/login`) with strict `type="email"` client-side constraints and `z.string().email()` backend Zod validation.
  - Established a clean, memorable, uniform credential schema: official email (`<specialty>@lifelink.com`) and matching password (`<specialty-prefix>@lifelink`).
- **Clinician Setup Portal Redesign & Resilient Provisioning (`/doctor/setup`)**:
  - Redesigned `/doctor/setup` to make the individual doctor credential creation form the primary, front-and-center card.
  - Integrated auto-suggest for work emails and passwords upon specialty selection, with full custom editing support and show/hide password toggles.
  - Pre-filled the master provisioning code (`lifelink-controlled-clinician-secret-key-2026`) and removed arbitrary minimum length barriers.
  - Implemented seamless credential refreshing in `backend/auth/doctorAuth.ts` so submitting an existing doctor's setup updates their email and password without throwing conflict errors.
- **Database Maintenance & Synchronization Commands**:
  - Added `npm run db:clear` (`scripts/clear-users.ts`) to atomically wipe all 13 database tables (users, credentials, profiles, appointments, prescriptions, medicines, events, provider identities) for a clean slate.
  - Added `npm run db:sync:doctors` (`scripts/sync-doctors.ts`) to audit the live MySQL database, detect missing specialties, and automatically insert/verify all 12 active doctor accounts.
  - Maintained zero default patient seeding so patient onboarding can be tested manually or via Google OAuth.
- **Batch 18 — Production Readiness & Deployment Safety Audit**:
  - Implemented strict `NODE_ENV=production` truncation protection in `scripts/seed-doctors.ts` to prevent accidental database wiping in production deployments.
  - Enforced mandatory non-empty `JWT_SECRET` verification in `backend/auth/authUtil.ts`, blocking fallback keys in production environments.
  - Verified 100% test suite regression baseline (185 passed, 1 skipped, 0 failed across 33 test files), 0 TypeScript compilation errors, and clean production build.

---

## [1.0.0] - 2026-09-10

### Added
- **Liquid-Glass Design System**: Integrated translucent glassmorphism surfaces (`backdrop-filter: blur(24px) saturate(155%)`), 117° iridescent angled shimmer borders, atmospheric mesh gradients, and WCAG 2.1 AA-compliant Clinical Aqua palette (`#E6F9FC` background, `#9FFBFF` border, `#00C4CC` primary interactive teal, `#102B2D` slate typography).
- **Dual Independent Session Architecture**: Concurrent authentication for patients (`app_session_id`) and medical clinicians (`doctor_session_id`) within the same browser instance without token collisions or cross-tenant contamination.
- **5-Layer Clinical AI Symptom Triage Engine**:
  - **Layer 1 — Biological Consistency Validation**: Zero-overhead deterministic pre-flight filter (`shared/biologicalValidation.ts`) intercepting biological impossibilities (e.g., pregnancy in biological males).
  - **Layer 2 — Deterministic 0ms Emergency Override**: High-priority pre-compiled regex filter scanning for acute life-threatening emergencies (crushing chest pain, severe dyspnea, hematemesis, stroke signs, anaphylaxis, suicidal ideation) routing immediately to Emergency Care (`112`).
  - **Layer 3 — Resilient Google Gemini Flash Cascade**: Structured JSON Schema execution across Google Gemini Flash models (`gemini-3.5-flash-lite`, `gemini-3.5-flash`, `gemini-3.1-flash-lite`, `gemini-3.7-flash`, `gemini-2.5-flash`, `gemini-1.5-flash`).
  - **Layer 4 — Post-Processing Pediatric & Clinical Safeguards**: Enforces strict pediatric specialist routing for patients <18 years, adolescent menstrual reassurance against premature adult pregnancy assumptions, and non-medical input rejection with `ERROR` status.
  - **Layer 5 — Deterministic Offline Fallback**: Guarantees structured, graceful triage recommendations even during upstream API quota exhaustion or network partitions.
- **Dedicated Doctor Workspace**: Complete clinician workspace with real-time consultation queue, patient medical history review, triage findings inspection, and digital prescription authoring.
- **Cryptographic Digital Prescriptions**: Clinician-authored medication items signed with automated SHA-256 cryptographic integrity hashes, synchronized to the patient's Medicine Cabinet in real-time via Server-Sent Events (SSE).
- **Mumbai Specialist Rail Network Directory**: Interactive OpenStreetMap Leaflet mapping across Western, Central, and Harbour railway lines with 12 pre-seeded medical specialist clinics.
- **Single-Port Unified Runtime**: Express API server and Vite frontend dev server bundled on port 3000 with automated port collision scanning (`3001`–`3004`).

### Security & Privacy
- **Automated 5-Minute Inactivity Security**: Client-side activity monitoring across mouse, touch, keyboard, and scroll events; terminates inactive sessions after 300,000ms.
- **Insecure Direct Object Reference (IDOR) Shield**: All queries and mutations strictly enforce session ownership derivation on the server layer (`ctx.user.id` for patients, `ctx.user.openId` for clinicians).
- **Zero In-Memory GPS Persistence**: Patient location coordinates processed strictly in-memory on the client; never persisted to the database or logged on the server.
- **Salted Password Hashing**: Native patient and doctor credentials hashed with bcrypt salt rounds.

---

## [0.8.0] - 2026-08-28

### Added
- Comprehensive Responsive & Accessibility Audit (WCAG 2.1 AA) supporting viewports from 320px mobile to 1920px widescreen.
- Fluid typography and layout scaling utilizing CSS `clamp()` and auto-fit CSS grid primitives.
- Accessible modal dialog primitive (`Popup.tsx`) utilizing React 19 `useId` for screen-reader dialog accessibility.
- Server-Sent Events (SSE) notification stream for live appointment status transitions (`Requested` ➔ `Confirmed` ➔ `Completed`).

---

## [0.5.0] - 2026-08-15

### Added
- Patient intake form and symptom assessment questionnaire.
- Digital Health Passport tracking blood group, emergency contacts, chronic conditions, and known allergies.
- Patient Medicine Cabinet with dosage, frequency, and quantity inventory tracking.
- Pre-seeded 12 Mumbai specialist accounts with default credentials for clinical demonstration.
- Drizzle Studio integration on port 4983 for visual database inspection.

---

## [0.1.0] - 2026-07-20

### Added
- Initial project scaffolding with React 19, TypeScript 5.9, Express 4.21, and Vite 7.
- Relational database schema with 11 core tables in MySQL managed via Drizzle ORM.
- tRPC 11 type-safe RPC boundary connecting frontend client and Express backend.
