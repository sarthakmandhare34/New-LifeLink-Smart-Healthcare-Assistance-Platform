# LifeLink Platform Contributors & Governance

## Project Leadership & Maintainers

LifeLink is designed, architected, and maintained by:

- **Sarthak Mandhare** ([@sarthakmandhare34](https://github.com/sarthakmandhare34))
  - **Role**: Lead Developer, System Architect & Project Owner
  - **Responsibilities**: Full-stack platform architecture, database schema, AI safety guardrails, doctor-patient dual authentication workflows, and UI engineering.

- **Google**
  - **Role**: AI Architectural & Development Partner
  - **Responsibilities**: Gemini AI models (`gemini-3.5-flash-lite`, `gemini-3.5-flash`, `gemini-3.7-flash`), structured schema triage integration, and latency optimization.

---

## 🛠️ Contribution Guidelines & Standards

We welcome contributions to the LifeLink platform. When submitting pull requests, ensure adherence to the following architectural standards:

### 1. Dual Authentication & Session Safety
* Never mix patient and clinician session tokens. Use `COOKIE_NAME = "app_session_id"` for patient procedures and `DOCTOR_COOKIE_NAME = "doctor_session_id"` for clinician procedures.
* Enforce strict authorization on all tRPC endpoints. Patient procedures must use `protectedProcedure` and derive identity from `ctx.user.id`; clinician procedures must use `doctorProcedure` and validate `ctx.user.openId`.

### 2. Clinical AI Triage Safety
* All AI evaluation must pass through the 5-layer safety cascade in `backend/ai/assessmentService.ts`:
  1. Biological Consistency Validation (`shared/biologicalValidation.ts`)
  2. Deterministic 0ms Emergency Regex Override (`hasEmergencyPattern`)
  3. Structured JSON generation with Google Gemini Flash Cascade
  4. Post-processing Pediatric & Adolescent Safeguards (<18 routed to Pediatrics)
  5. Deterministic Safe Offline Fallback
* Never execute Gemini API calls or store API keys in the client layer.

### 3. Design System & Accessibility
* Maintain the hybrid **Liquid-Glass** (`backdrop-filter: blur(24px) saturate(155%)`, iridescent border sheen) and **Clinical Aqua** palette (`#E6F9FC`, `#9FFBFF`, `#00C4CC`, `#102B2D`).
* Adhere to **WCAG 2.1 AA** standards: all interactive components must support keyboard navigation (`Tab`, `Enter`, `Escape`), accessible ARIA labels, and focus rings.

### 4. Code Hygiene & Testing
* Run `npm run verify` prior to submitting commits.
* Ensure 0 TypeScript compilation errors (`npm run check`) and passing unit/integration test suites (`npm test`).

---

## 📄 Related Project Policies

* [**Code of Security & Vulnerability Reporting**](SECURITY.md)
* [**Changelog & Release Notes**](CHANGELOG.md)
* [**System Architecture & Diagrams**](SYSTEM_DIAGRAMS.md)
* [**MIT License**](LICENSE)
