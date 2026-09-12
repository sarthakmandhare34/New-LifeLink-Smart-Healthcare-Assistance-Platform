import { useState } from "react";                                                             // React hook for input form tracking
import { Card } from "../../../components/ui/Card";                                             // Visual card component
import { Button } from "../../../components/ui/Button";                                         // Styled interaction button
import { Input } from "../../../components/ui/Input";                                           // Styled input field
import { Settings, Lock, CheckCircle2, AlertCircle } from "lucide-react";                       // Workspace and security icons
import { trpc } from "../../../lib/trpc";                                                       // Type-safe client tRPC bridge

// =========================================================================================
// DOCTOR WORKSPACE SETTINGS
// Provides security controls for clinicians:
// - Password modification requiring verification of current password
// - Account authorization levels and clinical boundary declarations
// =========================================================================================
export const DoctorSettings = () => {
  const [currentPassword, setCurrentPassword] = useState("");                                   // Current password input state
  const [newPassword, setNewPassword] = useState("");                                           // New password input state
  const [message, setMessage] = useState("");                                                   // Feedback message string
  const [isSuccess, setIsSuccess] = useState(false);                                            // Success/failure indicator flag

  // tRPC mutation to change password
  const changePassword = trpc.doctorAuth.changePassword.useMutation({
    onSuccess: () => {
      setMessage("Password changed successfully.");                                             // Success banner
      setIsSuccess(true);
      setCurrentPassword("");                                                                   // Clear inputs
      setNewPassword("");
    },
    onError: (error) => {
      setMessage(error.message);                                                                // Error message
      setIsSuccess(false);
    },
  });

  // Submit handler
  const submit = (event: React.FormEvent) => {
    event.preventDefault();                                                                     // Prevent page reload
    setMessage("");
    changePassword.mutate({ currentPassword, newPassword });                                    // Trigger mutation
  };

  return (
    <div className="dashboard-workspace">
      {/* Settings Header */}
      <header className="flex items-center gap-3" style={{ marginBottom: 'var(--spacing-5)' }}>
        <div style={{ width: 52, height: 52, borderRadius: '14px', background: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Settings size={26} color="#FFF" />                                                   {/* Settings cog icon */}
        </div>
        <div>
          <h1 style={{ margin: 0 }}>Workspace Settings</h1>                                     {/* Header title */}
          <p className="caption" style={{ margin: '4px 0 0' }}>Security controls for your clinician account</p>
        </div>
      </header>

      {/* Bento grid layout */}
      <section className="bento-grid">
        {/* Change Password Card */}
        <Card variant="glass" className="bento-col-6" style={{ padding: '28px' }}>
          <div className="flex items-center gap-2" style={{ marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid var(--color-border)' }}>
            <Lock size={18} color="var(--color-primary)" />
            <h2 style={{ margin: 0, fontSize: 'var(--text-h2)' }}>Change Password</h2>
          </div>
          <p className="caption" style={{ marginBottom: '20px' }}>
            Update this clinician account's password. The owner-controlled reset path is available from Doctor sign in if your current password is unavailable.
          </p>

          {/* Feedback banner */}
          {message && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px',
              borderRadius: '10px', marginBottom: '20px',
              background: isSuccess ? '#E6FCF5' : '#FFF0F0',
              color: isSuccess ? '#00856F' : '#B01E1E',
              border: `1px solid ${isSuccess ? 'rgba(0,133,111,0.2)' : 'rgba(176,30,30,0.2)'}`
            }}>
              {isSuccess ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
              <span style={{ fontSize: '14px', fontWeight: 500 }}>{message}</span>
            </div>
          )}

          {/* Password update form */}
          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-3)' }}>
            <label className="auth-field" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ fontWeight: 600, fontSize: '14px' }}>Current password</span>
              <Input
                type="password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                autoComplete="current-password"
                minLength={10}
                required
                placeholder="Enter your current password"
              />
            </label>
            <label className="auth-field" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ fontWeight: 600, fontSize: '14px' }}>New password</span>
              <Input
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                autoComplete="new-password"
                minLength={10}
                required
                placeholder="At least 10 characters"
              />
            </label>
            <Button type="submit" variant="primary" disabled={changePassword.isPending} style={{ marginTop: '8px' }}>
              {changePassword.isPending ? "Changing…" : "Change password"}
            </Button>
          </form>
        </Card>

        {/* Account Information Card */}
        <Card variant="glass" className="bento-col-6" style={{ padding: '28px' }}>
          <h2 style={{ margin: '0 0 20px', fontSize: 'var(--text-h2)' }}>Account Information</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ padding: '16px', background: 'rgba(0,0,0,0.03)', borderRadius: '10px', border: '1px solid var(--color-border)' }}>
              <p className="caption" style={{ margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Account Type</p>
              <strong>Controlled Directory Clinician</strong>
            </div>
            <div style={{ padding: '16px', background: 'rgba(0,0,0,0.03)', borderRadius: '10px', border: '1px solid var(--color-border)' }}>
              <p className="caption" style={{ margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Access Level</p>
              <strong>Appointment-restricted patient context</strong>
            </div>
            <div style={{ padding: '16px', background: 'rgba(0,102,255,0.06)', borderRadius: '10px', border: '1px solid rgba(0,102,255,0.15)' }}>
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--color-primary)', lineHeight: 1.6 }}>
                <strong>Note:</strong> This is a controlled LifeLink directory account. Records here are not verified clinician identities, credentials, or medical registrations.
              </p>
            </div>
          </div>
        </Card>
      </section>
    </div>
  );
};
