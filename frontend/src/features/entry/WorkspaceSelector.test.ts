import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const selectorSource = readFileSync(resolve(process.cwd(), "frontend/src/features/entry/WorkspaceSelector.tsx"), "utf8");
const appSource = readFileSync(resolve(process.cwd(), "frontend/src/App.tsx"), "utf8");
const styleSource = readFileSync(resolve(process.cwd(), "frontend/src/index.css"), "utf8");

describe("workspace selector entry flow", () => {
  it("keeps separate patient and doctor login destinations", () => {
    expect(selectorSource).toContain('openWorkspace("patient", "/login")');
    expect(selectorSource).toContain('openWorkspace("clinician", "/doctor/login")');
    expect(appSource).toContain('<Route path="/" element={<WorkspaceSelector />} />');
  });

  it("keeps concise clinician workspace wording and a switch transition", () => {
    expect(selectorSource).toContain("Clinician workspace");
    expect(selectorSource).toContain("Review assigned appointments and patient context.");
    expect(selectorSource).not.toContain("separate email and password");
    expect(selectorSource).not.toContain("Accept or decline pending appointment requests");
    expect(selectorSource).toContain("Opening clinician workspace");
    expect(selectorSource).toContain("prefers-reduced-motion: reduce");
  });

  it("uses the clinical-portal header without unsafe clinical or emergency claims", () => {
    expect(selectorSource).toContain('className="workspace-portal-header"');
    expect(selectorSource).toContain("Patient-owned records");
    expect(selectorSource).toContain("Secure care portal");
    expect(selectorSource).not.toContain("controlled clinician portal");
    expect(selectorSource).not.toContain("remain controlled and non-verified");
    expect(selectorSource).not.toContain("Emergency assistance is user-controlled.");
    expect(selectorSource).not.toContain("does not dispatch an ambulance");
    expect(selectorSource).not.toContain("Verified clinical practitioner");
    expect(selectorSource).not.toContain("Ambulance dispatch");
  });

  it("keeps entry text and glass cards high contrast in dark mode", () => {
    expect(styleSource).toContain(':root[data-theme="dark"] .workspace-choice-card');
    expect(styleSource).toContain(':root[data-theme="dark"] .workspace-entry-note');
    expect(styleSource).toContain(':root[data-theme="dark"] .workspace-entry-header h1');
  });
});
