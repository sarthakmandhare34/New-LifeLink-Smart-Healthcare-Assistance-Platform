# 03. AI Health Assessment & 5-Layer Safety Architecture

## 1. Engine Overview (`backend/ai/assessmentService.ts`)

LifeLink's AI Health Assessment service provides structured, non-diagnostic clinical triage and specialist routing. It maps user-reported symptoms, age, gender, duration, and existing medical conditions to recommended medical specialties and urgency categories (`LOW`, `MODERATE`, `EMERGENCY`, `ERROR`).

---

## 2. Multi-Layer Safety Architecture Diagram

```text
User Input: { symptoms, age, gender, conditions, duration }
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│  Layer 1: Biological Consistency Validation (0ms)           │
│  Deterministic checks (e.g. Male Pregnancy / Gyn Block)     │
└────────────────────────────┬────────────────────────────────┘
                             │ Passes Validation
┌────────────────────────────▼────────────────────────────────┐
│  Layer 2: Deterministic Emergency Override (0ms)            │
│  Regex pattern scan for acute life-threatening emergencies  │
└────────────────────────────┬────────────────────────────────┘
                             │ No Emergency Keywords Detected
┌────────────────────────────▼────────────────────────────────┐
│  Layer 3: Structured Google Gemini Flash Execution          │
│  Server-side JSON Schema generation (~1.2s latency)         │
│  Cascading fallback: 3.5-flash-lite ➔ 3.5-flash ➔ 3.7-flash │
└────────────────────────────┬────────────────────────────────┘
                             │ Valid Response Received
┌────────────────────────────▼────────────────────────────────┐
│  Layer 4: Post-Processing Safeguards & Quality Filters      │
│  - Pediatric routing (<18 years forced to Pediatrics)       │
│  - Adolescent menstrual reassurance against adult pregnancy │
│  - Non-medical query rejection (emits ERROR urgency status) │
└────────────────────────────┬────────────────────────────────┘
                             │ Upstream Failure / Timeout / Quota Exhaustion
                             ▼
┌─────────────────────────────────────────────────────────────┐
│  Layer 5: Deterministic Safe Offline Fallback               │
│  Graceful non-crashing clinical recommendation matrix       │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ▼
              Structured AssessmentResult JSON
```

---

## 3. Detailed Layer Specifications

### Layer 1: Biological Consistency Validation
* Implemented in `shared/biologicalValidation.ts` (`checkBiologicalImpossibility`).
* Evaluates reported symptoms against physiological traits of the declared gender.
* Example: If gender is declared as "Man" or "Male" and symptoms reference pregnancy, ovulation, or menstrual cycles, the engine immediately returns a LOW urgency reassurance with an explanation of biological inconsistency, avoiding inappropriate clinical advice with 0ms delay.

### Layer 2: Deterministic 0ms Emergency Override
* Evaluates input text against pre-compiled regex patterns in `EMERGENCY_PATTERNS`:
  - **Cardiovascular**: Crushing chest pain, severe chest pressure, radiating arm pain.
  - **Respiratory**: Shortness of breath, acute dyspnea, severe wheezing.
  - **Hemorrhagic**: Severe bleeding, coughing blood, hematemesis (vomiting blood).
  - **Neurological**: Unconsciousness, seizures, loss of consciousness, fainting.
  - **Stroke Signs**: Facial droop, slurred speech, sudden one-sided weakness.
  - **Anaphylaxis & Toxins**: Drug overdose, poisoning, acute allergic reactions.
  - **Psychiatric**: Active suicidal ideation, self-harm intentions.
* If triggered, the engine immediately yields:
  - `urgency`: `"EMERGENCY"`
  - `specialty`: `"Emergency Care"`
  - `guidance`: Direct instructions to dial `112` or seek immediate hospital admission.

### Layer 3: Structured Gemini Flash Execution
* The server communicates directly with Google Generative AI REST endpoints using structured JSON schemas (`GEMINI_ASSESSMENT_RESPONSE_SCHEMA`):
  ```typescript
  const GEMINI_ASSESSMENT_RESPONSE_SCHEMA = {
    type: "OBJECT",
    properties: {
      urgency: { type: "STRING", enum: ["LOW", "MODERATE", "EMERGENCY", "ERROR"] },
      specialty: { type: "STRING" },
      reason: { type: "STRING" },
      guidance: { type: "STRING" },
    },
    required: ["urgency", "specialty", "reason", "guidance"],
  };
  ```
* **Model Cascade**: Automatically cycles through candidates to ensure high availability:
  1. `gemini-3.5-flash-lite` (Primary high-efficiency model, ~1.2s latency)
  2. `gemini-3.5-flash`
  3. `gemini-3.1-flash-lite`
  4. `gemini-3.7-flash`
  5. `gemini-2.5-flash`
  6. `gemini-1.5-flash` / `gemini-1.5-flash-8b`

### Layer 4: Post-Processing Safeguards
* **Pediatric Protection**: Any patient under the age of 18 is strictly routed to `"Pediatrics"` or `"Pediatric & Adolescent Medicine"`.
* **Adolescent Reassurance**: For young adolescents (aged 10–16) reporting irregular cycles, fatigue, or nausea, the engine replaces adult pregnancy references with age-appropriate context highlighting pubertal hormonal development.
* **Non-Medical Input Rejection**: If the user submits conversational queries, recipes, coding problems, or gibberish (e.g. "How to bake a cake?"), the system responds with:
  - `urgency`: `"ERROR"`
  - `specialty`: `"Error"`
  - `reason`: `"The input is not related to health symptoms."`
  - `guidance`: `"The Input is not related towards the Symptoms please try again later"`
  - The frontend dynamically surfaces a distinct red alert badge for error handling.

### Layer 5: Safe Deterministic Offline Fallback
* In the event that all upstream AI endpoints fail, network connectivity is severed, or API quotas are exhausted, the system catches the error and returns a pre-configured safe clinical fallback:
  - `urgency`: `"MODERATE"`
  - `specialty`: `"General Medicine"`
  - `reason`: `"Automated clinical assessment is currently operating in offline mode."`
  - `guidance`: `"Please consult a qualified medical professional or visit your nearest primary healthcare center."`
* This guarantees the application never crashes or displays blank 500 error screens to users seeking medical guidance.
