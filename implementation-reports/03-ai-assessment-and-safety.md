# 03. AI Assessment & Clinical Safety Controls

## AI Assessment Architecture
The AI Assessment service (`backend/assessmentService.ts`) provides structured triage guidance based on patient symptoms, age, gender, and duration.

### 1. Model Resolution & Fallback Cascade
The system implements a resilient multi-model cascade to eliminate single points of failure:
1. `gemini-3.5-flash` (Primary high-performance triage model)
2. `gemini-3.7-flash` (Secondary fallback)
3. `gemini-flash-latest` (Tertiary fallback)
4. **Deterministic Safe Offline Fallback**: If network or quota limitations occur, the system provides structured, safe default triage advice rather than crashing.

### 2. Safety & Emergency Pattern Detection
Before LLM execution, input text is evaluated against deterministic emergency regex patterns:
* Chest pain / pressure / crushing sensations
* Shortness of breath / severe breathing difficulties
* Severe bleeding / coughing blood / hematemesis
* Unconsciousness / seizures / fainting
* Stroke symptoms (facial droop, slurred speech, one-sided weakness)
* Poisoning / anaphylaxis / severe allergic reactions
* Suicidal ideation or self-harm

### 3. Immediate Deterministic Override
If an emergency pattern is matched:
* Urgency is hardcoded to `EMERGENCY`.
* Specialty is set to `Emergency Care`.
* Direct guidance is issued advising the user to contact local emergency services (`112` / ambulance) immediately.
* Structured JSON validation enforces schema consistency across all responses.
