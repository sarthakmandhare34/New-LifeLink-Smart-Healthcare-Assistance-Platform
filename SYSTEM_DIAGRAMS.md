# LifeLink — System Architecture & Diagrams

A clean visual guide for the team showing how files, database tables, and application workflows connect.

---

## 1. Project Files & Diagrams Tree

```
LifeLink-Platform/
│
├── 🗄️ DATABASE LAYER [Related to: ER Diagram]
│   ├── database/schema.ts                 <-- [EDIT] Tables, fields, foreign keys & relationships
│   ├── database/drizzle.config.ts         <-- [READ] DB connection & migration configs
│   └── database/migrations/               <-- [AUTO] Generated SQL schema migration history
│
├── ⚙️ BACKEND API LAYER [Related to: Class & Sequence Diagrams]
│   ├── backend/_core/index.ts             <-- [READ] Express server entry point & middleware
│   ├── backend/routers.ts                 <-- [EDIT] Master tRPC router (appRouter)
│   ├── backend/routers/
│   │   ├── patient.ts                     <-- [EDIT] Patient APIs (appointments, profile, medicines)
│   │   └── doctor.ts                      <-- [EDIT] Doctor APIs (consultations, prescriptions)
│   ├── backend/db.ts                      <-- [EDIT] SQL queries & helpers using Drizzle ORM
│   ├── backend/ai/assessmentService.ts    <-- [EDIT] Google Gemini 2.5 Flash symptom triage logic
│   ├── backend/realtime/eventBus.ts       <-- [EDIT] Live Server-Sent Events (SSE) broadcaster
│   └── backend/auth/                      <-- [READ] Password hashing & JWT session authentication
│
├── 💻 FRONTEND CLIENT LAYER [Related to: Class & Activity Diagrams]
│   ├── frontend/src/App.tsx               <-- [EDIT] React router paths (/patient/*, /doctor/*)
│   ├── frontend/src/components/layout/
│   │   ├── AppShell.tsx                   <-- [EDIT] Patient navigation & sidebar shell
│   │   └── DoctorAppShell.tsx             <-- [EDIT] Doctor workspace sidebar shell
│   └── frontend/src/features/
│       ├── patient/
│       │   ├── Dashboard.tsx              <-- [EDIT] Patient dashboard overview
│       │   ├── Assessment/                <-- [EDIT] AI Symptom Checker & triage UI
│       │   ├── Specialists/               <-- [EDIT] Doctor directory & Mumbai rail locator
│       │   ├── Appointments/              <-- [EDIT] Booking slots & appointment list
│       │   ├── HealthPassport/            <-- [EDIT] Medical passport & emergency contacts
│       │   └── Medicines/                 <-- [EDIT] Medicine cabinet & schedule tracker
│       ├── doctor/
│       │   ├── Dashboard.tsx              <-- [EDIT] Doctor queue & realtime triage alerts
│       │   ├── Patients/                  <-- [EDIT] Patient medical history & records
│       │   ├── Consultations/             <-- [EDIT] Clinical consultation session view
│       │   └── Prescriptions/             <-- [EDIT] Digital prescription creator & signer
│       └── entry/
│           ├── Login.tsx                  <-- [EDIT] Patient login
│           ├── Register.tsx               <-- [EDIT] Patient registration
│           └── WorkspaceSelector.tsx      <-- [EDIT] Portal chooser (Patient vs Doctor)
│
└── 🛠️ RUNTIME & SETUP SCRIPTS
    ├── scripts/init-db.ts                 <-- [RUN] Auto-creates 'lifelink' database in MySQL
    ├── scripts/seed-doctors.ts            <-- [RUN] Resets & seeds mock doctors & test patients
    └── scripts/dev.mjs                    <-- [RUN] Unified dev server runner (Express + Vite)
```

---

## 2. Entity-Relationship (ER) Diagram

### Visual ER Tree
```
users (Central Auth & User Identity)
│
├── 1 : 1 ──> patientCredentials (email, passwordHash)
├── 1 : 1 ──> syntheticDoctorCredentials (doctorId, email, passwordHash)
├── 1 : 1 ──> patientProfiles (bloodGroup, phone, allergiesJson, conditionsJson)
│
├── 1 : N ──> patientAssessments (symptoms, duration, urgency: LOW/MODERATE/EMERGENCY, specialty)
├── 1 : N ──> patientAppointments (doctorId, scheduledAt, status: Requested/Confirmed/Completed)
├── 1 : N ──> patientMedicines (name, dosage, frequency, schedule, quantity)
├── 1 : N ──> patientEmergencyContacts (name, relationship, phone)
├── 1 : N ──> patientEvents (type: APPOINTMENT_UPDATED, ASSESSMENT_COMPLETED, etc.)
│
└── 1 : N ──> patientPrescriptions (doctorId, status: UNSIGNED/SIGNED, integrityReference)
              │
              └── 1 : N ──> patientPrescriptionItems (name, dosage, instructions)
```

### Full Mermaid ER Diagram
```mermaid
erDiagram
    users ||--o| patientCredentials : "1:1"
    users ||--o| syntheticDoctorCredentials : "1:1"
    users ||--o{ patientProviderIdentities : "1:N"
    users ||--o| patientProfiles : "1:1"
    users ||--o{ patientEmergencyContacts : "1:N"
    users ||--o{ patientMedicines : "1:N"
    users ||--o{ patientAssessments : "1:N"
    users ||--o{ patientAppointments : "1:N"
    users ||--o{ patientPrescriptions : "1:N"
    users ||--o{ patientEvents : "1:N"
    users ||--o{ doctorEvents : "1:N"
    patientPrescriptions ||--o{ patientPrescriptionItems : "1:N"

    users {
        int id PK
        varchar openId UK
        text name
        varchar email
        varchar loginMethod
        enum role
        timestamp createdAt
        timestamp updatedAt
        timestamp lastSignedIn
    }

    patientCredentials {
        int id PK
        int userId FK, UK
        varchar email UK
        varchar passwordHash
    }

    syntheticDoctorCredentials {
        int id PK
        int userId FK, UK
        varchar doctorId UK
        varchar email UK
        varchar passwordHash
    }

    patientProfiles {
        int id PK
        int userId FK, UK
        varchar bloodGroup
        varchar phone
        varchar avatarKey
        text allergiesJson
        text conditionsJson
    }

    patientEmergencyContacts {
        int id PK
        int userId FK
        varchar name
        varchar relationship
        varchar phone
    }

    patientMedicines {
        int id PK
        int userId FK
        varchar name
        varchar dosage
        varchar frequency
        varchar schedule
        int quantity
    }

    patientAssessments {
        int id PK
        int userId FK
        text symptoms
        int age
        varchar gender
        varchar duration
        enum urgency
        text reason
        varchar specialty
        text guidance
    }

    patientAppointments {
        int id PK
        int userId FK
        varchar doctorId
        text reason
        timestamp scheduledAt
        enum status
    }

    patientPrescriptions {
        int id PK
        int userId FK
        varchar doctorId
        timestamp issuedAt
        enum status
        text clinicalNotes
        varchar integrityReference
    }

    patientPrescriptionItems {
        int id PK
        int prescriptionId FK
        varchar name
        varchar dosage
        text instructions
    }

    patientEvents {
        int id PK
        int userId FK
        enum type
        varchar entityId
    }

    doctorEvents {
        int id PK
        varchar doctorId
        int patientUserId FK
        enum type
        varchar entityId
    }
```

---

## 3. Class & Component Architecture Diagram

```mermaid
classDiagram
    direction TB

    class FrontendPages {
        +AIAssessment
        +Appointments
        +DoctorDashboard
        +Prescriptions
    }

    class TRPCClient {
        +useQuery()
        +useMutation()
    }

    class AppRouter {
        +auth
        +patientAuth
        +doctorWorkspace
        +assessment
        +patientAppointment
        +patientPrescription
    }

    class GeminiAIService {
        +analyzeAssessmentWithGemini()
    }

    class RealtimeEventBus {
        +publishPatientEvent()
        +publishDoctorEvent()
    }

    class DrizzleDB {
        +getDb()
        +createPatientAssessment()
        +createAppointment()
        +issuePrescription()
    }

    FrontendPages --> TRPCClient : calls
    TRPCClient --> AppRouter : /api/trpc
    AppRouter --> GeminiAIService : AI triage
    AppRouter --> DrizzleDB : queries & writes
    AppRouter --> RealtimeEventBus : live updates (SSE)
```

---

## 4. Activity Workflows

### A. Patient Onboarding & AI Triage
```mermaid
flowchart TD
    Start([Patient Visits App]) --> Auth{Account?}
    Auth -- No --> Register[Register at /register] --> Login
    Auth -- Yes --> Login[Login at /login]
    Login --> Dashboard[Patient Dashboard]
    Dashboard --> AIForm[Enter Symptoms in AI Assessment]
    AIForm --> Gemini[Gemini 2.5 Flash Evaluates]
    Gemini --> Triage{Urgency?}
    Triage -- EMERGENCY --> RedBanner[Show Red SOS Banner & Emergency Contacts]
    Triage -- MODERATE --> BookSpec[Recommend Specialist & Book Appointment]
    Triage -- LOW --> SelfCare[Provide Self-Care Guidance]
    BookSpec --> SaveAppt[Appointment Saved in DB]
    SaveAppt --> End([Done])
```

### B. Doctor Consultation & Prescription Signing
```mermaid
flowchart TD
    DocStart([Doctor Signs In]) --> DocQueue[View Appointments on Dashboard]
    DocQueue --> AcceptAppt[Accept Appointment -> Status: Confirmed]
    AcceptAppt --> Notify[Patient Notified via Realtime SSE]
    Notify --> Consult[Conduct Consultation]
    Consult --> ComposeRx[Enter Medicines & Instructions]
    ComposeRx --> SignRx[Sign & Issue Prescription]
    SignRx --> GenHash[Generate Digital SHA-256 Signature]
    GenHash --> SaveRx[Prescription Saved as SIGNED in MySQL]
    SaveRx --> SyncCabinet[Patient Medicine Cabinet Auto-Refreshes]
    SyncCabinet --> DocEnd([Done])
```

---

## 5. Sequence Diagrams

### A. AI Symptom Triage Sequence
```mermaid
sequenceDiagram
    autonumber
    actor Patient as Patient
    participant UI as frontend (AIAssessment.tsx)
    participant Router as backend/routers.ts
    participant AI as backend/ai/assessmentService.ts
    participant Gemini as Google Gemini API
    participant DB as backend/db.ts (MySQL)
    participant SSE as backend/realtime/eventBus.ts

    Patient->>UI: Enters symptoms & clicks Analyze
    UI->>Router: assessment.analyze({ symptoms, age, duration })
    Router->>AI: analyzeAssessmentWithGemini()
    AI->>Gemini: generateContent()
    Gemini-->>AI: { urgency, reason, specialty, guidance }
    AI-->>Router: Formatted result
    Router->>DB: INSERT INTO patientAssessments
    Router->>SSE: publishPatientEvent("ASSESSMENT_COMPLETED")
    Router-->>UI: 200 OK (Render Urgency Banner & Doctor)
```

### B. Prescription Signing Sequence
```mermaid
sequenceDiagram
    autonumber
    actor Doctor as Doctor
    participant DocUI as frontend (Prescriptions)
    participant Router as backend/routers/doctor.ts
    participant DB as backend/db.ts (MySQL)
    participant SSE as backend/realtime/eventBus.ts
    participant PatUI as frontend (MedicineCabinet)

    Doctor->>DocUI: Inputs medications & clicks Sign
    DocUI->>Router: doctorWorkspace.issuePrescription()
    Router->>Router: Computes digital signature hash
    Router->>DB: INSERT INTO patientPrescriptions (status: 'SIGNED')
    Router->>DB: INSERT INTO patientPrescriptionItems
    Router->>SSE: publishPatientEvent("PRESCRIPTION_CREATED")
    SSE-->>PatUI: Live event triggers medicine cabinet update
    PatUI->>Doctor: Prescription active & accessible
```

---

## 6. How to Run from Scratch

```powershell
# 1. Start MySQL
net start MySQL80

# 2. Create database
npx tsx scripts/init-db.ts

# 3. Create tables
npm run db:push

# 4. Seed sample data
npx tsx scripts/seed-doctors.ts

# 5. Start dev server
npm run dev
```
