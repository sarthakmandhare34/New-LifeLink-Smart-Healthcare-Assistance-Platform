import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { LifeLinkLogo } from "../../components/brand/LifeLinkLogo";
import { EntryThemeToggle } from "../../components/EntryThemeToggle";
import { trpc } from "../../lib/trpc";
import { Shield, Lock, ShieldCheck, Activity, Key, Users, RefreshCw, Eye, EyeOff, CheckCircle2 } from 'lucide-react';

type OneTimeCredential = { doctorId?: string; displayName?: string; email: string; password: string };
type OwnerAccount = { doctorId: string; displayName: string; email: string };

const SPECIALTY_PRESETS: Record<string, { short: string; password: string }> = {
  cardiology: { short: "cardio", password: "cardio@lifelink" },
  orthopedics: { short: "ortho", password: "ortho@lifelink" },
  dermatology: { short: "derma", password: "derma@lifelink" },
  neurology: { short: "neuro", password: "neuro@lifelink" },
  pediatrics: { short: "pedia", password: "pedia@lifelink" },
  generalpractice: { short: "general", password: "general@lifelink" },
  ophthalmology: { short: "ophthal", password: "ophthal@lifelink" },
  gastroenterology: { short: "gastro", password: "gastro@lifelink" },
  psychiatry: { short: "psych", password: "psych@lifelink" },
  endocrinology: { short: "endo", password: "endo@lifelink" },
  pulmonology: { short: "pulmo", password: "pulmo@lifelink" },
  gynecology: { short: "gynae", password: "gynae@lifelink" },
};

export const DoctorSetup = () => {
  const navigate = useNavigate();
  const directory = trpc.doctorAuth.directory.useQuery();
  const [doctorId, setDoctorId] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showAccessCode, setShowAccessCode] = useState(false);
  const [provisioningCode, setProvisioningCode] = useState("lifelink-controlled-clinician-secret-key-2026");
  const [message, setMessage] = useState("");
  const [lastCreated, setLastCreated] = useState<{ displayName: string; email: string; password: string } | null>(null);
  const [bulkCredentials, setBulkCredentials] = useState<OneTimeCredential[]>([]);
  const [ownerAccounts, setOwnerAccounts] = useState<OwnerAccount[]>([]);
  const [replacementCredentials, setReplacementCredentials] = useState<OneTimeCredential[]>([]);

  const handleDoctorSelect = (selectedId: string) => {
    setDoctorId(selectedId);
    const doc = directory.data?.find((d) => d.id === selectedId);
    if (doc) {
      const slug = doc.specialty.toLowerCase().replace(/[^a-z]/g, "");
      const preset = SPECIALTY_PRESETS[slug] || { short: slug, password: `${slug}@lifelink` };
      setEmail(`${slug}@lifelink.com`);
      setPassword(preset.password);
    }
  };

  const provision = trpc.doctorAuth.provision.useMutation({
    onSuccess: (result) => {
      setLastCreated({
        displayName: result.displayName,
        email: result.email,
        password: password,
      });
      setMessage(`Credentials configured successfully for ${result.displayName}!`);
    },
    onError: (error) => setMessage(error.message),
  });

  const bulkProvision = trpc.doctorAuth.provisionDirectory.useMutation({
    onSuccess: (result) => {
      setBulkCredentials(result.created);
      setReplacementCredentials([]);
      setMessage(result.created.length ? "All clinician accounts were created. Copy the credentials below." : "All clinician accounts already exist.");
    },
    onError: (error) => setMessage(error.message),
  });

  const loadOwnerAccounts = trpc.doctorAuth.ownerAccounts.useMutation({
    onSuccess: (accounts) => {
      setOwnerAccounts(accounts);
      setReplacementCredentials([]);
      setMessage(accounts.length ? "Provisioned clinician emails are listed below." : "No clinician accounts are currently provisioned.");
    },
    onError: (error) => setMessage(error.message),
  });

  const replacePassword = trpc.doctorAuth.replacePassword.useMutation({
    onSuccess: (credential) => {
      setReplacementCredentials([credential]);
      setMessage("A new password was generated for this account.");
    },
    onError: (error) => setMessage(error.message),
  });

  const refreshDirectoryCredentials = trpc.doctorAuth.refreshDirectoryCredentials.useMutation({
    onSuccess: (result) => {
      setBulkCredentials(result.refreshed);
      setReplacementCredentials([]);
      setOwnerAccounts([]);
      setMessage("All clinician credentials have been refreshed.");
    },
    onError: (error) => setMessage(error.message),
  });

  const copyCredentials = async (credentials: OneTimeCredential[]) => {
    const text = credentials.map((c) => `${c.displayName ? `${c.displayName}\n` : ""}Email: ${c.email}\nPassword: ${c.password}`).join("\n\n");
    await navigator.clipboard.writeText(text);
    setMessage("Credentials copied to clipboard.");
  };

  const submitIndividual = (event: React.FormEvent) => {
    event.preventDefault();
    setMessage("");
    setLastCreated(null);
    provision.mutate({ doctorId, email, password, provisioningCode });
  };

  const canUseOwnerTools = provisioningCode.trim().length >= 16;
  const credentialsToShow = replacementCredentials.length ? replacementCredentials : bulkCredentials;

  return (
    <main className="auth-page" aria-labelledby="doctor-setup-heading" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', position: 'relative', overflow: 'hidden', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
      <header className="workspace-portal-header" aria-label="LifeLink portal header">
        <div className="workspace-portal-brand">
          <span className="workspace-portal-mark" aria-hidden="true">
            <LifeLinkLogo variant="symbol" style={{ width: '22px', height: '22px', objectFit: 'contain' }} />
          </span>
          <span>
            <strong>LifeLink</strong>
            <small>Clinician Credential Setup</small>
          </span>
        </div>
        <div className="workspace-portal-assurance">
          <ShieldCheck size={16} aria-hidden="true" />
          <span>Clinician Provisioning Portal</span>
        </div>
        <EntryThemeToggle />
      </header>

      <div className="doctor-setup-layout" style={{ flex: 1, display: 'flex', width: '100%', position: 'relative', zIndex: 1 }}>
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
                <Shield size={24} strokeWidth={2} />
              </div>
              <h2 className="font-display" style={{ fontSize: '1.4rem', fontWeight: 700, margin: '8px 0 0', color: '#00C4CC', letterSpacing: '-0.01em', fontFamily: 'Outfit, sans-serif' }}>Care. Connect. Cure.</h2>
              <p className="caption" style={{ fontSize: '0.9rem', color: '#2D9D9C', letterSpacing: '0.5px' }}>Clinician Provisioning & Governance</p>
            </div>
          </div>
        </div>

        {/* Setup Form Container (Right Column) */}
        <div style={{ flex: 1.1, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 'var(--spacing-4)', zIndex: 1 }}>
          <Card style={{ width: '100%', maxWidth: '620px', maxHeight: '90vh', overflowY: 'auto', padding: 'clamp(24px, 5vw, 36px) clamp(18px, 4vw, 32px)', borderRadius: '20px', background: '#E6F9FC', border: '1px solid #9FFBFF', boxShadow: '0 8px 32px rgba(16, 43, 45, 0.04)' }}>
            <header className="auth-card-header" style={{ textAlign: 'center', marginBottom: '20px' }}>
              <h1 id="doctor-setup-heading" className="font-display" style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '6px', color: '#102B2D', letterSpacing: '-0.02em', fontFamily: 'Outfit, sans-serif' }}>Create Doctor Credentials</h1>
              <p style={{ color: '#2D9D9C', fontSize: '0.92rem', margin: 0 }}>Configure doctor email & password with your access key</p>
            </header>

            {message && (
              <div className="alert-panel auth-message" role="status" style={{ marginBottom: '18px', textAlign: 'center', color: '#102B2D', background: 'rgba(0, 196, 204, 0.15)', border: '1px solid #00C4CC', padding: '10px 14px', borderRadius: '10px' }}>
                {message}
              </div>
            )}

            {lastCreated && (
              <div style={{ marginBottom: '20px', padding: '16px', background: '#FFFFFF', border: '2px solid #00C4CC', borderRadius: '12px', boxShadow: '0 4px 16px rgba(0, 196, 204, 0.15)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#008C94', fontWeight: 700, fontSize: '0.98rem', marginBottom: '8px' }}>
                  <CheckCircle2 size={20} color="#00C4CC" />
                  <span>Account Ready for {lastCreated.displayName}</span>
                </div>
                <div style={{ fontSize: '0.9rem', display: 'grid', gap: '4px', color: '#102B2D' }}>
                  <div><strong>Email:</strong> <code style={{ background: '#E6F9FC', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>{lastCreated.email}</code></div>
                  <div><strong>Password:</strong> <code style={{ background: '#E6F9FC', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>{lastCreated.password}</code></div>
                </div>
                <Button type="button" variant="primary" onClick={() => navigate('/doctor/login')} style={{ marginTop: '12px', width: '100%', padding: '10px', borderRadius: '8px', background: '#00C4CC', color: '#FFF', fontWeight: 600 }}>
                  Go to Doctor Login →
                </Button>
              </div>
            )}

            {/* Primary Form: Individual Doctor Provisioning */}
            <form onSubmit={submitIndividual} style={{ display: 'grid', gap: '14px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.88rem', fontWeight: 600, color: '#102B2D' }}>1. Select Doctor Specialty</label>
                <select
                  value={doctorId}
                  onChange={(e) => handleDoctorSelect(e.target.value)}
                  required
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #9FFBFF', background: 'rgba(255, 255, 255, 0.85)', color: '#102B2D', fontSize: '0.92rem', outline: 'none' }}
                >
                  <option value="">-- Choose a specialist --</option>
                  {directory.data?.map((doctor) => (
                    <option key={doctor.id} value={doctor.id}>
                      {doctor.specialty} Specialist ({doctor.locality})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.88rem', fontWeight: 600, color: '#102B2D' }}>2. Doctor Login Email</label>
                <Input
                  type="email"
                  placeholder="e.g. cardio@lifelink.com or cardiology@lifelink.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="username"
                  required
                  style={{ borderRadius: '10px', height: '44px', border: '1px solid #9FFBFF', fontSize: '0.92rem', background: 'rgba(255, 255, 255, 0.85)', color: '#102B2D' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.88rem', fontWeight: 600, color: '#102B2D' }}>3. Doctor Password</label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="e.g. cardio@lifelink or ortho@lifelink"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
                    required
                    style={{ width: '100%', paddingRight: '44px', borderRadius: '10px', height: '44px', border: '1px solid #9FFBFF', fontSize: '0.92rem', background: 'rgba(255, 255, 255, 0.85)', color: '#102B2D' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{ position: 'absolute', right: '14px', background: 'none', border: 'none', color: '#2D9D9C', cursor: 'pointer', padding: 0 }}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.88rem', fontWeight: 600, color: '#102B2D' }}>4. Master Access Key (Secret Code)</label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <Key size={18} style={{ position: 'absolute', left: '14px', color: '#2D9D9C', pointerEvents: 'none' }} />
                  <Input
                    type={showAccessCode ? "text" : "password"}
                    value={provisioningCode}
                    onChange={(e) => setProvisioningCode(e.target.value)}
                    placeholder="lifelink-controlled-clinician-secret-key-2026"
                    required
                    style={{ width: '100%', paddingLeft: '44px', paddingRight: '44px', borderRadius: '10px', height: '44px', border: '1px solid #9FFBFF', fontSize: '0.92rem', background: 'rgba(255, 255, 255, 0.85)', color: '#102B2D' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowAccessCode(!showAccessCode)}
                    style={{ position: 'absolute', right: '14px', background: 'none', border: 'none', color: '#2D9D9C', cursor: 'pointer', padding: 0 }}
                    aria-label={showAccessCode ? 'Hide access code' : 'Show access code'}
                  >
                    {showAccessCode ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                <small style={{ fontSize: '0.74rem', color: '#2D9D9C' }}>Matches <code>LIFELINK_DEMO_DOCTOR_ACCESS_CODE</code> from your .env file.</small>
              </div>

              <Button
                type="submit"
                variant="primary"
                disabled={provision.isPending || !canUseOwnerTools || !doctorId}
                style={{ width: '100%', padding: '12px', fontSize: '1rem', fontWeight: 600, borderRadius: '10px', background: '#00C4CC', color: '#FFFFFF', border: 'none', marginTop: '6px', cursor: 'pointer', opacity: provision.isPending ? 0.7 : 1 }}
              >
                {provision.isPending ? "Configuring Account…" : "Save Clinician Credentials"}
              </Button>
            </form>

            {/* Quick Bulk Tools / Management Section */}
            <details style={{ marginTop: "24px", paddingTop: "18px", borderTop: "1px solid #9FFBFF" }}>
              <summary style={{ cursor: "pointer", fontWeight: 600, fontSize: '0.92rem', color: '#2D9D9C' }}>
                ⚙️ Quick Batch Setup & Existing Accounts
              </summary>
              
              <div style={{ marginTop: "14px", display: "grid", gap: "10px" }}>
                <Button
                  type="button"
                  variant="outline"
                  disabled={!canUseOwnerTools || bulkProvision.isPending}
                  onClick={() => bulkProvision.mutate({ provisioningCode })}
                  style={{ borderRadius: '10px', padding: '10px', fontSize: '0.88rem' }}
                >
                  {bulkProvision.isPending ? "Creating accounts…" : "Auto-create all remaining doctors"}
                </Button>
                
                <div style={{ display: 'flex', gap: '8px' }}>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={!canUseOwnerTools || loadOwnerAccounts.isPending}
                    onClick={() => loadOwnerAccounts.mutate({ provisioningCode })}
                    style={{ flex: 1, borderRadius: '10px', padding: '10px', fontSize: '0.86rem' }}
                  >
                    <Users size={16} style={{ marginRight: '6px' }} /> View active
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={!canUseOwnerTools || refreshDirectoryCredentials.isPending}
                    onClick={() => refreshDirectoryCredentials.mutate({ provisioningCode })}
                    style={{ flex: 1, borderRadius: '10px', padding: '10px', fontSize: '0.86rem' }}
                  >
                    <RefreshCw size={16} style={{ marginRight: '6px' }} /> Refresh all
                  </Button>
                </div>
              </div>

              {ownerAccounts.length > 0 && (
                <div style={{ marginTop: "14px", display: "grid", gap: "8px" }}>
                  <h3 style={{ fontSize: "0.95rem", fontWeight: 600, color: '#102B2D', margin: "8px 0 4px" }}>Configured Doctors</h3>
                  {ownerAccounts.map((account) => (
                    <div key={account.doctorId} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", background: 'rgba(255, 255, 255, 0.7)', border: "1px solid #9FFBFF", borderRadius: "8px" }}>
                      <div>
                        <strong style={{ fontSize: '0.9rem', color: '#102B2D' }}>{account.displayName}</strong>
                        <p style={{ margin: "2px 0 0", fontSize: '0.82rem', color: '#2D9D9C' }}>{account.email}</p>
                      </div>
                      <Button
                        type="button"
                        variant="secondary"
                        disabled={replacePassword.isPending}
                        onClick={() => replacePassword.mutate({ email: account.email, provisioningCode })}
                        style={{ fontSize: '0.8rem', padding: '4px 10px', borderRadius: '6px' }}
                      >
                        Reset
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {credentialsToShow.length > 0 && (
                <div style={{ marginTop: "14px", display: "grid", gap: "8px" }}>
                  <div style={{ maxHeight: '180px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {credentialsToShow.map((c) => (
                      <div key={c.email} style={{ padding: "8px 12px", background: 'rgba(255, 255, 255, 0.7)', border: "1px solid #9FFBFF", borderRadius: "8px", fontSize: '0.84rem' }}>
                        <strong>{c.displayName}</strong>
                        <div>Email: {c.email}</div>
                        <div>Password: <code>{c.password}</code></div>
                      </div>
                    ))}
                  </div>
                  <Button type="button" variant="primary" onClick={() => void copyCredentials(credentialsToShow)} style={{ background: '#00C4CC', borderRadius: '8px', padding: '8px' }}>
                    Copy all
                  </Button>
                </div>
              )}
            </details>

            <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '0.88rem' }}>
              <span style={{ color: '#2D9D9C' }}>Ready to sign in? </span>
              <button
                type="button"
                onClick={() => navigate('/doctor/login')}
                style={{ background: 'none', border: 'none', color: '#00C4CC', fontWeight: 600, cursor: 'pointer', padding: 0 }}
              >
                Doctor sign in
              </button>
            </div>

            {/* 3 Trust Badges */}
            <footer style={{ display: 'flex', justifyContent: 'space-between', marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #9FFBFF' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', color: '#2D9D9C' }}>
                <ShieldCheck size={20} color="#00C4CC" />
                <span style={{ fontSize: '0.72rem', fontWeight: 600 }}>Secure Login</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', color: '#2D9D9C' }}>
                <ShieldCheck size={20} color="#00C4CC" />
                <span style={{ fontSize: '0.72rem', fontWeight: 600 }}>Verified Doctors</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', color: '#2D9D9C' }}>
                <Lock size={20} color="#00C4CC" />
                <span style={{ fontSize: '0.72rem', fontWeight: 600 }}>Protected Access</span>
              </div>
            </footer>
          </Card>
        </div>
      </div>
    </main>
  );
};
