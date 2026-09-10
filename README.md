# LifeLink — Smart Healthcare Assistance Platform

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![React 19](https://img.shields.io/badge/React-19.2.1-61dafb.svg?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9.3-3178c6.svg?logo=typescript)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-7.1.7-646cff.svg?logo=vite)](https://vitejs.dev/)
[![Tailwind CSS v4](https://img.shields.io/badge/Tailwind-v4.1.14-38bdf8.svg?logo=tailwindcss)](https://tailwindcss.com/)
[![tRPC v11](https://img.shields.io/badge/tRPC-11.6.0-2596be.svg?logo=trpc)](https://trpc.io/)
[![Drizzle ORM](https://img.shields.io/badge/Drizzle%20ORM-0.44.5-C5F74F.svg?logo=drizzle)](https://orm.drizzle.team/)
[![MySQL](https://img.shields.io/badge/MySQL-8.0-4479A1.svg?logo=mysql)](https://www.mysql.com/)
[![Google Gemini AI](https://img.shields.io/badge/Google%20Gemini-2.5%20%2F%203.5%20Flash-4285F4.svg?logo=google)](https://ai.google.dev/)

LifeLink is an enterprise-grade, full-stack patient healthcare-assistance platform and clinician workspace. It integrates patient-owned digital health records, a multi-layer AI-assisted symptom triage engine with deterministic safety overrides, an interactive Mumbai Specialist Rail Network Finder, a live appointment lifecycle management system, digital prescriptions backed by SHA-256 cryptographic integrity verification, real-time Server-Sent Events (SSE), and a dedicated Doctor Portal supporting simultaneous multi-session clinical operations.

---

## 🌟 Key Highlights & Core Capabilities

### 1. Dual Independent Session Architecture
* **Simultaneous Login**: Allows clinicians and patients to operate concurrently within the same browser instance without credential collision.
* **Separated Cookie Context**: Employs distinct, HTTP-only secure cookie tokens: `app_session_id` (Patient) and `doctor_session_id` (Clinician).
* **Role-Guarded tRPC Middleware**: Strictly isolates patient endpoints (`protectedProcedure`) and clinical procedures (`doctorProcedure`), eliminating Insecure Direct Object Reference (IDOR) risks.

### 2. Multi-Layer Clinical AI Symptom Triage Engine
* **Layer 1 — Biological Validation**: Deterministic pre-flight filters (`shared/biologicalValidation.ts`) prevent biologically contradictory symptom evaluations (e.g., pregnancy or uterine disorders in biological males) with 0ms overhead.
* **Layer 2 — Deterministic Emergency Override**: High-priority regex patterns instantly intercept acute critical red-flags (crushing chest pain, severe dyspnea, hematemesis, stroke signs, anaphylaxis, suicidal ideation) and mandate immediate emergency care (`112`) with 0ms latency, completely bypassing LLM round-trips.
* **Layer 3 — Resilient Gemini Flash Cascade**: Ultra-low-latency (~1.2s) server-side execution utilizing a structured JSON schema across Google Gemini Flash models (`gemini-3.5-flash-lite`, `gemini-3.5-flash`, `gemini-3.1-flash-lite`, `gemini-3.7-flash`, etc.).
* **Layer 4 — Post-Processing Pediatric & Clinical Safeguards**: Enforces strict pediatric routing (<18 years routed to Pediatrics), adolescent menstrual reassurance against premature adult pregnancy assumptions, and non-medical query rejection (`ERROR` status with dedicated alert badge UI).
* **Layer 5 — Deterministic Offline Fallback**: Guarantees graceful, non-crashing triage recommendations even during complete network partitions or upstream quota limits.

### 3. Dedicated Doctor Workspace & Clinical State Machine
* **12 Pre-Seeded Mumbai Specialist Profiles**: Ready-to-use clinical accounts spanning Cardiology, Neurology, Pediatrics, Orthopedics, Gynecology, Dermatology, Oncology, Psychiatry, and more.
* **Realtime Appointment State Machine**: Transitions seamlessly from `Requested` ➔ `Confirmed` ➔ `Completed` / `Cancelled`.
* **Cryptographic Digital Prescriptions**: Clinicians author medication line-items and sign prescriptions with automated SHA-256 integrity hashing, automatically synchronizing into the patient's Medicine Cabinet via Server-Sent Events (SSE).
* **Clinical Consultation Notes**: Direct review of patient medical history, past triage evaluations, known allergies, ongoing medications, and emergency contacts.

### 4. Patient Portal & Digital Health Passport
* **Health Passport**: Encrypted, patient-owned demographic profile, blood group registry, chronic conditions, and emergency contact network.
* **Medicine Cabinet**: Complete schedule manager tracking dosages, frequencies, intervals, and inventory quantities.
* **Mumbai Specialist Rail Network Locator**: Integrated OpenStreetMap Leaflet mapping across Western, Central, and Harbour railway corridors with zero client-side API key leakage.
* **SOS & Emergency Workflow**: Privacy-bounded emergency dialer (`112`) and pre-filled emergency SMS drafting requiring explicit user confirmation.

### 5. Automated 5-Minute Inactivity Security
* Client-side activity monitoring across all user inputs (`mousemove`, `keydown`, `mousedown`, `touchstart`, `scroll`).
* Automatically expires stale sessions after 5 minutes of inactivity across both Patient and Doctor portals, preventing unauthorized access in clinical environments.

### 6. Hybrid Design System: Liquid-Glass & Clinical Aqua
* **Liquid-Glass Aesthetic**: Translucent glassmorphism (`backdrop-filter: blur(24px) saturate(155%)`), 117° iridescent borders, multi-stop atmospheric mesh gradients, and light sheen highlights.
* **Clinical Aqua Palette**: High-contrast, WCAG 2.1 AA-compliant color palette (`#E6F9FC` surfaces, `#9FFBFF` borders, `#00C4CC` primary interactive teal, `#102B2D` slate typography) engineered for readability in medical contexts.
* **Accessibility**: Fully keyboard-navigable (`Tab`, `Enter`, `Escape`), focus rings, fluid `clamp()` responsive layouts (320px mobile to 1920px widescreen).

---

## 🏗️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend Framework** | [React 19.2](https://react.dev/), [TypeScript 5.9](https://www.typescriptlang.org/), [Vite 7.1](https://vitejs.dev/) |
| **Routing & Navigation** | [React Router 7](https://reactrouter.com/) |
| **Design & UI Primitives**| [Tailwind CSS v4](https://tailwindcss.com/), Radix UI, Framer Motion, Lucide Icons |
| **State & API Client** | [tRPC 11](https://trpc.io/), [TanStack React Query v5](https://tanstack.com/query) |
| **Backend Runtime** | [Node.js](https://nodejs.org/) (ES Modules), [Express 4.21](https://expressjs.com/) |
| **API Architecture** | Type-safe tRPC Procedures (Public, Protected, Doctor), Server-Sent Events (SSE) |
| **Database & ORM** | [MySQL 8.x](https://www.mysql.com/), [Drizzle ORM 0.44](https://orm.drizzle.team/), Drizzle Kit |
| **Authentication** | Dual Signed Session JWTs, Password Hashing, Google OAuth 2.0 (state/nonce validation) |
| **AI Decision Support** | [Google Gemini Flash API](https://ai.google.dev/) (`@google/genai` REST) with JSON Schema |
| **Maps & Location** | [Leaflet](https://leafletjs.com/), React-Leaflet, OpenStreetMap (Privacy-Bounded) |
| **Quality & Testing** | [Vitest 2.1](https://vitest.dev/), Testing Library, TypeScript Compiler (`tsc`) |

---

## 📁 Repository Structure

```text
LifeLink-Smart-Healthcare-Assistance-Platform/
├── frontend/                     # Modern React 19 single-page application
│   ├── public/                   # Public assets, brand logos, favicons
│   │   └── assets/branding/      # LifeLink brand mark & atmospheric lockups
│   └── src/
│       ├── _core/hooks/          # Session authentication & React hooks
│       ├── components/           # Reusable UI primitives & layout shells
│       │   ├── brand/            # LifeLink vectorized SVG branding
│       │   ├── layout/           # AppShell (Patient) & DoctorAppShell (Clinician)
│       │   └── ui/               # Card (Liquid-Glass), Button, Input, Popup, Badge
│       ├── context/              # ThemeContext (Dark / Light liquid-glass tokens)
│       ├── features/
│       │   ├── entry/            # Login, Register, WorkspaceSelector (Portal Gate)
│       │   ├── patient/          # Dashboard, Assessment, Specialists, Medicines,
│       │   │                     # Appointments, HealthPassport, Prescriptions, Emergency
│       │   └── doctor/           # Dashboard, Appointments, Patients, Consultations,
│       │                         # Prescriptions, Setup, Profile, Settings
│       ├── hooks/                # Inactivity timers, SSE patient/doctor listeners
│       ├── lib/                  # tRPC client instance, class merging utilities
│       ├── index.css             # Liquid-glass tokens, atmospheric mesh, responsive rules
│       └── main.tsx              # Application entry point & React root
│
├── backend/                      # Express application & tRPC backend
│   ├── _core/                    # Server bootstrap, cookies, env config, tRPC context
│   ├── ai/                       # AI Health Assessment service & safety guards
│   ├── auth/                     # Native auth, doctor auth, OAuth, password hashing
│   ├── discovery/                # Controlled Mumbai specialist mock directory
│   ├── realtime/                 # EventBus & SSE notification streams
│   ├── routers/                  # Modular tRPC feature routers (patient.ts, doctor.ts)
│   ├── db.ts                     # Database query layer & Drizzle SQL helpers
│   ├── routers.ts                # Master tRPC appRouter definition
│   ├── storage.ts                # Cloud S3 profile asset storage adapter
│   └── syntheticDoctor.ts        # Synthetic doctor registry & helpers
│
├── database/                     # Relational persistence layer
│   ├── schema.ts                 # Drizzle MySQL schema (11 core tables + relations)
│   ├── drizzle.config.ts         # Drizzle Kit migration & studio configuration
│   └── migrations/               # Versioned SQL migration history
│
├── shared/                       # Cross-boundary type contracts & constants
│   ├── biologicalValidation.ts   # Deterministic gender/symptom validation rules
│   ├── const.ts                  # Session cookie names, timeout limits, auth constants
│   ├── mumbaiRailNetwork.ts      # Mumbai Suburban rail line directory (Central/Harbour/Western)
│   ├── mumbaiStationCoordinates.ts # Geospatial coordinates for Mumbai stations
│   └── types.ts                  # Shared data models & TypeScript schemas
│
├── scripts/                      # Operational utilities & runners
│   ├── dev.mjs                   # Unified development runner (Express + Vite on port 3000)
│   ├── init-db.ts                # Idempotent MySQL database initialisation
│   └── seed-doctors.ts           # Cleans test users & provisions 12 Mumbai specialist accounts
│
├── implementation-reports/       # Architectural specifications & batch audit logs
│   ├── 01-system-architecture.md
│   ├── 02-database-and-auth.md
│   ├── 03-ai-assessment-and-safety.md
│   ├── 04-doctor-portal-and-consultation.md
│   ├── 05-local-development-and-ports.md
│   └── batch-17-responsive-accessibility-ui-audit.md
│
├── CONTRIBUTORS.md               # Maintainer credits & contribution standards
├── SYSTEM_DIAGRAMS.md            # Complete Mermaid ER, Class, and Sequence diagrams
└── package.json                  # Root dependencies, scripts, and package metadata
```

---

## ⚙️ Quick Start & Local Setup

### Prerequisites
* **Node.js**: v22.0.0 or higher
* **npm**: v10+ (or **pnpm** v10+)
* **MySQL Database**: MySQL 8.0+ running locally or in Docker

### Step 1: Clone Repository
```powershell
git clone https://github.com/sarthakmandhare34/New-LifeLink-Smart-Healthcare-Assistance-Platform.git
cd New-LifeLink-Smart-Healthcare-Assistance-Platform
npm install
```

### Step 2: Configure Environment Variables
Create a `.env` file in the project root:
```env
# Database Connection
DATABASE_URL="mysql://root:password@localhost:3306/lifelink"

# Session Security
JWT_SECRET="your-super-secret-jwt-key-min-32-characters"

# AI Decision Support (Server-Side Only)
GEMINI_API_KEY="your-google-gemini-api-key"

# Optional: Google OAuth 2.0 Credentials
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""

# Server Port (Default: 3000)
PORT=3000
```

### Step 3: Initialize Database Schema
```powershell
# 1. Create the MySQL database
npx tsx scripts/init-db.ts

# 2. Push Drizzle schema & generate migrations
npm run db:push

# 3. Seed default Mumbai specialist doctor accounts
npx tsx scripts/seed-doctors.ts
```

### Step 4: Launch Local Development Server
```powershell
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.

---

## 🩺 Pre-Seeded Doctor Accounts

For development and demonstration, the system comes pre-configured with 12 Mumbai specialist accounts. You can log into any specialist at `/doctor/login` or via the **Workspace Selector** (`/workspace`):

| Specialty | Clinician Name | Username / Email | Password | Locality / Station | Rail Corridor |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Cardiology** | Dr. Rajesh Sharma | `cardiology` | `demo` | Dadar | Central & Western |
| **Gynecology** | Dr. Ananya Iyer | `gynecology` | `demo` | Bandra | Western & Harbour |
| **Pediatrics** | Dr. Vikram Patel | `pediatrics` | `demo` | Andheri | Western & Harbour |
| **Orthopedics** | Dr. Suresh Deshmukh | `orthopedics` | `demo` | Thane | Central |
| **Neurology** | Dr. Meera Kulkarni | `neurology` | `demo` | Vashi | Harbour |
| **Dermatology** | Dr. Rohan Gupta | `dermatology` | `demo` | Borivali | Western |
| **Oncology** | Dr. Sunita Rao | `oncology` | `demo` | Parel | Central |
| **Psychiatry** | Dr. Amit Joshi | `psychiatry` | `demo` | Kurla | Central & Harbour |
| **Gastroenterology**| Dr. Priya Nair | `gastroenterology` | `demo` | Ghatkopar | Central |
| **Pulmonology** | Dr. Sandeep Verma | `pulmonology` | `demo` | Kalyan | Central |
| **Ophthalmology** | Dr. Pooja Shah | `ophthalmology` | `demo` | Churchgate | Western |
| **ENT** | Dr. Nitin Patil | `ent` | `demo` | Panvel | Harbour |

---

## 🔌 Port Management & Fallback Behavior

LifeLink features automatic port conflict resolution:

| Service | Default Port | Fallback Behavior |
| :--- | :--- | :--- |
| **Main Application** (Vite + Express) | `3000` | Automatically scans and binds to `3001`–`3004` if busy. |
| **MySQL Database** | `3306` | Controlled via `DATABASE_URL` in `.env` (e.g. `3307`). |
| **Drizzle Studio UI** | `4983` | Automatically increments (`4984`, `4985`, etc.) if busy. |

---

## 📜 Complete Command Reference

| Command | Action |
| :--- | :--- |
| `npm run dev` | Starts the unified Vite + Express development server with live reload and interactive CLI shortcuts. |
| `npm run check` | Executes strict TypeScript compiler verification across frontend and backend (`tsc --noEmit`). |
| `npm test` | Runs the complete unit and integration test suite via Vitest. |
| `npm run build` | Builds the optimized production frontend client and bundles the backend server with esbuild. |
| `npm run start` | Boots the compiled production distribution bundle (`NODE_ENV=production node dist/index.js`). |
| `npm run verify` | Runs TypeScript compilation, full Vitest suite, and production build in a single verification pipeline. |
| `npm run db:push` | Generates schema snapshots and applies migrations to the target MySQL instance. |
| `npm run db:studio` | Launches Drizzle Studio visual database inspector on port `4983`. |

---

## 🔒 Security, Privacy & Compliance Controls

* **Zero GPS Coordinate Storage**: The Mumbai Specialist Locator operates entirely in-memory on the client; precise device coordinates are never saved to the database or logged on the server.
* **User-Confirmed Emergency Triggers**: LifeLink provides one-click triggers for `112` and pre-drafted SOS SMS messages, but never places calls or broadcasts distress messages without explicit patient confirmation.
* **Strict Session IDOR Prevention**: All queries and mutations in `backend/routers/patient.ts` and `backend/routers/doctor.ts` extract user identity strictly from verified server-side session tokens (`ctx.user.id` or `ctx.user.openId`).
* **Cryptographic Prescription Signatures**: Prescriptions include tamper-evident SHA-256 integrity reference hashes linking the issuing clinician, patient ID, medication items, and timestamp.
* **Inactivity Auto-Logout**: Hardens clinical terminals against unattended access by invalidating sessions after 5 minutes of idle time.

---

## 👥 Contributors & Maintainers

* **Sarthak Mandhare** ([@sarthakmandhare34](https://github.com/sarthakmandhare34)) — Lead Developer & Project Owner
* **Google** — AI Architectural & Development Partner

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
