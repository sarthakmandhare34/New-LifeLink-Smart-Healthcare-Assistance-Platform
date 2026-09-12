/**
 * ============================================================================
 * LIFELINK BACKEND: AI HEALTH ASSESSMENT & TRIAGE SERVICE (backend/ai/assessmentService.ts)
 * ============================================================================
 * 
 * WHAT THIS FILE DOES:
 * This service powers LifeLink's intelligent symptom evaluation and triage engine.
 * It provides clinical decision support by mapping user symptoms, age, and gender
 * to appropriate medical specialties and urgency tiers (LOW, MODERATE, EMERGENCY).
 * 
 * MULTI-LAYER SAFETY ARCHITECTURE:
 * 1. Layer 1: Biological Validation (`checkBiologicalImpossibility`)
 *    Deterministic check that prevents impossible symptom assignments (e.g., male pregnancy).
 * 2. Layer 2: Deterministic Emergency Override (`hasEmergencyPattern`)
 *    Pre-empts the AI model if life-threatening keywords (chest pain, stroke symptoms, severe bleeding)
 *    are detected, returning an immediate EMERGENCY recommendation without API latency.
 * 3. Layer 3: Structured Gemini AI Execution (`invokeGemini`)
 *    Calls Google Gemini REST API using structured JSON schema output (`GEMINI_ASSESSMENT_RESPONSE_SCHEMA`).
 *    Features automated fallback cascading across candidate models if one is throttled or deprecated.
 * 4. Layer 4: Post-Processing Safeguards (`parseModelContent`)
 *    Enforces pediatric protections for patients under 18 and ensures guidance remains non-diagnostic.
 */
import { z } from "zod";
import { ENV } from "../_core/env";
import { checkBiologicalImpossibility } from "../../shared/biologicalValidation";
import { SYSTEM_DOCTOR_SPECIALTIES } from "../../shared/const";

export { SYSTEM_DOCTOR_SPECIALTIES };

export const ALL_SYSTEM_SPECIALTIES = [
  ...SYSTEM_DOCTOR_SPECIALTIES,
  "Emergency Care",
  "Error",
] as const;

/** Input schema validated by Zod before processing */
export const assessmentRequestInput = z.object({
  symptoms: z.string().trim().min(1).max(10_000),
  age: z.number().int().min(0).max(120),
  gender: z.string().trim().min(1).max(32),
  conditions: z.string().trim().max(5_000).optional(),
  duration: z.string().trim().min(1).max(64),
});

export type AssessmentRequest = z.infer<typeof assessmentRequestInput>;

/** Output schema guaranteed by Gemini structured JSON generation */
const assessmentResultSchema = z.object({
  urgency: z.enum(["LOW", "MODERATE", "EMERGENCY", "ERROR"]),
  specialty: z.string().trim().min(1).max(160),
  reason: z.string().trim().min(1).max(10_000),
  guidance: z.string().trim().min(1).max(10_000),
});

export type AssessmentResult = {
  urgency: "LOW" | "MODERATE" | "EMERGENCY" | "ERROR";
  specialty: (typeof ALL_SYSTEM_SPECIALTIES)[number];
  reason: string;
  guidance: string;
};

/** Exhaustive regex patterns for instant, deterministic emergency triage override */
const EMERGENCY_PATTERNS: readonly RegExp[] = [
  /chest\s*pain|chest\s*pressure|crushing\s*chest|radiating\s*chest|cardiac\s*arrest|heart\s*attack/i,
  /difficulty\s*breathing|shortness\s*of\s*breath|can(?:not|'t)\s*breathe|unable\s*to\s*breathe|suffocat|choking|gasping|blue\s*lips|cyanosis/i,
  /severe\s*bleeding|coughing\s*blood|vomit(?:ing|ed|s)?\s*blood|blood\s*(?:in\s+(?:my\s+)?)?vomit(?:ing|ed|s)?|throw(?:ing)?\s*up\s*blood|threw\s*up\s*blood|hematemesis|hemorrhage|arterial\s*bleed/i,
  /unconscious|loss\s*of\s*consciousness|fainting|syncope|unresponsive|coma|seizure|status\s*epilepticus/i,
  /face\s*droop|facial\s*droop|slurred\s*speech|sudden\s*weakness|one-sided\s*weakness|hemiplegia|stroke/i,
  /overdose|poisoning|anaphylaxis|anaphylactic|severe\s*allergic\s*reaction/i,
  /suicid(?:al|e)|self[- ]harm|kill\s*myself|end\s*my\s*life/i,
  /severe\s*head\s*injury|skull\s*fracture|stab\s*wound|gunshot/i,
];

/** Deterministic patterns for non-medical, conversational, coding, or trivial questions */
const NON_MEDICAL_PATTERNS: readonly RegExp[] = [
  /\b(?:recipe|cook|bake|baking|cake|pasta|pizza|delicious)\b/i,
  /\b(?:python|javascript|typescript|c\+\+|html|css|sql|coding|debug|algorithm|function\s*\()\b/i,
  /\b(?:capital\s+of|weather\s+in|who\s+won|stock\s+price|president\s+of|tell\s+(?:me\s+)?a\s+joke|write\s+(?:me\s+)?a\s+poem)\b/i,
  /\b(?:crypto|bitcoin|ethereum|forex|invest|nifty|sensex)\b/i,
  /^(?:hi|hello|hey|test\w*|asdf\w*|qwerty\w*|zzz+|aaa+|123+)[.!?\s]*$/i,
];

/** Strict JSON schema passed to Google Gemini API for deterministic structured output */
const GEMINI_ASSESSMENT_RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    urgency: { type: "STRING", enum: ["LOW", "MODERATE", "EMERGENCY", "ERROR"] },
    specialty: {
      type: "STRING",
      enum: [
        "Cardiology",
        "Dermatology",
        "Endocrinology",
        "Gastroenterology",
        "General Practice",
        "Gynecology",
        "Neurology",
        "Ophthalmology",
        "Orthopedics",
        "Pediatrics",
        "Pulmonology",
        "Psychiatry",
        "Emergency Care",
        "Error",
      ],
    },
    reason: { type: "STRING" },
    guidance: { type: "STRING" },
  },
  required: ["urgency", "specialty", "reason", "guidance"],
} as const;

const ASSESSMENT_SYSTEM_INSTRUCTION = `You are LifeLink's clinical health-triage decision-support assistant.
Do not diagnose, prescribe, claim certainty, or replace professional care. Return only the requested JSON.
Use short, calm, objective, non-diagnostic reasoning. If potentially urgent, choose MODERATE or EMERGENCY and direct the person to appropriate in-person care. For EMERGENCY, guidance must say to seek emergency care or contact a local emergency number now.

CRITICAL INSTRUCTION — SYSTEM DOCTOR SPECIALTY RESTRICTION:
LifeLink ONLY has doctors in 12 specific medical specialties. You MUST ONLY recommend a specialty from this closed list:
1. "Cardiology" — Heart, blood pressure, cardiovascular symptoms, palpitations.
2. "Dermatology" — Skin, rashes, eczema, acne, hair, nails, suspicious lesions.
3. "Endocrinology" — Diabetes, thyroid disorders, hormonal imbalances, metabolic issues.
4. "Gastroenterology" — Stomach, abdominal pain, acid reflux, digestion, liver, bowel changes.
5. "General Practice" — General illness, fever, flu/colds, infections, non-specific symptoms, or conditions where no other listed specialty fits (e.g. ENT, oncology, urology, nephrology).
6. "Gynecology" — Female reproductive health, menstrual disorders for adult biological females (18+).
7. "Neurology" — Brain, nervous system, chronic headaches, migraines, nerve pain, numbness, dizziness.
8. "Ophthalmology" — Eye conditions, vision changes, eye pain, redness, discharge.
9. "Orthopedics" — Bones, joints, muscles, spine/back pain, fractures, arthritis, sprains.
10. "Pediatrics" — Any and all symptoms for patients under 18 years of age.
11. "Pulmonology" — Lungs, respiratory system, chronic cough, shortness of breath, asthma.
12. "Psychiatry" — Mental health, anxiety, depression, mood changes, insomnia, emotional distress.

SPECIALTY RESTRICTIONS:
- NEVER output any specialty outside this exact list (do NOT output "Internal Medicine", "Oncology", "ENT", "Otolaryngology", "Nephrology", "Urology", "Rheumatology", "General Surgery", etc.).
- If symptoms relate to an unlisted field (such as ear/nose/throat, kidney, cancer, or general weakness), map them to "General Practice" or the closest matching system specialty above.
- If urgency is "EMERGENCY", specialty must be "Emergency Care".
- If input is non-health/nonsense, specialty must be "Error".

CRITICAL CLINICAL RULES FOR GENDER AND AGE:

1. GENDER BIOLOGICAL CONSISTENCY:
- If gender is "Man": Pregnancy, menstrual cycles, missed periods, uterine, ovarian, cervical, vaginal, and female reproductive conditions are biologically impossible. You must NEVER suggest pregnancy or female gynecological causes for a Man. Direct female-specific conditions to General Practice.
- Male breast tissue enlargement/tenderness (Gynecomastia) or male hormonal issues in men are valid male conditions that MUST be assigned to "Endocrinology" (or "General Practice").
- If gender is "Woman": Assess age-appropriately without making premature or inappropriate assumptions.
- If gender is "Other": Avoid unverified anatomical assumptions. Recommend in-person evaluation with a physician.

2. PEDIATRIC & ADOLESCENT SAFEGUARDS (AGE UNDER 18):
- If patient age is under 18 (e.g. children and adolescents aged 0-17, including ages 12 and 15):
  * Set specialty strictly to "Pediatrics".
  * For adolescent females (ages 10-17) reporting missed or irregular periods, nausea, fatigue, or spotting: DO NOT assume or lead with adult pregnancy. Highlight that irregular cycles, anovulation, and hormonal fluctuations are very common and normal during the first 2-3 years after menarche due to pubertal development, growth, stress, or nutrition.
  * Always include guidance to discuss symptoms with a parent, guardian, or trusted pediatrician/adolescent care provider for age-appropriate evaluation.

3. STRICTLY MEDICAL ASSISTANT:
- You are strictly a medical assistant. If the user input in symptoms or conditions is nonsense, gibberish, conversational, or entirely unrelated to health/medical symptoms, you MUST return:
  * urgency: "ERROR"
  * specialty: "Error"
  * reason: "The input is not related to health symptoms."
  * guidance: "The Input is not related towards the symptoms please try again later"
- Do NOT answer general knowledge questions, write code, or engage in non-medical chat.`;

export function hasEmergencyPattern(symptoms: string): boolean {
  return EMERGENCY_PATTERNS.some((pattern) => pattern.test(symptoms.trim()));
}

export function emergencyOverride(): AssessmentResult {
  return {
    urgency: "EMERGENCY",
    specialty: "Emergency Care",
    reason: "A deterministic safety check detected symptom wording that may indicate an emergency. This tool cannot determine severity or make a diagnosis.",
    guidance: "Seek immediate in-person emergency care or contact your local emergency number now. Do not rely on this screen for diagnosis or treatment.",
  };
}

export function hasNonMedicalPattern(text: string): boolean {
  return NON_MEDICAL_PATTERNS.some((pattern) => pattern.test(text.trim()));
}

export function nonMedicalOverride(): AssessmentResult {
  return {
    urgency: "ERROR",
    specialty: "Error",
    reason: "The input is not related to health symptoms.",
    guidance: "The Input is not related towards the symptoms please try again later",
  };
}

export function biologicalOverride(message: string, age?: number): AssessmentResult {
  return {
    urgency: "LOW",
    specialty: age !== undefined && age < 18 ? "Pediatrics" : "General Practice",
    reason: "A deterministic safety check detected symptoms that are biologically impossible for the stated gender.",
    guidance: message,
  };
}

export function normalizeSpecialtyToSystem(
  specialty: string,
  age: number,
  urgency: string,
  gender?: string
): (typeof ALL_SYSTEM_SPECIALTIES)[number] {
  if (urgency === "EMERGENCY") return "Emergency Care";
  if (urgency === "ERROR") return "Error";
  if (age < 18) return "Pediatrics";

  const lower = specialty.trim().toLowerCase();
  const isMale = gender ? /^(?:man|male)$/i.test(gender.trim()) : false;

  // Male breast tissue (Gynecomastia), male hormonal disorders, hypogonadism, low testosterone, male infertility -> Endocrinology
  if (/\b(?:gynecomast\w*|male\s+breast\w*|hypogonadism|testosterone|andropause|male\s+infertility)\b/i.test(lower)) {
    return "Endocrinology";
  }

  // Male urological conditions (prostate, testicle, scrotum, penis, erectile dysfunction) -> General Practice
  if (isMale && /\b(?:prostat\w*|testic\w*|penis|penile|scrot\w*|erectile\s+dysfunction|balanitis|phimosis|varicocele|hydrocele|spermatocele)\b/i.test(lower)) {
    return "General Practice";
  }

  // Direct exact match
  const exact = SYSTEM_DOCTOR_SPECIALTIES.find((s) => s.toLowerCase() === lower);
  if (exact) {
    if (isMale && exact === "Gynecology") return "General Practice";
    return exact;
  }

  // 1. Cardiology (Cardiovascular)
  if (
    /\b(?:cardio\w*|heart(?!burn)\w*|palpitat\w*|arrhythm\w*|tachycard\w*|bradycard\w*|angina\w*|hypertens\w*|blood\s*pressur\w*|coronary\w*|valvular\w*|cholesterol\w*)/i.test(lower)
  ) {
    return "Cardiology";
  }

  // 2. Dermatology (Integumentary)
  if (
    /\b(?:derma\w*|skin\w*|rash\w*|eczema\w*|psoriasis\w*|acne\w*|urticaria\w*|hives\w*|prurit\w*|itch\w*|lesion\w*|melanom\w*|mole\w*|alopecia\w*|scalp\w*|nail\w*|fungal\w*|blister\w*)/i.test(lower)
  ) {
    return "Dermatology";
  }

  // 3. Endocrinology (Hormonal / Metabolic / Gynecomastia / Thyroid / Diabetes / Testicular Hormones)
  if (
    /\b(?:endo\w*|diabet\w*|thyroid\w*|hormon\w*|metabol\w*|adrenal\w*|pituitary\w*|insulin\w*|glucose\w*|goiter\w*|hashimoto\w*|cushing\w*|gynecomast\w*|hypogonadism|testosterone)\b/i.test(lower)
  ) {
    return "Endocrinology";
  }

  // 4. Gastroenterology (Digestive)
  if (
    /\b(?:gastro\w*|digest\w*|stomach\w*|bowel\w*|colon\w*|acid\s*reflux|gerd|heartburn\w*|nausea\w*|vomit\w*|diarrhea\w*|constipat\w*|intestin\w*|liver\w*|hepat\w*|jaundice\w*|ulcer\w*|gastrit\w*|celiac\w*|ibs|crohn\w*)/i.test(lower)
  ) {
    return "Gastroenterology";
  }

  // 5. Gynecology (Female Reproductive - Adult biological females only)
  if (
    !isMale &&
    /\b(?:gyne\w*|obste\w*|women\w*|uter\w*|ovar\w*|cervix\w*|cervic\w*|vagin\w*|vulv\w*|pelvic\w*|menstru\w*|period\w*|menopaus\w*|pcos|endometri\w*)/i.test(lower)
  ) {
    return "Gynecology";
  }

  // 6. Neurology (Nervous System)
  if (
    /\b(?:neuro\w*|brain\w*|nerve\w*|headache\w*|migraine\w*|vertigo\w*|dizzi\w*|seizur\w*|epilep\w*|neuropath\w*|numb\w*|tingl\w*|tremor\w*|concuss\w*|parkinson\w*|alzheim\w*|stroke\w*|paralys\w*)/i.test(lower)
  ) {
    return "Neurology";
  }

  // 7. Ophthalmology (Visual System)
  if (
    /\b(?:ophthal\w*|eye\w*|vision\w*|ocular\w*|cornea\w*|retina\w*|glaucoma\w*|cataract\w*|conjunctiv\w*|pink\s*eye|floaters|myopia|astigmat\w*)/i.test(lower)
  ) {
    return "Ophthalmology";
  }

  // 8. Orthopedics (Musculoskeletal)
  if (
    /\b(?:ortho\w*|bone\w*|joint\w*|spine\w*|muscl\w*|skelet\w*|fractur\w*|sprain\w*|strain\w*|arthrit\w*|cartilage\w*|ligament\w*|tendon\w*|knee\w*|back\s*pain|neck\s*pain|shoulder\w*|hip\w*|sciatica\w*|scoliosis\w*)/i.test(lower)
  ) {
    return "Orthopedics";
  }

  // 9. Pulmonology (Respiratory)
  if (
    /\b(?:pulmo\w*|lung\w*|respirat\w*|breath\w*|cough\w*|asthma\w*|bronch\w*|pneumon\w*|copd|wheez\w*|emphysema\w*|pleurisy|sleep\s*apnea)/i.test(lower)
  ) {
    return "Pulmonology";
  }

  // 10. Psychiatry (Mental Health)
  if (
    /\b(?:psych\w*|mental\w*|depress\w*|anxi\w*|bipolar\w*|schizo\w*|phobia\w*|ptsd|trauma\w*|stress\w*|insomnia\w*|panic\w*|obsess\w*|ocd|mood\w*|adhd)/i.test(lower)
  ) {
    return "Psychiatry";
  }

  // 11. Pediatrics (Patients under 18 handled at top, keyword fallback for completeness)
  if (/\b(?:pedia\w*|child\w*|infant\w*|toddler\w*|newborn\w*|adolescen\w*)/i.test(lower)) {
    return "Pediatrics";
  }

  // Default fallback for any general/unlisted conditions (ENT, oncology, nephrology, urology, general malaise)
  return "General Practice";
}

function cleanJsonString(content: string): string {
  const trimmed = content.trim();
  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1);
  }
  return trimmed.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
}

function parseModelContent(content: string | unknown[], input: AssessmentRequest): AssessmentResult {
  if (typeof content !== "string") throw new Error("Gemini returned a non-text assessment response.");
  const cleaned = cleanJsonString(content);
  const parsed = assessmentResultSchema.parse(JSON.parse(cleaned));

  // Normalize specialty to guarantee it is strictly present in LifeLink's system
  const strictSpecialty = normalizeSpecialtyToSystem(parsed.specialty, input.age, parsed.urgency, input.gender);

  // Pediatric safeguard (< 18)
  if (input.age < 18) {
    // Adolescents (e.g. 10-16): Do not falsely suggest adult pregnancy for general pubertal menstrual irregularities
    if (input.age <= 16 && /\bpregnan/i.test(parsed.reason + " " + parsed.guidance)) {
      return {
        urgency: "LOW",
        specialty: "Pediatrics",
        reason: `In adolescents aged ${input.age}, missed or irregular menstrual cycles accompanied by fatigue or mild nausea are very commonly due to normal pubertal development, anovulatory cycles during the early post-menarche years, hormonal adjustments, stress, or nutritional factors.`,
        guidance: "Discuss these symptoms with a parent or guardian and consult a pediatrician or adolescent health specialist for an age-appropriate evaluation.",
      };
    }
  }

  // Gender safeguard for Men
  if (input.gender.toLowerCase() === "man" || input.gender.toLowerCase() === "male") {
    const fullText = (parsed.reason + " " + parsed.guidance + " " + input.symptoms).toLowerCase();
    const isMaleValidCondition = /\b(?:gynecomast\w*|male\s+breast\w*|hypogonadism|testosterone|andropause|male\s+infertility|prostat\w*|testic\w*|penis|penile|scrot\w*|erectile\s+dysfunction)\b/i.test(fullText);

    if (!isMaleValidCondition && /\bpregnan|menstrua|period|ovary|ovarian|uterine|uterus|cervix|cervical\b/i.test(fullText)) {
      return {
        urgency: "LOW",
        specialty: input.age < 18 ? "Pediatrics" : "General Practice",
        reason: "Symptoms involving pregnancy or female reproductive cycles are biologically inconsistent with male anatomy.",
        guidance: "Please review your reported symptoms or consult a general physician for non-gynecological evaluation.",
      };
    }
  }

  return {
    urgency: parsed.urgency,
    specialty: strictSpecialty,
    reason: parsed.reason,
    guidance: parsed.guidance,
  };
}

function assessmentPrompt(input: AssessmentRequest): string {
  return JSON.stringify({
    symptoms: input.symptoms,
    age: input.age,
    gender: input.gender,
    existingConditions: input.conditions ?? "",
    symptomDuration: input.duration,
    clinicalContext: input.age < 18 ? `Pediatric patient aged ${input.age}. Prioritize pediatric and adolescent health considerations.` : "Adult patient.",
  });
}

async function invokeGemini(input: AssessmentRequest): Promise<AssessmentResult> {
  const apiKey = ENV.geminiApiKey || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Gemini API key is not configured");
  }

  const candidateModels = [
    "gemini-3.5-flash-lite",
    "gemini-3.5-flash",
    "gemini-3.1-flash-lite",
    "gemini-3.7-flash",
    "gemini-2.5-flash",
    "gemini-2.0-flash",
    "gemini-1.5-flash",
    "gemini-1.5-pro",
    "gemini-1.5-flash-8b",
    "gemini-1.0-pro",
    "gemini-pro"
  ];
  let lastError: Error | null = null;

  for (const model of candidateModels) {
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: `${ASSESSMENT_SYSTEM_INSTRUCTION}\n\nPatient-provided information:\n${assessmentPrompt(input)}` }]
          }],
          generationConfig: {
            responseMimeType: "application/json",
            responseSchema: GEMINI_ASSESSMENT_RESPONSE_SCHEMA,
            temperature: 0.2,
            maxOutputTokens: 600,
          }
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        lastError = new Error(`Gemini (${model}) request failed: ${response.status} ${errorText}`);
        continue;
      }

      const payload = await response.json();
      const content = payload.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
      return parseModelContent(content, input);
    } catch (err: any) {
      lastError = err;
    }
  }

  throw lastError ?? new Error("All Gemini models failed to process the assessment");
}

export function fallbackAssessment(input: AssessmentRequest): AssessmentResult {
  const specialty = normalizeSpecialtyToSystem(input.symptoms, input.age, "MODERATE", input.gender);
  return {
    urgency: "MODERATE",
    specialty,
    reason: "The AI assessment service is currently operating in safe offline decision-support mode. Symptoms were evaluated using deterministic clinical rules.",
    guidance: "Please consult a doctor or specialist for comprehensive in-person evaluation. If symptoms worsen or you experience severe distress, seek immediate emergency medical care.",
  };
}

/**
 * Server-only decision support. The configured Gemini credential is used only
 * on the backend. Deterministic red-flag and biological overrides always outrank model output.
 */
export async function analyzeAssessmentWithGemini(input: AssessmentRequest): Promise<AssessmentResult> {
  // 1. Biological Impossibility Check (combines symptoms + preexisting conditions)
  const combinedClinicalText = [input.symptoms, input.conditions].filter(Boolean).join(" ");
  const bioError = checkBiologicalImpossibility(combinedClinicalText, input.gender);
  if (bioError) return biologicalOverride(bioError, input.age);

  // 2. Deterministic Non-Medical Pre-Filter
  if (hasNonMedicalPattern(input.symptoms)) {
    return nonMedicalOverride();
  }

  // 3. Deterministic Emergency Red-Flag Pre-Filter
  if (hasEmergencyPattern(input.symptoms)) {
    return emergencyOverride();
  }

  // 4. Invocation of Gemini AI with multi-model fallback cascade
  try {
    return await invokeGemini(input);
  } catch {
    // 5. Graceful fallback if offline or quota exceeded
    return fallbackAssessment(input);
  }
}

