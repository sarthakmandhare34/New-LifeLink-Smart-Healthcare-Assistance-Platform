import { describe, expect, it } from "vitest";
import {
  analyzeAssessmentWithGemini,
  assessmentRequestInput,
  emergencyOverride,
  fallbackAssessment,
  hasEmergencyPattern,
  hasNonMedicalPattern,
  normalizeSpecialtyToSystem,
  SYSTEM_DOCTOR_SPECIALTIES,
} from "./assessmentService";

describe("deterministic emergency assessment safety", () => {
  it.each([
    "chest pain",
    "difficulty breathing",
    "vomiting blood",
    "I threw up blood",
    "blood in my vomit",
    "hematemesis",
    "unconscious",
    "sudden weakness",
  ])(
    "recognizes the emergency wording variation: %s",
    (symptoms) => expect(hasEmergencyPattern(symptoms)).toBe(true),
  );

  it("returns the emergency override before any model result can lower urgency", () => {
    expect(emergencyOverride()).toMatchObject({
      urgency: "EMERGENCY",
      specialty: "Emergency Care",
    });
  });

  it("short-circuits a red-flag assessment to the emergency override", async () => {
    await expect(analyzeAssessmentWithGemini({
      symptoms: "vomiting blood",
      age: 30,
      gender: "Other",
      conditions: "",
      duration: "< 24 hours",
    })).resolves.toMatchObject({ urgency: "EMERGENCY", specialty: "Emergency Care" });
  });

  it("handles biological impossibility override correctly", async () => {
    const result = await analyzeAssessmentWithGemini({
      symptoms: "severe period pain and ovarian cramps",
      age: 28,
      gender: "Man",
      conditions: "",
      duration: "2 days",
    });
    expect(result.urgency).toBe("LOW");
    expect(result.specialty).toBe("General Practice");
    expect(result.reason).toContain("biologically impossible");
  });

  it("rejects missed period and pregnancy symptoms for Man", async () => {
    const result = await analyzeAssessmentWithGemini({
      symptoms: "A missed period accompanied by nausea, fatigue, and light spotting",
      age: 25,
      gender: "Man",
      conditions: "",
      duration: "1 week",
    });
    expect(result.urgency).toBe("LOW");
    expect(result.specialty).toBe("General Practice");
    expect(result.guidance).toContain("female-specific biological references");
  });

  it("applies pediatric specialty for underage patients in biological override", async () => {
    const result = await analyzeAssessmentWithGemini({
      symptoms: "A missed period accompanied by nausea, fatigue, and light spotting",
      age: 12,
      gender: "Man",
      conditions: "",
      duration: "1 week",
    });
    expect(result.urgency).toBe("LOW");
    expect(result.specialty).toBe("Pediatrics");
  });

  it("permits male breast enlargement (gynecomastia) without triggering female biological error and routes to Endocrinology", async () => {
    const result = fallbackAssessment({
      symptoms: "Swelling and mild tenderness in male breast tissue (gynecomastia)",
      age: 28,
      gender: "Man",
      conditions: "Hormonal imbalance",
      duration: "2 months",
    });
    expect(result.urgency).toBe("MODERATE");
    expect(result.specialty).toBe("Endocrinology");
    expect(result.reason).not.toContain("biologically impossible");
  });

  it("rejects non-medical nonsense or conversational text with ERROR", async () => {
    const originalFetch = global.fetch;
    const mockApiKey = "test-key";
    process.env.GEMINI_API_KEY = mockApiKey;
    global.fetch = async () => ({
      ok: true,
      json: async () => ({
        candidates: [{
          content: { parts: [{ text: JSON.stringify({
            urgency: "ERROR",
            specialty: "Error",
            reason: "The input is not related to health symptoms.",
            guidance: "The Input is not related towards the symptoms please try again later"
          })}] }
        }]
      })
    }) as any;

    try {
      const result = await analyzeAssessmentWithGemini({
        symptoms: "What is the capital of France? Also how do I bake a cake?",
        age: 30,
        gender: "Woman",
        conditions: "",
        duration: "1 day",
      });
      expect(result.urgency).toBe("ERROR");
      expect(result.specialty).toBe("Error");
      expect(result.guidance).toBe("The Input is not related towards the symptoms please try again later");
    } finally {
      global.fetch = originalFetch;
      delete process.env.GEMINI_API_KEY;
    }
  });
});

describe("assessment input validation", () => {
  it("validates a complete, valid assessment input", () => {
    const input = {
      symptoms: "Mild persistent headache",
      age: 25,
      gender: "Woman",
      conditions: "Asthma",
      duration: "3 days",
    };
    expect(assessmentRequestInput.parse(input)).toEqual(input);
  });

  it("rejects invalid age (> 120 or negative)", () => {
    expect(() => assessmentRequestInput.parse({
      symptoms: "Headache",
      age: 150,
      gender: "Woman",
      duration: "1 day",
    })).toThrow();

    expect(() => assessmentRequestInput.parse({
      symptoms: "Headache",
      age: -5,
      gender: "Woman",
      duration: "1 day",
    })).toThrow();
  });

  it("rejects empty or whitespace-only symptoms", () => {
    expect(() => assessmentRequestInput.parse({
      symptoms: "   ",
      age: 30,
      gender: "Man",
      duration: "1 day",
    })).toThrow();
  });
});

describe("system doctor specialty restrictions", () => {
  it("contains exactly the 12 clinical specialties seeded in LifeLink", () => {
    expect(SYSTEM_DOCTOR_SPECIALTIES).toEqual([
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
    ]);
  });

  it("normalizes exact matching specialties correctly", () => {
    expect(normalizeSpecialtyToSystem("Cardiology", 35, "MODERATE")).toBe("Cardiology");
    expect(normalizeSpecialtyToSystem("Dermatology", 40, "LOW")).toBe("Dermatology");
    expect(normalizeSpecialtyToSystem("Orthopedics", 50, "LOW")).toBe("Orthopedics");
  });

  it("maps informal or clinical variants to exact in-system doctor specialties", () => {
    expect(normalizeSpecialtyToSystem("Cardiologist", 45, "MODERATE")).toBe("Cardiology");
    expect(normalizeSpecialtyToSystem("Skin Specialist", 30, "LOW")).toBe("Dermatology");
    expect(normalizeSpecialtyToSystem("Digestive Health / Stomach", 35, "LOW")).toBe("Gastroenterology");
    expect(normalizeSpecialtyToSystem("Brain & Nerves", 40, "LOW")).toBe("Neurology");
    expect(normalizeSpecialtyToSystem("Eye Care / Vision", 28, "LOW")).toBe("Ophthalmology");
    expect(normalizeSpecialtyToSystem("Bone / Joint Surgery", 60, "LOW")).toBe("Orthopedics");
    expect(normalizeSpecialtyToSystem("Respiratory / Lung Doctor", 55, "LOW")).toBe("Pulmonology");
  });

  it("maps unlisted medical fields (ENT, Oncology, Nephrology, Urology) to General Practice", () => {
    expect(normalizeSpecialtyToSystem("ENT", 35, "LOW")).toBe("General Practice");
    expect(normalizeSpecialtyToSystem("Oncology", 60, "LOW")).toBe("General Practice");
    expect(normalizeSpecialtyToSystem("Nephrology", 50, "LOW")).toBe("General Practice");
    expect(normalizeSpecialtyToSystem("Urology", 45, "LOW")).toBe("General Practice");
    expect(normalizeSpecialtyToSystem("Internal Medicine", 40, "LOW")).toBe("General Practice");
  });

  it("strictly enforces Pediatrics for any patient under 18 regardless of model output", () => {
    expect(normalizeSpecialtyToSystem("Cardiology", 15, "LOW")).toBe("Pediatrics");
    expect(normalizeSpecialtyToSystem("Dermatology", 10, "LOW")).toBe("Pediatrics");
    expect(normalizeSpecialtyToSystem("Gynecology", 16, "LOW")).toBe("Pediatrics");
    expect(normalizeSpecialtyToSystem("General Practice", 8, "LOW")).toBe("Pediatrics");
  });

  it("preserves Emergency Care and Error urgencies", () => {
    expect(normalizeSpecialtyToSystem("Cardiology", 40, "EMERGENCY")).toBe("Emergency Care");
    expect(normalizeSpecialtyToSystem("Anything", 30, "ERROR")).toBe("Error");
  });

  it("strictly prevents Gynecology from ever being assigned to a male patient", () => {
    expect(normalizeSpecialtyToSystem("Gynecology", 35, "LOW", "Man")).toBe("General Practice");
    expect(normalizeSpecialtyToSystem("Gynecology", 45, "LOW", "male")).toBe("General Practice");
    expect(normalizeSpecialtyToSystem("Gynecology", 30, "LOW", "Woman")).toBe("Gynecology");
  });

  it("routes male breast tissue enlargement (gynecomastia) strictly to Endocrinology", () => {
    expect(normalizeSpecialtyToSystem("Gynecomastia", 30, "LOW", "Man")).toBe("Endocrinology");
    expect(normalizeSpecialtyToSystem("male breast tissue pain", 35, "LOW", "male")).toBe("Endocrinology");
  });
});

describe("deterministic non-medical pattern detection", () => {
  it.each([
    "how to bake a cake",
    "give me a recipe for delicious pasta",
    "write a python function to sort an array",
    "what is the capital of France?",
    "tell me a joke please",
    "crypto bitcoin price today",
    "hello",
    "asdfghjkl",
  ])("flags non-health input: %s", (input) => {
    expect(hasNonMedicalPattern(input)).toBe(true);
  });

  it.each([
    "I have a fever and sore throat",
    "Chest pain after walking up stairs",
    "Severe headache and sensitivity to light",
    "Sharp knee pain after playing football",
  ])("passes legitimate medical symptoms: %s", (symptoms) => {
    expect(hasNonMedicalPattern(symptoms)).toBe(false);
  });
});

describe("deterministic offline fallback", () => {
  it("generates a safe, in-system specialist recommendation when offline", () => {
    const fallback = fallbackAssessment({
      symptoms: "Stomach ache and acid reflux",
      age: 32,
      gender: "Woman",
      conditions: "GERD",
      duration: "3 days",
    });
    expect(fallback.urgency).toBe("MODERATE");
    expect(fallback.specialty).toBe("Gastroenterology");
    expect(SYSTEM_DOCTOR_SPECIALTIES).toContain(fallback.specialty);
  });

  it("forces Pediatrics on offline fallback for pediatric patients", () => {
    const fallback = fallbackAssessment({
      symptoms: "High fever and rash",
      age: 8,
      gender: "Man",
      conditions: "",
      duration: "1 day",
    });
    expect(fallback.specialty).toBe("Pediatrics");
  });
});

describe("exhaustive multi-specialty clinical illness matrix", () => {
  it.each([
    { symptoms: "Heart palpitations, rapid racing heartbeat, and high blood pressure", age: 45, gender: "Man", expectedSpecialty: "Cardiology" },
    { symptoms: "Severe itchy red skin rash, eczema flare-ups, and flaky scalp", age: 30, gender: "Woman", expectedSpecialty: "Dermatology" },
    { symptoms: "Uncontrolled blood sugar levels, thyroid gland enlargement (goiter), and diabetes fatigue", age: 50, gender: "Woman", expectedSpecialty: "Endocrinology" },
    { symptoms: "Male breast tissue enlargement (gynecomastia) with tenderness and low testosterone", age: 29, gender: "Man", expectedSpecialty: "Endocrinology" },
    { symptoms: "Chronic stomach acid reflux, GERD heartburn, and upper abdominal pain after meals", age: 38, gender: "Man", expectedSpecialty: "Gastroenterology" },
    { symptoms: "Mild fever, sore throat, cold chills, and general body fatigue", age: 25, gender: "Woman", expectedSpecialty: "General Practice" },
    { symptoms: "Prostate enlargement symptoms, weak urinary stream, and frequent night urination", age: 62, gender: "Man", expectedSpecialty: "General Practice" },
    { symptoms: "Irregular menstrual cycles, heavy period cramps, and PCOS ovarian cysts", age: 26, gender: "Woman", expectedSpecialty: "Gynecology" },
    { symptoms: "Frequent migraine headaches, nerve tingling in hand, and vertigo dizziness", age: 34, gender: "Man", expectedSpecialty: "Neurology" },
    { symptoms: "Blurry vision, dry eyes, eye pain, and pink eye redness", age: 40, gender: "Woman", expectedSpecialty: "Ophthalmology" },
    { symptoms: "Severe lower back pain, knee joint stiffness, and osteoarthritis swelling", age: 55, gender: "Man", expectedSpecialty: "Orthopedics" },
    { symptoms: "High fever, ear ache, and pediatric sore throat", age: 7, gender: "Man", expectedSpecialty: "Pediatrics" },
    { symptoms: "Chronic dry cough, asthma wheezing, and respiratory shortness of breath", age: 42, gender: "Woman", expectedSpecialty: "Pulmonology" },
    { symptoms: "Severe panic attacks, generalized anxiety, insomnia, and persistent low mood", age: 27, gender: "Woman", expectedSpecialty: "Psychiatry" },
  ])("correctly evaluates and normalizes symptoms for $expectedSpecialty ($symptoms)", ({ symptoms, age, gender, expectedSpecialty }) => {
    const result = fallbackAssessment({
      symptoms,
      age,
      gender,
      conditions: "",
      duration: "3 days",
    });
    expect(result.specialty).toBe(expectedSpecialty);
    expect(SYSTEM_DOCTOR_SPECIALTIES).toContain(expectedSpecialty);
  });
});



