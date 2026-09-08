import { describe, expect, it } from "vitest";
import { hashPatientPassword, verifyPatientPassword } from "./nativePatientAuth";

describe("native patient credentials", () => {
  it("verifies the original password and rejects a different password", async () => {
    const storedHash = await hashPatientPassword("correct-horse-battery-staple");

    await expect(verifyPatientPassword("correct-horse-battery-staple", storedHash)).resolves.toBe(true);
    await expect(verifyPatientPassword("incorrect-password", storedHash)).resolves.toBe(false);
  });

  it("rejects a malformed stored credential hash", async () => {
    await expect(verifyPatientPassword("any-password", "invalid")).resolves.toBe(false);
  });
});
