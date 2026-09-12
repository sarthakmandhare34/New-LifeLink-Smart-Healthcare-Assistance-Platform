import { useState } from "react";                                                         // React state hook for tracking UI transitions
import { ArrowRight, HeartPulse, LoaderCircle, ShieldCheck, Stethoscope } from "lucide-react"; // Healthcare and action icons
import { useNavigate } from "react-router-dom";                                            // Programmatic client router navigation hook
import { EntryThemeToggle } from "../../components/EntryThemeToggle";                      // Theme toggle button for login screens
import { LifeLinkLogo } from "../../components/brand/LifeLinkLogo";                        // LifeLink branded SVG logo component
import { Button } from "../../components/ui/Button";                                       // Accessible button component
import { Card } from "../../components/ui/Card";                                           // Glassmorphic container card component

// Feature highlights displayed on the patient portal card
const patientHighlights = [
  "Manage your own health profile and care records",                                       // Self-owned medical health passport
  "Request appointments from the controlled Mumbai directory",                             // Specialist scheduling across Mumbai transit lines
  "Use protected assessment, medicine, and emergency tools",                               // AI triage and SOS quick-dial
];

// Feature highlights displayed on the clinician workspace card
const doctorHighlights = [
  "Open the protected clinician workspace",                                                // Clinician-authenticated portal
  "Review only appointments assigned to your account",                                     // Privacy boundary protecting patient records
];

type Workspace = "patient" | "clinician";                                                  // Available portal destinations

// Gateway landing component enabling users to route between patient and clinician portals
export const WorkspaceSelector = () => {
  const navigate = useNavigate();                                                          // Navigation function
  const [switchingTo, setSwitchingTo] = useState<Workspace | null>(null);                  // Active transition state ('patient' | 'clinician' | null)

  // Smoothly transitions into the chosen portal with a subtle delay for glass animations
  const openWorkspace = (workspace: Workspace, path: string) => {
    if (switchingTo) return;                                                               // Prevent multiple clicks
    setSwitchingTo(workspace);                                                             // Trigger transition state
    const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches; // Check accessibility motion preference
    window.setTimeout(() => navigate(path), reducedMotion ? 0 : 180);                      // Navigate after brief visual confirmation
  };

  const openingPatient = switchingTo === "patient";                                        // True while loading patient portal
  const openingClinician = switchingTo === "clinician";                                    // True while loading clinician portal

  return (
    <main
      className={`workspace-entry${switchingTo ? " is-switching" : ""}`}
      aria-labelledby="workspace-entry-heading"
      aria-busy={Boolean(switchingTo)}
    >
      <header className="workspace-portal-header" aria-label="LifeLink portal header">
        <div className="workspace-portal-brand">
          <span className="workspace-portal-mark" aria-hidden="true">
            <HeartPulse size={22} />
          </span>
          <span>
            <strong>LifeLink</strong>
            <small>Secure care portal</small>
          </span>
        </div>
        <div className="workspace-portal-assurance">
          <ShieldCheck size={16} aria-hidden="true" />
          <span>Patient-owned records</span>
        </div>
        <EntryThemeToggle />
      </header>

      <section className="workspace-entry-shell">
        <header className="workspace-entry-header">
          <LifeLinkLogo className="lifelink-logo-auth workspace-entry-logo" />
          <span className="workspace-entry-kicker">LifeLink connected care</span>
          <h1 id="workspace-entry-heading">Choose your care workspace</h1>
          <p>Select the secure account space that matches your care task.</p>
        </header>

        <div className="workspace-entry-grid">
          <Card variant="glass" className="workspace-choice-card">
            <div className="workspace-choice-topline">
              <span className="workspace-choice-icon patient">
                <HeartPulse size={22} />
              </span>
              <span className="workspace-choice-label">Patient Portal</span>
            </div>
            <h2>Personal health workspace</h2>
            <p>Manage your health information and care requests.</p>
            <ul className="workspace-choice-list">
              {patientHighlights.map((item) => (
                <li key={item}>
                  <ShieldCheck size={16} aria-hidden="true" />
                  {item}
                </li>
              ))}
            </ul>
            <Button
              type="button"
              variant="primary"
              className="workspace-choice-action"
              onClick={() => openWorkspace("patient", "/login")}
              disabled={Boolean(switchingTo)}
            >
              {openingPatient ? (
                <>
                  <LoaderCircle size={18} className="workspace-choice-spinner" /> Opening patient workspace…
                </>
              ) : (
                <>
                  Patient sign in <ArrowRight size={18} />
                </>
              )}
            </Button>
            <button
              type="button"
              className="auth-link-button workspace-secondary-link"
              onClick={() => openWorkspace("patient", "/register")}
              disabled={Boolean(switchingTo)}
            >
              Create a patient account
            </button>
          </Card>

          <Card variant="glass" className="workspace-choice-card">
            <div className="workspace-choice-topline">
              <span className="workspace-choice-icon doctor">
                <Stethoscope size={22} />
              </span>
              <span className="workspace-choice-label">Doctor Workstation</span>
            </div>
            <h2>Clinician workspace</h2>
            <p>Review assigned appointments and patient context.</p>
            <ul className="workspace-choice-list">
              {doctorHighlights.map((item) => (
                <li key={item}>
                  <ShieldCheck size={16} aria-hidden="true" />
                  {item}
                </li>
              ))}
            </ul>
            <Button
              type="button"
              variant="primary"
              className="workspace-choice-action"
              onClick={() => openWorkspace("clinician", "/doctor/login")}
              disabled={Boolean(switchingTo)}
            >
              {openingClinician ? (
                <>
                  <LoaderCircle size={18} className="workspace-choice-spinner" /> Opening clinician workspace…
                </>
              ) : (
                <>
                  Doctor sign in <ArrowRight size={18} />
                </>
              )}
            </Button>
          </Card>
        </div>

        <aside className="workspace-entry-note">
          <ShieldCheck size={18} aria-hidden="true" />
          <p>
            <strong>Privacy boundary:</strong> patient records remain patient-owned. The controlled clinician workspace can access only server-authorized, assigned appointment information.
          </p>
        </aside>
      </section>

      {switchingTo ? (
        <div className="workspace-switch-status" role="status" aria-live="polite">
          <LoaderCircle size={20} className="workspace-choice-spinner" /> Opening{" "}
          {switchingTo === "patient" ? "Patient Portal" : "Doctor Workstation"}…
        </div>
      ) : null}
    </main>
  );
};
