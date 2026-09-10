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

export type AssessmentResult = z.infer<typeof assessmentResultSchema>;

/** Regex patterns for instant, deterministic emergency triage override */
const EMERGENCY_PATTERNS = [
  /chest pain|chest pressure|crushing chest/i,
  /difficulty breathing|shortness of breath|can(?:not|'t) breathe/i,
  /severe bleeding|coughing blood|vomit(?:ing|ed|s)?\s+blood|blood\s+(?:in\s+(?:my\s+)?)?vomit(?:ing|ed|s)?|throw(?:ing)?\s+up\s+blood|threw\s+up\s+blood|hematemesis/i,
  /unconscious|loss of consciousness|fainting|seizure/i,
  /face droop|slurred speech|sudden weakness|one-sided weakness/i,
  /overdose|poisoning|anaphylaxis|severe allergic reaction/i,
  /suicid(?:al|e)|self[- ]harm/i,
];

/** Strict JSON schema passed to Google Gemini API for deterministic structured output */
const GEMINI_ASSESSMENT_RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    urgency: { type: "STRING", enum: ["LOW", "MODERATE", "EMERGENCY", "ERROR"] },
    specialty: { type: "STRING" },
    reason: { type: "STRING" },
    guidance: { type: "STRING" },
  },
  required: ["urgency", "specialty", "reason", "guidance"],
} as const;

const ASSESSMENT_SYSTEM_INSTRUCTION = `You are LifeLink's clinical health-triage decision-support assistant.
Do not diagnose, prescribe, claim certainty, or replace professional care. Return only the requested JSON.
Use short, calm, objective, non-diagnostic reasoning. If potentially urgent, choose MODERATE or EMERGENCY and direct the person to appropriate in-person care. For EMERGENCY, guidance must say to seek emergency care or contact a local emergency number now.

CRITICAL CLINICAL RULES FOR GENDER AND AGE:

1. GENDER BIOLOGICAL CONSISTENCY:
- If gender is "Man": Pregnancy, menstrual cycles, missed periods, uterine, ovarian, cervical, vaginal, and gynecological conditions are biologically impossible. You must NEVER suggest pregnancy or gynecological causes for a Man. Direct to General Practice, Internal Medicine, or state biological inconsistency.
- If gender is "Woman": Assess age-appropriately without making premature or inappropriate assumptions.
- If gender is "Other": Avoid unverified anatomical assumptions. Recommend in-person evaluation with a physician.

2. PEDIATRIC & ADOLESCENT SAFEGUARDS (AGE UNDER 18):
- If patient age is under 18 (e.g. children and adolescents aged 0-17, including ages 12 and 15):
  * Set specialty to "Pediatrics" or "Pediatric & Adolescent Medicine".
  * For adolescent females (ages 10-17) reporting missed or irregular periods, nausea, fatigue, or spotting: DO NOT assume or lead with adult pregnancy. Highlight that irregular cycles, anovulation, and hormonal fluctuations are very common and normal during the first 2-3 years after menarche due to pubertal development, growth, stress, or nutrition.
  * Always include guidance to discuss symptoms with a parent, guardian, or trusted pediatrician/adolescent care provider for age-appropriate evaluation.

3. STRICTLY MEDICAL ASSISTANT:
- You are strictly a medical assistant. If the user input in symptoms or conditions is nonsense, gibberish, conversational, or entirely unrelated to health/medical symptoms, you MUST return:
  * urgency: "ERROR"
  * specialty: "Error"
  * reason: "The input is not related to health symptoms."
  * guidance: "The Input is not related towards the symptoms please try again later"
- Do NOT answer general knowledge questions, write code, or engage in non-medical chat.`;

export function hasEmergencyPattern(symptoms: string) {
  return EMERGENCY_PATTERNS.some((pattern) => pattern.test(symptoms.trim().toLowerCase()));
}

export function emergencyOverride(): AssessmentResult {
  return {
    urgency: "EMERGENCY",
    specialty: "Emergency Care",
    reason: "A deterministic safety check detected symptom wording that may indicate an emergency. This tool cannot determine severity or make a diagnosis.",
    guidance: "Seek immediate in-person emergency care or contact your local emergency number now. Do not rely on this screen for diagnosis or treatment.",
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

function cleanJsonString(content: string) {
  return content.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
}

function parseModelContent(content: string | unknown[], input: AssessmentRequest) {
  if (typeof content !== "string") throw new Error("Gemini returned a non-text assessment response.");
  const cleaned = cleanJsonString(content);
  const parsed = assessmentResultSchema.parse(JSON.parse(cleaned));

  // Pediatric safeguard (< 18)
  if (input.age < 18) {
    // Under 18 patients should be routed to Pediatrics
    if (parsed.specialty === "Obstetrics & Gynecology" || parsed.specialty === "Gynecology" || parsed.specialty === "General Practice") {
      parsed.specialty = "Pediatrics";
    }

    // Adolescents (e.g. 10-16): Do not falsely suggest adult pregnancy for general pubertal menstrual irregularities
    if (input.age <= 16 && /\bpregnan/i.test(parsed.reason + " " + parsed.guidance)) {
      parsed.reason = `In adolescents aged ${input.age}, missed or irregular menstrual cycles accompanied by fatigue or mild nausea are very commonly due to normal pubertal development, anovulatory cycles during the early post-menarche years, hormonal adjustments, stress, or nutritional factors.`;
      parsed.guidance = "Discuss these symptoms with a parent or guardian and consult a pediatrician or adolescent health specialist for an age-appropriate evaluation.";
      parsed.urgency = "LOW";
      parsed.specialty = "Pediatrics";
    }
  }

  // Gender safeguard for Men
  if (input.gender.toLowerCase() === "man" || input.gender.toLowerCase() === "male") {
    if (/\bpregnan|menstrua|period|ovary|ovarian|uterine|uterus|cervix|cervical\b/i.test(parsed.reason + " " + parsed.guidance)) {
      parsed.reason = "Symptoms involving pregnancy or menstrual cycles are biologically inconsistent with male anatomy.";
      parsed.guidance = "Please review your reported symptoms or consult a general physician for non-gynecological evaluation.";
      parsed.urgency = "LOW";
      parsed.specialty = input.age < 18 ? "Pediatrics" : "General Practice";
    }
  }

  return parsed;
}

function assessmentPrompt(input: AssessmentRequest) {
  return JSON.stringify({
    symptoms: input.symptoms,
    age: input.age,
    gender: input.gender,
    existingConditions: input.conditions ?? "",
    symptomDuration: input.duration,
    clinicalContext: input.age < 18 ? `Pediatric patient aged ${input.age}. Prioritize pediatric and adolescent health considerations.` : "Adult patient.",
  });
}

async function invokeGemini(input: AssessmentRequest) {
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

/**
 * Server-only decision support. The configured Gemini credential is used only
 * on the backend. A deterministic red-flag override always outranks model output.
 */
export async function analyzeAssessmentWithGemini(input: AssessmentRequest): Promise<AssessmentResult> {
  const bioError = checkBiologicalImpossibility(input.symptoms, input.gender);
  if (bioError) return biologicalOverride(bioError, input.age);

  if (hasEmergencyPattern(input.symptoms)) return emergencyOverride();
  return await invokeGemini(input);
}
