import { describe, expect, it } from "vitest";
import { analyzeAssessmentWithGemini, assessmentRequestInput, emergencyOverride, hasEmergencyPattern } from "./assessmentService";

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

