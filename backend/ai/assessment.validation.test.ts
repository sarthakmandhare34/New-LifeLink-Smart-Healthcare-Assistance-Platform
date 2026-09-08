import { describe, expect, it } from "vitest";
import { assessmentRequestInput } from "./assessmentService";

describe("assessment persistence input", () => {
  const validAssessment = {
    symptoms: "Mild headache for one day",
    age: 30,
    gender: "Other",
    conditions: "",
    duration: "< 24 hours",
  };

  it("accepts a complete assessment record", () => {
    expect(assessmentRequestInput.parse(validAssessment)).toEqual(validAssessment);
  });

  it("rejects invalid assessment ages and missing demographic input", () => {
    expect(() => assessmentRequestInput.parse({ ...validAssessment, age: 121 })).toThrow();
    expect(() => assessmentRequestInput.parse({ ...validAssessment, gender: "" })).toThrow();
  });
});
