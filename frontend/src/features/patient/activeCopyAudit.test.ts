import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");
const finder = source("frontend/src/features/patient/Specialists/SpecialistFinder.tsx");
const appointments = source("frontend/src/features/patient/Appointments/Appointments.tsx");
const prescriptions = source("frontend/src/features/patient/Prescriptions/Prescriptions.tsx");
const settings = source("frontend/src/features/patient/Settings/Settings.tsx");

describe("active patient UI copy", () => {
  it("uses professional controlled-directory labels instead of legacy development placeholders", () => {
    expect(finder).toContain("Controlled directory");
    expect(finder).not.toContain("Development mock");
    expect(appointments).not.toContain("Mock directory specialist");
    expect(appointments).not.toContain("Development directory");
    expect(prescriptions).not.toContain("mock directory specialist");
    expect(prescriptions).not.toContain("Development directory");
  });

  it("does not promise notification, password, or deletion functionality that is unavailable", () => {
    expect(settings).toContain("Reminder delivery is not active yet.");
    expect(settings).toContain("Password changes are not available in this workspace.");
    expect(settings).toContain("Deletion requests are not available in this workspace.");
    expect(settings).not.toContain("Receive SMS/Email reminders");
    expect(settings).not.toContain("Last updated 30 days ago");
  });
});
