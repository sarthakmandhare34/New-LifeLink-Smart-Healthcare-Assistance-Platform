# 🏥 LifeLink — Smart Healthcare Assistance Platform

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![React 19](https://img.shields.io/badge/React-19-61dafb.svg?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178c6.svg?logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS v4](https://img.shields.io/badge/Tailwind-v4-38bdf8.svg?logo=tailwindcss)](https://tailwindcss.com/)
[![Google Gemini AI](https://img.shields.io/badge/Google%20Gemini-AI-4285F4.svg?logo=google)](https://ai.google.dev/)
[![MySQL](https://img.shields.io/badge/MySQL-8.0-4479A1.svg?logo=mysql)](https://www.mysql.com/)

> A full-stack web application that helps patients track their health and connects them with doctors — powered by Google Gemini AI for smart symptom checking.

---

## 🤔 What is LifeLink?

LifeLink is a **healthcare web app** built for patients and doctors. Think of it like a digital health assistant that lives in your browser.

Here's what it does in simple terms:

- 🧠 **You describe your symptoms** → AI analyzes them and tells you which type of doctor to see and how urgent it is
- 📋 **Stores your medical history** — like a digital health card with your allergies, blood group, and medicines
- 🗓️ **Book appointments** with real Mumbai specialists (12 doctors pre-loaded)
- 💊 **Doctors can write digital prescriptions** that automatically appear in your Medicine Cabinet
- 🚨 **Emergency button** — instantly connects you to `112` emergency services with one click
- 🗺️ **Map of doctors near Mumbai railway stations** — find the nearest specialist on the Mumbai local rail network

---

## ✨ Main Features (What Can You Actually Do?)

### 👤 As a Patient
| Feature | What it does |
| :--- | :--- |
| **Sign Up / Log In** | Create your account with email/password or one-click Google OAuth (exclusive to Patient Portal) |
| **AI Symptom Checker** | Describe what you're feeling — AI tells you urgency (Low / Moderate / Emergency) and which doctor to see |
| **Health Passport** | Store your blood group, chronic conditions (e.g. diabetes), and emergency contacts |
| **Medicine Cabinet** | Track all your medicines — names, dosage, how often to take them |
| **Book Appointments** | Book with any of the 12 Mumbai specialist doctors |
| **View Prescriptions** | See what your doctor prescribed — verified with a digital signature |
| **Emergency Page** | One-tap access to call `112` or send SOS SMS to your emergency contacts |
| **Find Specialists** | See doctors on a live map based on Mumbai's local train network |

### 🩺 As a Doctor
| Feature | What it does |
| :--- | :--- |
| **Doctor Login** | Separate credential-only login from patients — login at `/doctor/login` or `/workspace` |
| **View Appointments** | See all patient bookings waiting for your approval |
| **Patient History** | Look at a patient's full medical record before the consultation |
| **Write Prescriptions** | Add medicines, dosages, and notes — it auto-syncs to the patient's app |
| **Consultation Notes** | Write detailed clinical notes for each patient visit |

---

## 🔒 Cool Security Features

- **Auto Logout**: If you don't touch the screen for **5 minutes**, the app logs you out automatically (important for hospital computers that others might use)
- **Separate Doctor & Patient Sessions**: A doctor and patient can be logged in at the same time in the same browser — without mixing up their data
- **Strict Role & OAuth Boundaries**: Google Sign-In is exclusively reserved for the Patient Portal. Clinicians must use verified healthcare credentials to prevent third-party role escalation.
- **Unified Clinical Split Layout**: Standardized 2-column aesthetic across `/login`, `/register`, `/doctor/login`, and `/doctor/reset` with ambient ECG waves, left branding panels, and trust badges.
- **Encrypted Passwords**: Passwords are stored safely using bcrypt hashing (never stored as plain text)
- **Tamper-proof Prescriptions**: Each prescription has a unique SHA-256 digital signature so no one can fake or modify it

---

## 🧠 How the AI Works: Smart Triage & Clinical Decision Support

> **💡 The Big Picture: AI is a Helpful Guide, Not a Doctor**  
> LifeLink's AI does **not** give a final medical diagnosis or claim 100% accuracy. Instead, it acts as an **intelligent healthcare navigator** — analyzing the symptoms you type in plain English, helping you understand how urgently you need care, and pointing you to the exact type of doctor you should consult.

### 🔄 How Your Symptoms Get Analyzed (From Input to Result)

```text
  ┌────────────────────────────────────────────────────────────────────────┐
  │  1. What You Provide (Patient Input)                                   │
  │     • Symptoms in plain English ("throbbing headache and blurry vision")│
  │     • Age & biological profile                                        │
  │     • Duration ("past 3 days") & any pre-existing health conditions   │
  └───────────────────────────────────┬────────────────────────────────────┘
                                      │
                                      ▼
  ┌────────────────────────────────────────────────────────────────────────┐
  │  2. Behind-the-Scenes Analysis & Safety Filtering                      │
  │     • Instant Emergency Check: Critical red flags (chest pain, severe  │
  │       breathing trouble) bypass AI to immediately advise "Call 112"   │
  │     • Biological Sanity Check: Catches biologically impossible inputs │
  │     • Age-Appropriate Routing: Patients under 18 route to Pediatrics   │
  │     • Google Gemini AI Analysis: Maps complex symptoms to medical data │
  └───────────────────────────────────┬────────────────────────────────────┘
                                      │
                                      ▼
  ┌────────────────────────────────────────────────────────────────────────┐
  │  3. What You Receive (Actionable Guidance)                             │
  │     • 🚦 Urgency Tier: LOW (routine), MODERATE, or EMERGENCY           │
  │     • 🩺 Recommended Specialist: e.g. "Neurology" or "Cardiology"      │
  │     • 👨‍⚕️ In-System Doctor: Matches a verified doctor in our directory  │
  │     • 💡 Clear Guidance: Plain-English advice & questions for your doc │
  │     • 🗺️ Direct Next Step: Find & book nearby Mumbai specialists       │
  └────────────────────────────────────────────────────────────────────────┘
```

### ⭐ Key Capabilities of the AI Assistant

1. **Plain-English Symptom Processing & In-System Doctor Matching**  
   You don't need medical jargon. Typing *"my stomach aches on the right side after eating"* is analyzed by Google Gemini Flash to identify the digestive system and recommend **Gastroenterology**.  
   *The AI is strictly constrained to recommend ONLY the 12 medical specialties and doctors currently present in LifeLink's directory.* Patients are never directed to arbitrary specialties or dead ends — every recommendation pairs directly with an available doctor in our system.

2. **3-Level Urgency Triage**  
   Helps patients prioritize their care:
   - 🟢 **LOW**: Mild symptoms suitable for self-care, rest, and routine general practice check-ups.
   - 🟡 **MODERATE**: Persistent symptoms that warrant booking an appointment with a specialist within a few days.
   - 🔴 **EMERGENCY**: Urgent red-flag symptoms requiring immediate medical attention at an emergency room or via `112`.

3. **Built-in Safety Guardrails**  
   - **System Specialty Boundaries**: The AI prompt and JSON schema enforce a strict enum of the 12 in-system specialties. Unlisted fields (ENT, oncology, nephrology, urology) map safely to `General Practice`.
   - **Emergency Override**: Critical phrases (e.g. *"crushing chest pain"*, *"loss of consciousness"*, *"slurred speech"*) return an immediate `EMERGENCY` warning with zero delay, advising you to dial `112`.
   - **Pediatric Protection**: Adolescents and children (under 18) are directed to pediatricians and advised to involve parents/guardians.
   - **Nonsense Filter**: Irrelevant questions (e.g. *"how to bake a cake"*) are flagged and rejected so the tool remains strictly dedicated to health.
   - **Offline Fallback**: If internet connection drops or AI quota is exceeded, safe default medical guidance is provided so the app never crashes.

4. **Transparent Role: Guiding, Not Replacing Clinicians**  
   LifeLink provides decision support to eliminate confusion before you leave your house. The AI is designed to help you **prepare for your visit**, but a real, certified clinician always conducts the physical diagnosis and writes the prescription.

---

## 🛠️ Tech Stack (What We Built This With)

You don't need to know all of these, but here's a breakdown:

| What it does | Technology |
| :--- | :--- |
| **Frontend (What you see)** | React 19, TypeScript, Tailwind CSS v4 |
| **Backend (Server)** | Node.js, Express, tRPC |
| **Database** | MySQL 8 with Drizzle ORM |
| **AI** | Google Gemini Flash API |
| **Authentication** | JWT sessions + Google OAuth |
| **Real-time updates** | Server-Sent Events (SSE) |
| **Maps** | Leaflet + OpenStreetMap |
| **Testing** | Vitest, TypeScript compiler |
| **Build tool** | Vite 7 |

> **Why tRPC?** It lets the frontend and backend share the same TypeScript types — so if you change an API, the frontend automatically knows about it. No manual documentation needed!

---

## 📁 Repository Structure & Directory Organization

Every file in LifeLink is organized into designated subdirectories according to architectural boundaries:

```text
LifeLink-Smart-Healthcare-Assistance-Platform/
│
├── 📁 frontend/                                    # Modern React 19 single-page application
│   ├── index.html                                 # HTML5 entry shell & viewport meta definitions
│   ├── public/                                    # Static assets, branding marks, and favicons
│   │   └── assets/branding/                       # SVG logos, emblem locks, and brand vectors
│   └── src/                                       # Application source code
│       ├── main.tsx                               # React root bootstrap & DOM mounting
│       ├── App.tsx                                # Central route definitions (/patient, /doctor, /workspace)
│       ├── index.css                              # Liquid-Glass CSS tokens, mesh gradients, WCAG rules
│       │
│       ├── 📁 _core/                              # Core client infrastructure & session hooks
│       │   └── hooks/                             # useAuth, useDoctorAuth context consumers
│       │
│       ├── 📁 components/                         # Reusable design system primitives
│       │   ├── brand/                             # Vectorized LifeLink brand logos
│       │   ├── layout/                            # AppShell (Patient) & DoctorAppShell (Clinician)
│       │   └── ui/                                # Liquid-Glass Card, Button, Input, Popup, Badge
│       │
│       ├── 📁 context/                            # Application-wide React context providers
│       │   └── ThemeContext.tsx                   # Light & dark theme state with liquid-glass tokens
│       │
│       ├── 📁 features/                           # Domain feature modules
│       │   ├── 📁 entry/                          # Portal entry points & authentication
│       │   │   ├── Login.tsx                      # Patient sign-in view
│       │   │   ├── Register.tsx                   # Patient registration view
│       │   │   └── WorkspaceSelector.tsx          # Portal gate (Patient vs Doctor Workspace)
│       │   │
│       │   ├── 📁 patient/                        # Patient Portal capabilities
│       │   │   ├── Dashboard.tsx                  # Aggregated patient overview & quick actions
│       │   │   ├── Assessment/                    # 5-stage AI symptom triage assessment form
│       │   │   ├── Specialists/                   # Mumbai Specialist Rail Network directory & map
│       │   │   ├── Appointments/                  # Appointment scheduling & active booking queue
│       │   │   ├── HealthPassport/                # Demographics, blood group, chronic conditions
│       │   │   ├── Medicines/                     # Medicine cabinet schedule & inventory tracker
│       │   │   ├── Prescriptions/                 # Digital prescription viewer & verification
│       │   │   ├── Emergency/                     # 112 emergency dialer & SMS trigger workflows
│       │   │   ├── Profile/                       # Patient profile photo and account settings
│       │   │   └── Settings/                      # Preferences, theme toggles, and security settings
│       │   │
│       │   └── 📁 doctor/                         # Dedicated Doctor Workspace
│       │       ├── Dashboard.tsx                  # Clinician triage queue & practice statistics
│       │       ├── Setup.tsx                      # Specialist onboarding & consultation schedule
│       │       ├── Login.tsx                      # Dedicated doctor login with credentials
│       │       ├── ResetPassword.tsx              # Password reset flow for clinical accounts
│       │       ├── Appointments/                  # Appointment state machine management
│       │       ├── Assessments/                   # Review patient AI symptom assessments
│       │       ├── Consultations/                 # Live patient consultation & notes workspace
│       │       ├── Patients/                      # Patient roster & medical history browser
│       │       ├── Prescriptions/                 # Digital prescription authoring & SHA-256 signing
│       │       ├── Profile/                       # Doctor credential view & hospital affiliation
│       │       └── Settings/                      # Workstation preferences & logout trigger
│       │
│       ├── 📁 hooks/                              # Custom React hooks
│       │   ├── patientInactivity.ts               # 5-minute activity tracker & auto-logout
│       │   └── useSSE.ts                          # Server-Sent Events listener for real-time updates
│       │
│       ├── 📁 lib/                                # Shared frontend libraries & clients
│       │   ├── trpc.ts                            # Typed tRPC client instance with React Query
│       │   └── utils.ts                           # Tailwind CSS class merging (clsx + twMerge)
│       │
│       └── 📁 types/                              # Frontend-specific type definitions
│
├── 📁 backend/                                    # Express server & tRPC backend
│   ├── db.ts                                      # Database query layer & Drizzle SQL helpers
│   ├── routers.ts                                 # Master tRPC appRouter connecting all sub-routers
│   ├── storage.ts                                 # Cloud S3 / local profile photo storage adapter
│   ├── syntheticDoctor.ts                         # Provisioning logic for 12 Mumbai specialist accounts
│   ├── profilePhoto.ts                            # Avatar image upload processing & optimization
│   │
│   ├── 📁 _core/                                  # Server infrastructure
│   │   ├── index.ts                               # Server bootstrap, Express middleware, Vite dev bridge
│   │   ├── context.ts                             # Dual-session cookie extraction & tRPC context builder
│   │   ├── trpc.ts                                # tRPC procedure definitions (public, protected, doctor)
│   │   └── env.ts                                 # Validated environment variables (Zod-enforced)
│   │
│   ├── 📁 ai/                                     # Clinical AI Triage & Safety Engine
│   │   ├── assessmentService.ts                   # 5-layer AI symptom triage & Gemini Flash cascade
│   │   └── assessmentService.test.ts              # Unit tests for emergency regex and triage safety
│   │
│   ├── 📁 auth/                                   # Authentication & session controllers
│   │   ├── authUtil.ts                            # JWT token generation & verification helpers
│   │   ├── nativePatientAuth.ts                   # Patient credential verification & bcrypt hashing
│   │   ├── doctorAuth.ts                          # Clinician credential verification & session issuance
│   │   └── providerAuth.ts                        # Google OAuth 2.0 PKCE / state verification
│   │
│   ├── 📁 discovery/                              # Geospatial discovery & directories
│   │   └── specialistDirectory.ts                 # Controlled Mumbai rail specialist directory
│   │
│   ├── 📁 realtime/                               # Real-time event broadcasting
│   │   └── eventBus.ts                            # In-memory EventEmitter & SSE broadcast stream
│   │
│   └── 📁 routers/                                # Modular tRPC API endpoint routers
│       ├── patient.ts                             # Patient operations (profile, medicines, passport)
│       └── doctor.ts                              # Doctor operations (queue, consultations, prescriptions)
│
├── 📁 database/                                   # Relational persistence layer
│   ├── schema.ts                                  # Drizzle MySQL schema (11 core tables + relations)
│   ├── drizzle.config.ts                          # Drizzle Kit migration & studio configuration
│   └── migrations/                                # Versioned SQL migration files
│
├── 📁 shared/                                     # Isomorphic code shared between frontend & backend
│   ├── biologicalValidation.ts                    # Deterministic biological consistency rules
│   ├── const.ts                                   # Cookie names, session constants, timeout limits
│   ├── mumbaiRailNetwork.ts                       # Rail line directory (Central, Western, Harbour)
│   ├── mumbaiStationCoordinates.ts                # Geospatial coordinates for Mumbai stations
│   └── types.ts                                   # Shared data schemas & type contracts
│
├── 📁 scripts/                                    # Operational runners & database utilities
│   ├── dev.mjs                                    # Development runtime orchestrator (Vite on 5173, Express on 4000 with fallbacks)
│   ├── init-db.ts                                 # Idempotent MySQL database provisioning script
│   ├── seed-doctors.ts                            # Provisions 12 Mumbai specialist accounts (production truncation protected)
│   └── clear-users.ts                             # Development database reset helper
│
├── 📁 implementation-reports/                     # Engineering specifications & verification audits
│   ├── 01-system-architecture.md                  # Comprehensive architectural overview
│   ├── 02-database-and-auth.md                    # Database model, foreign keys, dual-session auth
│   ├── 03-ai-assessment-and-safety.md             # 5-layer AI triage engine & safety nets
│   ├── 04-doctor-portal-and-consultation.md       # Clinician workspace & cryptographic prescriptions
│   ├── 05-local-development-and-ports.md          # Local development guide, ports, console hotkeys
│   ├── dev-runtime-port-orchestration.md          # Multi-process runtime & port fallback specification
│   ├── post-remediation-browser-verification.md   # Post-remediation browser verification report
│   ├── batch-17-responsive-accessibility-ui.md   # Batch 17 WCAG 2.1 AA responsive & accessibility implementation
│   └── batch-18-production-readiness.md           # Batch 18 production readiness & deployment safety audit
│
├── 📄 CONTRIBUTORS.md                             # Maintainer credits & contribution guidelines
├── 📄 SYSTEM_DIAGRAMS.md                          # Mermaid ER, Class, Sequence, and State diagrams
├── 📄 SECURITY.md                                 # Healthcare security policy & vulnerability reporting
├── 📄 CHANGELOG.md                                # Chronological release notes & feature tracking
├── 📄 LICENSE                                     # MIT License terms
├── 📄 package.json                                # Dependencies, build scripts, and engine constraints
├── 📄 tsconfig.json                               # Strict TypeScript configuration
├── 📄 vite.config.ts                              # Vite 7 build configuration
└── 📄 vitest.config.ts                            # Vitest unit & integration test configuration
```

---

## ⚙️ How to Run the Project Locally

### Step 1: Make Sure You Have These Installed
- ✅ **Node.js** v22 or newer → [Download here](https://nodejs.org/)
- ✅ **MySQL 8** running on your computer → [Download here](https://dev.mysql.com/downloads/)
- ✅ A **Google Gemini API key** (free) → [Get one here](https://aistudio.google.com/)

### Step 2: Clone the Repository
```bash
git clone https://github.com/sarthakmandhare34/New-LifeLink-Smart-Healthcare-Assistance-Platform.git
cd New-LifeLink-Smart-Healthcare-Assistance-Platform
npm install
```

### Step 3: Set Up Your Environment File
Create a file called `.env` in the root folder and paste this:
```env
# Your MySQL database (change the password to yours)
DATABASE_URL="mysql://root:yourpassword@localhost:3306/lifelink"

# Make up a long random string (at least 32 characters)
JWT_SECRET="any-long-random-string-you-make-up-here"

# Your Google Gemini API key (required for AI triage)
GEMINI_API_KEY="paste-your-gemini-api-key-here"

# Google OAuth Credentials (Optional: enables Patient Google Sign-In & Sign-Up)
GOOGLE_OAUTH_CLIENT_ID="your-google-client-id.apps.googleusercontent.com"
GOOGLE_OAUTH_CLIENT_SECRET="your-google-client-secret"
AUTH_PUBLIC_BASE_URL="http://localhost:5173"
```


### Step 4: Set Up the Database
```bash
# Create the database
npx tsx scripts/init-db.ts

# Create all the tables
npm run db:push

# Add the 12 test doctors
npx tsx scripts/seed-doctors.ts
```

### Step 5: Start the App 🚀
```bash
npm run dev
```
Then open **[http://localhost:5173](http://localhost:5173)** in your browser! 
- **Frontend (Vite)**: Runs on preferred port `5173` (fallback range: `5173–5177`)
- **Backend (Express + tRPC)**: Runs on preferred port `4000` (fallback range: `4000–4004`)
- Vite automatically proxies `/api/trpc` and `/uploads` requests directly to the backend.

---

## 🩺 Doctor Work Accounts

Doctor accounts are provisioned via `/doctor/setup` using the master access key `lifelink-controlled-clinician-secret-key-2026`. Clinicians strictly log in using their official work email at `/doctor/login` or `/workspace` → **Doctor Login**.

| Specialty | Official Work Email | Password |
| :--- | :--- | :--- |
| **Cardiology** | `cardiology@lifelink.com` | `cardio@lifelink` |
| **Orthopedics** | `orthopedics@lifelink.com` | `ortho@lifelink` |
| **Dermatology** | `dermatology@lifelink.com` | `derma@lifelink` |
| **Neurology** | `neurology@lifelink.com` | `neuro@lifelink` |
| **Pediatrics** | `pediatrics@lifelink.com` | `pedia@lifelink` |
| **General Practice** | `generalpractice@lifelink.com` | `general@lifelink` |
| **Ophthalmology** | `ophthalmology@lifelink.com` | `ophthal@lifelink` |
| **Gastroenterology** | `gastroenterology@lifelink.com` | `gastro@lifelink` |
| **Psychiatry** | `psychiatry@lifelink.com` | `psych@lifelink` |
| **Endocrinology** | `endocrinology@lifelink.com` | `endo@lifelink` |
| **Pulmonology** | `pulmonology@lifelink.com` | `pulmo@lifelink` |
| **Gynecology** | `gynecology@lifelink.com` | `gynae@lifelink` |



---

## 📜 Useful Commands

| Command | What it does |
| :--- | :--- |
| `npm run dev` | Start the app locally |
| `npm run check` | Check for TypeScript errors |
| `npm test` | Run all unit tests |
| `npm run build` | Build for production |
| `npm run verify` | Run type check + tests + build all at once |
| `npm run db:push` | Update database tables after schema changes |
| `npm run db:studio` | Open a visual UI to browse your database |
| `npm run db:clear` | Completely wipe all user records and history for a fresh start |
| `npm run db:sync:doctors` | Audit live database and verify/sync all 12 doctor work accounts |


---

## 🧭 App Routes (Pages You Can Visit)

| URL | What's There |
| :--- | :--- |
| `/` | Redirects to login |
| `/login` | Patient login page |
| `/register` | Patient registration page |
| `/workspace` | Choose: Patient or Doctor portal |
| `/patient/dashboard` | Main patient page |
| `/patient/assessment` | AI symptom checker |
| `/patient/specialists` | Find doctors on the Mumbai rail map |
| `/patient/appointments` | Your booked appointments |
| `/patient/medicines` | Your medicine schedule |
| `/patient/health-passport` | Your medical profile |
| `/patient/prescriptions` | Prescriptions from your doctor |
| `/patient/emergency` | Emergency contacts & 112 button |
| `/doctor/login` | Doctor login |
| `/doctor/reset` | Doctor password reset view |
| `/doctor/dashboard` | Doctor's appointment queue |
| `/doctor/appointments` | Manage patient appointments |
| `/doctor/prescriptions` | Write & sign prescriptions |

---

## 📚 Docs & Deep Dives

Want to understand the architecture better? Check these out:

| Document | What's Inside |
| :--- | :--- |
| [SYSTEM_DIAGRAMS.md](SYSTEM_DIAGRAMS.md) | Architecture diagrams, database relationships, flowcharts |
| [SECURITY.md](SECURITY.md) | How we keep data safe |
| [CHANGELOG.md](CHANGELOG.md) | What changed in each version |
| [CONTRIBUTORS.md](CONTRIBUTORS.md) | How to contribute to the project |
| [implementation-reports/](implementation-reports/) | Deep technical reports on each system |

---

## 👥 Who Built This?

- **Sarthak Mandhare** ([@sarthakmandhare34](https://github.com/sarthakmandhare34)) — Lead Developer & Project Owner
- **Google** — AI Partnership (Gemini API)

---

## 📄 License

This project is open-source under the [MIT License](LICENSE). Feel free to use, learn from, and build on it!
