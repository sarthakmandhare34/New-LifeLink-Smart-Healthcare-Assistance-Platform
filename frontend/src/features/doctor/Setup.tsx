import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { LifeLinkLogo } from "../../components/brand/LifeLinkLogo";
import { EntryThemeToggle } from "../../components/EntryThemeToggle";
import { trpc } from "../../lib/trpc";
import { Shield, Lock, ShieldCheck, Activity, Key, Users, RefreshCw, Stethoscope } from 'lucide-react';

type OneTimeCredential = { doctorId?: string; displayName?: string; email: string; password: string };
type OwnerAccount = { doctorId: string; displayName: string; email: string };

export const DoctorSetup = () => {
  const navigate = useNavigate();
  const directory = trpc.doctorAuth.directory.useQuery();
  const [doctorId, setDoctorId] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [provisioningCode, setProvisioningCode] = useState("");
  const [message, setMessage] = useState("");
  const [bulkCredentials, setBulkCredentials] = useState<OneTimeCredential[]>([]);
  const [ownerAccounts, setOwnerAccounts] = useState<OwnerAccount[]>([]);
  const [replacementCredentials, setReplacementCredentials] = useState<OneTimeCredential[]>([]);
  const bulkProvision = trpc.doctorAuth.provisionDirectory.useMutation({
    onSuccess: (result) => {
      setBulkCredentials(result.created);
      setReplacementCredentials([]);
      setMessage(result.created.length ? "All remaining clinician accounts were created. Copy the one-time credentials now." : "No new clinician accounts were created. Use Account recovery to view provisioned emails or replace a password.");
    },
    onError: (error) => setMessage(error.message),
  });
  const provision = trpc.doctorAuth.provision.useMutation({
    onSuccess: (result) => {
      setMessage(`${result.displayName} now has a separate clinician login.`);
      setPassword("");
    },
    onError: (error) => setMessage(error.message),
  });
  const loadOwnerAccounts = trpc.doctorAuth.ownerAccounts.useMutation({
    onSuccess: (accounts) => {
      setOwnerAccounts(accounts);
      setReplacementCredentials([]);
      setMessage(accounts.length ? "Provisioned clinician emails are shown below. Passwords remain unavailable; replace a password to create a new one-time value." : "No clinician accounts are currently provisioned. Create all clinician logins first.");
    },
    onError: (error) => setMessage(error.message),
  });
  const replacePassword = trpc.doctorAuth.replacePassword.useMutation({
    onSuccess: (credential) => {
      setReplacementCredentials([credential]);
      setMessage("A new one-time password was created. Copy it now; the previous password no longer works.");
    },
    onError: (error) => setMessage(error.message),
  });
  const refreshDirectoryCredentials = trpc.doctorAuth.refreshDirectoryCredentials.useMutation({
    onSuccess: (result) => {
      setBulkCredentials(result.refreshed);
      setReplacementCredentials([]);
      setOwnerAccounts([]);
      setMessage("All clinician account emails and one-time passwords were refreshed. Copy the credentials now; previous clinician logins no longer work.");
    },
    onError: (error) => setMessage(error.message),
  });
  const copyCredentials = async (credentials: OneTimeCredential[]) => {
    const text = credentials.map((credential) => `${credential.displayName ? `${credential.displayName}\n` : ""}Email: ${credential.email}\nPassword: ${credential.password}`).join("\n\n");
    await navigator.clipboard.writeText(text);
    setMessage("One-time credentials copied. Store them in a private password manager before closing this page.");
  };
  const submitIndividual = (event: React.FormEvent) => {
    event.preventDefault();
    setMessage("");
    provision.mutate({ doctorId, email, password, provisioningCode });
  };
  const canUseOwnerTools = provisioningCode.length > 0;
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
            <small>Clinician setup</small>
          </span>
        </div>
        <div className="workspace-portal-assurance">
          <ShieldCheck size={16} aria-hidden="true" />
          <span>Controlled clinician provisioning</span>
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
            <p className="caption" style={{ fontSize: '0.9rem', color: '#2D9D9C', letterSpacing: '0.5px' }}>Empowering Doctors, Enhancing Lives.</p>
          </div>
        </div>
      </div>

      {/* Setup Form Container (Right Column) */}
      <div style={{ flex: 1.1, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 'var(--spacing-4)', zIndex: 1 }}>
        <Card style={{ width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto', padding: 'clamp(24px, 5vw, 40px) clamp(18px, 4vw, 36px)', borderRadius: '20px', background: '#E6F9FC', border: '1px solid #9FFBFF', boxShadow: '0 8px 32px rgba(16, 43, 45, 0.04)' }}>
          <header className="auth-card-header" style={{ textAlign: 'center', marginBottom: '24px' }}>
            <h1 id="doctor-setup-heading" className="font-display" style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '6px', color: '#102B2D', letterSpacing: '-0.02em', fontFamily: 'Outfit, sans-serif' }}>Clinician Setup</h1>
            <p style={{ color: '#2D9D9C', fontSize: '0.92rem', margin: 0 }}>Create and manage clinician accounts</p>
          </header>

          {message && <div className="alert-panel auth-message" role="status" style={{ marginBottom: '20px' }}>{message}</div>}

          <section style={{ display: "grid", gap: "16px" }}>
            <div>
              <h2 style={{ fontSize: "1.1rem", fontWeight: 600, color: '#102B2D', marginBottom: "4px", fontFamily: 'Outfit, sans-serif' }}>Owner access</h2>
              <p style={{ fontSize: '0.85rem', color: '#2D9D9C' }}>Enter the private owner provisioning code to create missing accounts or replace passwords.</p>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--color-text)' }}>Owner provisioning code</label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <Key size={18} style={{ position: 'absolute', left: '14px', color: 'var(--color-text-muted)', pointerEvents: 'none' }} />
                <Input type="password" value={provisioningCode} onChange={(event) => setProvisioningCode(event.target.value)} autoComplete="off" required style={{ paddingLeft: '42px', borderRadius: '10px', height: '44px', border: '1px solid var(--color-border)', fontSize: '0.92rem' }} />
              </div>
              <small style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>This code is never stored or displayed.</small>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "10px", marginTop: '8px' }}>
              <Button type="button" variant="primary" disabled={!canUseOwnerTools || bulkProvision.isPending} onClick={() => bulkProvision.mutate({ provisioningCode })} style={{ padding: '10px', fontSize: '0.92rem', borderRadius: '10px', background: '#00C4CC' }}>
                {bulkProvision.isPending ? "Creating accounts…" : "Create missing clinician logins"}
              </Button>
              <div style={{ display: 'flex', gap: '10px' }}>
                <Button type="button" variant="outline" disabled={!canUseOwnerTools || loadOwnerAccounts.isPending} onClick={() => loadOwnerAccounts.mutate({ provisioningCode })} style={{ flex: 1, padding: '10px', fontSize: '0.9rem', borderRadius: '10px' }}>
                  <Users size={16} style={{ marginRight: '6px' }} /> View provisioned
                </Button>
                <Button type="button" variant="outline" disabled={!canUseOwnerTools || refreshDirectoryCredentials.isPending} onClick={() => refreshDirectoryCredentials.mutate({ provisioningCode })} style={{ flex: 1, padding: '10px', fontSize: '0.9rem', borderRadius: '10px' }}>
                  <RefreshCw size={16} style={{ marginRight: '6px' }} /> Refresh all
                </Button>
              </div>
            </div>
          </section>

          {ownerAccounts.length > 0 && (
            <section style={{ marginTop: "24px", paddingTop: "20px", borderTop: "1px solid var(--color-border)", display: "grid", gap: "12px" }}>
              <h2 style={{ fontSize: "1.1rem", fontWeight: 600, color: '#102B2D', margin: 0, fontFamily: 'Outfit, sans-serif' }}>Provisioned accounts</h2>
              {ownerAccounts.map((account) => (
                <div key={account.doctorId} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", flexWrap: "wrap", padding: "12px", background: 'rgba(255, 255, 255, 0.7)', border: "1px solid #9FFBFF", borderRadius: "10px" }}>
                  <div>
                    <strong style={{ fontSize: '0.95rem', color: '#102B2D' }}>{account.displayName}</strong>
                    <p style={{ margin: "2px 0 0", fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>{account.email}</p>
                  </div>
                  <Button type="button" variant="secondary" disabled={replacePassword.isPending} onClick={() => replacePassword.mutate({ email: account.email, provisioningCode })} style={{ fontSize: '0.85rem', padding: '6px 12px', borderRadius: '8px' }}>
                    {replacePassword.isPending ? "Replacing…" : "Replace password"}
                  </Button>
                </div>
              ))}
            </section>
          )}

          {credentialsToShow.length > 0 && (
            <section style={{ marginTop: "24px", paddingTop: "20px", borderTop: "1px solid var(--color-border)", display: "grid", gap: "12px" }}>
              <h2 style={{ fontSize: "1.1rem", fontWeight: 600, color: '#102B2D', margin: 0, fontFamily: 'Outfit, sans-serif' }}>One-time credentials</h2>
              <p role="alert" style={{ margin: 0, fontSize: '0.85rem', color: 'var(--color-semantic-emergency)', fontWeight: 600 }}>Copy these now. Passwords will not be displayed again.</p>
              
              <div style={{ maxHeight: '200px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {credentialsToShow.map((credential) => (
                  <div key={credential.email} style={{ padding: "12px", background: 'rgba(255, 255, 255, 0.7)', border: "1px solid #9FFBFF", borderRadius: "10px" }}>
                    {credential.displayName && <strong style={{ fontSize: '0.95rem', color: 'var(--color-text)', display: 'block', marginBottom: '4px' }}>{credential.displayName}</strong>}
                    <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--color-text)' }}>Email: {credential.email}</p>
                    <p style={{ margin: "4px 0 0", fontSize: '0.85rem', color: 'var(--color-text)' }}>Password: <code style={{ background: 'var(--color-surface-white)', padding: '2px 6px', border: '1px solid var(--color-border)', borderRadius: '4px', fontWeight: 700 }}>{credential.password}</code></p>
                  </div>
                ))}
              </div>
              <Button type="button" variant="primary" onClick={() => void copyCredentials(credentialsToShow)} style={{ background: '#00C4CC', borderColor: '#00C4CC', borderRadius: '10px' }}>
                Copy all credentials
              </Button>
            </section>
          )}

          <details style={{ marginTop: "24px", paddingTop: "20px", borderTop: "1px solid var(--color-border)" }}>
            <summary style={{ cursor: "pointer", fontWeight: 600, fontSize: '0.95rem', color: 'var(--color-text-muted)' }}>Advanced: create one specialist account</summary>
            <form onSubmit={submitIndividual} style={{ marginTop: "16px", display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text)' }}>Controlled specialist</label>
                <select value={doctorId} onChange={(event) => setDoctorId(event.target.value)} required style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid var(--color-border)', background: 'var(--color-surface-white)', color: 'var(--color-text)', fontSize: '0.9rem' }}>
                  <option value="">Select a controlled specialist</option>
                  {directory.data?.map((doctor) => <option key={doctor.id} value={doctor.id}>{doctor.displayName} · {doctor.locality}</option>)}
                </select>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text)' }}>Clinician email</label>
                <Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="username" required style={{ borderRadius: '10px', height: '40px', border: '1px solid var(--color-border)' }} />
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text)' }}>Separate password</label>
                <Input type="password" minLength={10} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" required style={{ borderRadius: '10px', height: '40px', border: '1px solid var(--color-border)' }} />
              </div>
              
              <Button type="submit" variant="secondary" className="w-full" disabled={provision.isPending || directory.isLoading || !canUseOwnerTools} style={{ marginTop: '8px', borderRadius: '10px' }}>
                {provision.isPending ? "Creating account…" : "Create clinician login"}
              </Button>
            </form>
          </details>

          <div style={{ textAlign: 'center', marginTop: '24px', fontSize: '0.88rem' }}>
            <span style={{ color: '#2D9D9C' }}>Ready to sign in? </span>
            <button type="button" onClick={() => navigate('/doctor/login')} style={{ background: 'none', border: 'none', color: '#00C4CC', fontWeight: 600, cursor: 'pointer', padding: 0 }}>Doctor sign in</button>
          </div>

          {/* 3 Trust Badges */}
          <footer style={{ display: 'flex', justifyContent: 'space-between', marginTop: '28px', paddingTop: '18px', borderTop: '1px solid var(--color-border)' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', color: '#2D9D9C' }}>
              <ShieldCheck size={20} color="#00C4CC" />
              <span style={{ fontSize: '0.72rem', fontWeight: 600 }}>Secure Login</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', color: '#2D9D9C' }}>
              <ShieldCheck size={20} color="#00C4CC" />
              <span style={{ fontSize: '0.72rem', fontWeight: 600 }}>Verified Doctors</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', color: '#2D9D9C' }}>
              <Shield size={20} color="#00C4CC" />
              <span style={{ fontSize: '0.72rem', fontWeight: 600 }}>Protected Access</span>
            </div>
          </footer>
        </Card>
      </div>
      </div>
    </main>
  );
};
