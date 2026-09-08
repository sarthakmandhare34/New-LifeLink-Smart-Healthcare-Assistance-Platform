# 04. Doctor Portal & Consultation Workspace

## Clinician Workspace Overview
The Doctor Workspace (`frontend/src/features/doctor/`) allows verified clinicians to manage their clinical schedule, review patient health records, conduct consultations, and prescribe medications.

## Appointment Lifecycle State Machine
```
[ Patient Requests ]
        │
        ▼
   "Requested" ──(Doctor Accepts)──► "Confirmed" ──(Complete Consultation)──► "Completed"
        │                                  │
        └──────────────(Cancel)────────────┴────────────────────────────────► "Cancelled"
```

1. **Requested**: Patient books an appointment via the Specialist Finder or Patient Dashboard.
2. **Confirmed**: Doctor reviews the request in their Appointments workspace and clicks **Accept**. Realtime SSE updates the patient UI immediately.
3. **Completed**: During or after the consultation, the doctor marks the appointment as **Completed** (with optional prescriptions and clinical notes). Both patient and doctor records transition to final consultation history.

## Features
* **Appointments Queue**: Categorized tabs for Upcoming, Pending/Requested, and Completed consultations.
* **Patient Record View**: Instant access to patient allergies, ongoing medications, emergency contacts, and past triage assessments.
* **Prescription Writing**: Ability to add digital medication line items with dosages and schedules.
* **Clean Sign-Out**: Top-bar and sidebar session termination with automatic state invalidation.
