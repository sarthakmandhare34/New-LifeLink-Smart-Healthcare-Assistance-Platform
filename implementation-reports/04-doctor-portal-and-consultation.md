# 04. Doctor Portal, Clinical Workflow & Prescriptions

## 1. Clinician Workspace Overview (`frontend/src/features/doctor/`)

The LifeLink Doctor Workspace provides medical clinicians with an integrated suite for managing appointment queues, inspecting patient medical passports and past AI triage evaluations, conducting clinical consultations, and authoring cryptographically verifiable digital prescriptions.

---

## 2. Pre-Seeded Mumbai Specialist Directory

The platform includes 12 pre-configured clinical specialist accounts:

| Specialist ID | Doctor Name | Medical Specialty | Station / Hub | Rail Line |
| :--- | :--- | :--- | :--- | :--- |
| `cardiology` | Dr. Rajesh Sharma | Cardiology | Dadar | Central & Western |
| `gynecology` | Dr. Ananya Iyer | Obstetrics & Gynecology | Bandra | Western & Harbour |
| `pediatrics` | Dr. Vikram Patel | Pediatrics & Child Health | Andheri | Western & Harbour |
| `orthopedics` | Dr. Suresh Deshmukh | Orthopedics & Joint Care | Thane | Central |
| `neurology` | Dr. Meera Kulkarni | Neurology | Vashi | Harbour |
| `dermatology` | Dr. Rohan Gupta | Dermatology | Borivali | Western |
| `oncology` | Dr. Sunita Rao | Medical Oncology | Parel | Central |
| `psychiatry` | Dr. Amit Joshi | Psychiatry & Mental Health | Kurla | Central & Harbour |
| `gastroenterology` | Dr. Priya Nair | Gastroenterology | Ghatkopar | Central |
| `pulmonology` | Dr. Sandeep Verma | Pulmonology & Chest Care | Kalyan | Central |
| `ophthalmology` | Dr. Pooja Shah | Ophthalmology | Churchgate | Western |
| `ent` | Dr. Nitin Patil | Ear, Nose & Throat (ENT) | Panvel | Harbour |

* **Default Login Credentials**: Any specialist can be accessed at `/doctor/login` using their **Specialist ID** as the username (e.g. `cardiology`) and `demo` as the password.

---

## 3. Appointment Lifecycle State Machine

```text
[ Patient Books Appointment via Specialist Finder ]
                         │
                         ▼
                  "Requested" (Pending Clinician Review)
                         │
        ┌────────────────┴────────────────┐
        │ Doctor Accepts                  │ Doctor / Patient Cancels
        ▼                                 ▼
   "Confirmed"                      "Cancelled"
        │
        │ Consultation Conducted & Prescription Issued
        ▼
   "Completed"
```

1. **Requested / Pending**: Patient selects a slot with a Mumbai specialist. The appointment appears in the doctor's triage queue.
2. **Confirmed**: Clinician accepts the appointment. The backend publishes `APPOINTMENT_UPDATED` over SSE, updating the patient's dashboard instantly.
3. **Completed**: Clinician concludes the consultation, logs clinical notes, and optionally signs a prescription. Both doctor and patient records transition to completed status.
4. **Cancelled**: Either party can cancel prior to the consultation start time.

---

## 4. Cryptographic Digital Prescriptions

LifeLink implements a tamper-evident digital prescription authoring workflow:

1. **Itemized Medications**: Clinician inputs medicine names, exact dosages, frequencies, and administration instructions.
2. **Integrity Hash Generation**: When the clinician signs the prescription, the backend computes a SHA-256 cryptographic hash incorporating:
   - Issuing Clinician ID
   - Patient ID
   - Canonicalized Medication JSON Array
   - Timestamp of Authorization
3. **Database Persistence**: The record is saved in `patientPrescriptions` (status: `SIGNED`) and line-items are saved in `patientPrescriptionItems`.
4. **Realtime Sync**: The server emits a `PRESCRIPTION_CREATED` event over SSE, prompting the patient's browser to invalidate React Query caches and populate their **Medicine Cabinet** without manual page reloads.

---

## 5. Clinician Inactivity Security

* Embedded with the 5-minute inactivity tracking system (`DoctorAppShell.tsx`).
* Clinicians left unattended at hospital terminals are automatically signed out after 5 minutes of inactivity, invalidating the `doctor_session_id` cookie and redirecting to the login screen.
