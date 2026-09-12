import { useState } from "react";                                                             // React state hook for form input tracking
import { useNavigate } from "react-router-dom";                                                 // Navigation hook to redirect between views
import { Card } from "../../components/ui/Card";                                                // UI glass container component
import { Button } from "../../components/ui/Button";                                            // Styled interactive button component
import { Input } from "../../components/ui/Input";                                              // Styled form text input component
import { LifeLinkLogo } from "../../components/brand/LifeLinkLogo";                            // Official platform SVG brand logo
import { EntryThemeToggle } from "../../components/EntryThemeToggle";                          // Light/dark theme toggle component
import { trpc } from "../../lib/trpc";                                                          // Type-safe tRPC client bridge
import { Activity, Key, Mail, Lock, ShieldCheck, Shield } from 'lucide-react';                  // Medical security and credential icons

// =========================================================================================
// DOCTOR PASSWORD RESET WORKFLOW
// Allows medical clinicians to reset their workstation passwords using the secure owner
// provisioning code established during server deployment. Prevents unauthorized password resets.
// =========================================================================================
export const DoctorResetPassword = () => {
  const navigate = useNavigate();                                                               // Router navigation hook
  const [email, setEmail] = useState("");                                                       // Doctor email input state
  const [password, setPassword] = useState("");                                                 // Desired new password input state
  const [provisioningCode, setProvisioningCode] = useState("");                                 // Secret owner provisioning passcode
  const [message, setMessage] = useState("");                                                   // Status feedback message banner

  // tRPC mutation invoking backend doctor credential update
  const reset = trpc.doctorAuth.resetPassword.useMutation({
    onSuccess: () => {
      setMessage("Password changed successfully. Sign in using the new doctor password.");       // Success banner feedback
      setPassword("");                                                                          // Clear password field for security
      setProvisioningCode("");                                                                  // Clear secret code field
    },
    onError: (error) => setMessage(error.message),                                              // Display error message from server
  });

  // Handle form submission
  const submit = (event: React.FormEvent) => {
    event.preventDefault();                                                                     // Prevent native page refresh
    setMessage("");                                                                             // Clear prior feedback
    reset.mutate({ email, password, provisioningCode });                                        // Trigger password reset mutation
  };

  return (
    <main className="auth-page" aria-labelledby="doctor-reset-heading" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
      {/* Top navigation portal header */}
      <header className="workspace-portal-header" aria-label="LifeLink portal header">
        <div className="workspace-portal-brand">
          <span className="workspace-portal-mark" aria-hidden="true">
            <LifeLinkLogo variant="symbol" style={{ width: '22px', height: '22px', objectFit: 'contain' }} />
          </span>
          <span>
            <strong>LifeLink</strong>
            <small>Doctor workstation</small>
          </span>
        </div>
        <div className="workspace-portal-assurance">
          <ShieldCheck size={16} aria-hidden="true" />
          <span>Controlled clinician recovery</span>
        </div>
        <EntryThemeToggle />                                                                    {/* Theme toggle control */}
      </header>

      {/* Split layout: Branding panel + Form card */}
      <div className="doctor-setup-layout auth-split-layout" style={{ flex: 1, display: 'flex', width: '100%', position: 'relative', zIndex: 1 }}>
        {/* Ambient background ECG wave decoration */}
        <div style={{ position: 'absolute', bottom: '2%', left: '4%', opacity: 0.15, pointerEvents: 'none', color: '#00C4CC' }}>
          <Activity size={320} strokeWidth={1} />
        </div>

        {/* Branding Panel (Left Column) */}
        <div className="auth-branding-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: 'var(--spacing-6)', zIndex: 1 }}>
          <div style={{ textAlign: 'center', maxWidth: '420px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <LifeLinkLogo className="lifelink-logo-auth" style={{ width: '280px', height: 'auto', marginBottom: '24px' }} />
            
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', marginTop: '40px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', border: '2px solid #00C4CC', display: 'grid', placeItems: 'center', color: '#00C4CC', background: 'rgba(0, 196, 204, 0.15)' }}>
                <Key size={24} strokeWidth={2} />
              </div>
              <h2 className="font-display" style={{ fontSize: '1.4rem', fontWeight: 700, margin: '8px 0 0', color: '#00C4CC', letterSpacing: '-0.01em', fontFamily: 'Outfit, sans-serif' }}>Care. Connect. Cure.</h2>
              <p className="caption" style={{ fontSize: '0.9rem', color: '#2D9D9C', letterSpacing: '0.5px' }}>Empowering Doctors, Enhancing Lives.</p>
            </div>
          </div>
        </div>

        {/* Form Container (Right Column) */}
        <div style={{ flex: 1.1, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 'var(--spacing-4)', zIndex: 1 }}>
          <Card style={{ width: '100%', maxWidth: '540px', maxHeight: '90vh', overflowY: 'auto', padding: 'clamp(24px, 5vw, 40px) clamp(18px, 4vw, 36px)', borderRadius: '20px', background: '#E6F9FC', border: '1px solid #9FFBFF', boxShadow: '0 8px 32px rgba(16, 43, 45, 0.04)' }}>
            <header className="auth-card-header" style={{ textAlign: 'center', marginBottom: '24px' }}>
              <h1 id="doctor-reset-heading" className="font-display" style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '6px', color: '#102B2D', letterSpacing: '-0.02em', fontFamily: 'Outfit, sans-serif' }}>Reset Clinician Password</h1>
              <p style={{ color: '#2D9D9C', fontSize: '0.92rem', margin: 0 }}>Use your owner provisioning code to set a new password</p>
            </header>

            {/* Status message */}
            {message && (
              <div className="alert-panel auth-message" role="status" style={{ marginBottom: '20px', textAlign: 'center' }}>
                {message}
              </div>
            )}

            {/* Form */}
            <form onSubmit={submit} className="auth-form" style={{ display: 'grid', gap: '16px' }}>
              {/* Doctor email */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label htmlFor="reset-email" style={{ fontWeight: 600, fontSize: '0.88rem', color: '#102B2D' }}>Clinician Email</label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <Mail size={18} style={{ position: 'absolute', left: '14px', color: '#2D9D9C', pointerEvents: 'none' }} />
                  <Input
                    id="reset-email"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    autoComplete="username"
                    required
                    style={{ width: '100%', paddingLeft: '44px', borderRadius: '10px', height: '44px', border: '1px solid #9FFBFF', fontSize: '0.92rem', background: 'rgba(255, 255, 255, 0.7)', color: '#102B2D' }}
                  />
                </div>
              </div>

              {/* New Password */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label htmlFor="reset-password" style={{ fontWeight: 600, fontSize: '0.88rem', color: '#102B2D' }}>New Password</label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <Lock size={18} style={{ position: 'absolute', left: '14px', color: '#2D9D9C', pointerEvents: 'none' }} />
                  <Input
                    id="reset-password"
                    type="password"
                    minLength={10}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    autoComplete="new-password"
                    required
                    style={{ width: '100%', paddingLeft: '44px', borderRadius: '10px', height: '44px', border: '1px solid #9FFBFF', fontSize: '0.92rem', background: 'rgba(255, 255, 255, 0.7)', color: '#102B2D' }}
                  />
                </div>
              </div>

              {/* Owner Provisioning Code */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label htmlFor="reset-provisioning-code" style={{ fontWeight: 600, fontSize: '0.88rem', color: '#102B2D' }}>Owner Provisioning Code</label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <Key size={18} style={{ position: 'absolute', left: '14px', color: '#2D9D9C', pointerEvents: 'none' }} />
                  <Input
                    id="reset-provisioning-code"
                    type="password"
                    value={provisioningCode}
                    onChange={(event) => setProvisioningCode(event.target.value)}
                    autoComplete="off"
                    required
                    style={{ width: '100%', paddingLeft: '44px', borderRadius: '10px', height: '44px', border: '1px solid #9FFBFF', fontSize: '0.92rem', background: 'rgba(255, 255, 255, 0.7)', color: '#102B2D' }}
                  />
                </div>
              </div>

              {/* Submit button */}
              <Button
                type="submit"
                variant="primary"
                disabled={reset.isPending}
                style={{ width: '100%', padding: '12px', fontSize: '1rem', fontWeight: 600, borderRadius: '10px', background: '#00C4CC', color: '#FFFFFF', border: 'none', marginTop: '4px', cursor: 'pointer', opacity: reset.isPending ? 0.7 : 1 }}
              >
                {reset.isPending ? "Resetting…" : "Reset Password"}
              </Button>
            </form>

            {/* Back to sign in */}
            <div style={{ textAlign: 'center', marginTop: '22px', fontSize: '0.88rem' }}>
              <span style={{ color: '#2D9D9C' }}>Remembered the password? </span>
              <button
                type="button"
                onClick={() => navigate("/doctor/login")}
                style={{ background: 'none', border: 'none', color: '#00C4CC', fontWeight: 600, cursor: 'pointer', padding: 0 }}
              >
                Doctor sign in
              </button>
            </div>

            {/* Trust and security badges */}
            <footer style={{ display: 'flex', justifyContent: 'space-between', marginTop: '28px', paddingTop: '18px', borderTop: '1px solid #9FFBFF' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', color: '#2D9D9C' }}>
                <ShieldCheck size={20} color="#00C4CC" />
                <span style={{ fontSize: '0.72rem', fontWeight: 600 }}>Owner Auth</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', color: '#2D9D9C' }}>
                <ShieldCheck size={20} color="#00C4CC" />
                <span style={{ fontSize: '0.72rem', fontWeight: 600 }}>Zero Stored Logs</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', color: '#2D9D9C' }}>
                <Shield size={20} color="#00C4CC" />
                <span style={{ fontSize: '0.72rem', fontWeight: 600 }}>Protected Workspace</span>
              </div>
            </footer>
          </Card>
        </div>
      </div>
    </main>
  );
};
