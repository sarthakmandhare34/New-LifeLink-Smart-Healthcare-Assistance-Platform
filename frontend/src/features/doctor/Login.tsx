import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { LifeLinkLogo } from "../../components/brand/LifeLinkLogo";
import { EntryThemeToggle } from "../../components/EntryThemeToggle";
import { trpc } from "../../lib/trpc";
import { Activity, Lock, User as UserIcon, Eye, EyeOff, Stethoscope, ShieldCheck, Shield } from 'lucide-react';

export const DoctorLogin = () => {
  const navigate = useNavigate();
  const utils = trpc.useUtils();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  
  const login = trpc.doctorAuth.login.useMutation({
    onSuccess: async (doctor) => {
      utils.doctorAuth.me.setData(undefined, doctor);
      await utils.auth.me.invalidate();
      navigate("/doctor/dashboard", { replace: true });
    },
    onError: () => setError("The clinician email or password was not accepted."),
  });

  const handleLogin = (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    login.mutate({ email, password });
  };

  return (
    <main className="auth-page" aria-labelledby="doctor-login-heading" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
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
          <span>Protected clinician workspace</span>
        </div>
        <EntryThemeToggle />
      </header>

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
                <Stethoscope size={24} strokeWidth={2} />
              </div>
              <h2 className="font-display" style={{ fontSize: '1.4rem', fontWeight: 700, margin: '8px 0 0', color: '#00C4CC', letterSpacing: '-0.01em', fontFamily: 'Outfit, sans-serif' }}>Care. Connect. Cure.</h2>
              <p className="caption" style={{ fontSize: '0.9rem', color: '#2D9D9C', letterSpacing: '0.5px' }}>Empowering Doctors, Enhancing Lives.</p>
            </div>
          </div>
        </div>

        {/* Form Container (Right Column) */}
        <div style={{ flex: 1.1, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 'var(--spacing-4)', zIndex: 1 }}>
          <Card style={{ width: '100%', maxWidth: '520px', maxHeight: '90vh', overflowY: 'auto', padding: 'clamp(24px, 5vw, 40px) clamp(18px, 4vw, 36px)', borderRadius: '20px', background: '#E6F9FC', border: '1px solid #9FFBFF', boxShadow: '0 8px 32px rgba(16, 43, 45, 0.04)' }}>
            <header className="auth-card-header" style={{ textAlign: 'center', marginBottom: '24px' }}>
              <h1 id="doctor-login-heading" className="font-display" style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '6px', color: '#102B2D', letterSpacing: '-0.02em', fontFamily: 'Outfit, sans-serif' }}>Doctor Sign In</h1>
              <p style={{ color: '#2D9D9C', fontSize: '0.92rem', margin: 0 }}>Review assigned appointments and patient context</p>
            </header>

            {error && (
              <div className="alert-panel auth-message" role="alert" style={{ marginBottom: '20px', color: 'var(--color-semantic-emergency)', textAlign: 'center' }}>
                {error}
              </div>
            )}

            <form onSubmit={handleLogin} className="auth-form" style={{ display: 'grid', gap: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label htmlFor="doctor-email" style={{ fontWeight: 600, fontSize: '0.88rem', color: '#102B2D' }}>Doctor Email</label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <UserIcon size={18} style={{ position: 'absolute', left: '14px', color: '#2D9D9C', pointerEvents: 'none' }} />
                  <Input
                    id="doctor-email"
                    type="text"
                    placeholder="e.g. pediatrics@lifelink.com or cardiology@lifelink.com"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    autoComplete="username"
                    required
                    style={{ width: '100%', paddingLeft: '44px', borderRadius: '10px', height: '44px', border: '1px solid #9FFBFF', fontSize: '0.92rem', background: 'rgba(255, 255, 255, 0.7)', color: '#102B2D' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label htmlFor="doctor-password" style={{ fontWeight: 600, fontSize: '0.88rem', color: '#102B2D' }}>Password</label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <Lock size={18} style={{ position: 'absolute', left: '14px', color: '#2D9D9C', pointerEvents: 'none' }} />
                  <Input
                    id="doctor-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    autoComplete="current-password"
                    required
                    style={{ width: '100%', paddingLeft: '44px', paddingRight: '44px', borderRadius: '10px', height: '44px', border: '1px solid #9FFBFF', fontSize: '0.92rem', background: 'rgba(255, 255, 255, 0.7)', color: '#102B2D' }}
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

              <Button
                type="submit"
                variant="primary"
                disabled={login.isPending}
                style={{ width: '100%', padding: '12px', fontSize: '1rem', fontWeight: 600, borderRadius: '10px', background: '#00C4CC', color: '#FFFFFF', border: 'none', marginTop: '4px', cursor: 'pointer', opacity: login.isPending ? 0.7 : 1 }}
              >
                {login.isPending ? 'Signing in…' : 'Sign In'}
              </Button>
            </form>

            <div style={{ textAlign: 'center', marginTop: '22px', fontSize: '0.88rem', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '16px' }}>
                <button
                  type="button"
                  onClick={() => navigate('/doctor/setup')}
                  style={{ background: 'none', border: 'none', color: '#00C4CC', fontWeight: 600, cursor: 'pointer', padding: 0 }}
                >
                  Clinician setup
                </button>
                <span style={{ color: '#9FFBFF' }}>|</span>
                <button
                  type="button"
                  onClick={() => navigate('/doctor/reset')}
                  style={{ background: 'none', border: 'none', color: '#00C4CC', fontWeight: 600, cursor: 'pointer', padding: 0 }}
                >
                  Reset password
                </button>
              </div>
              <div style={{ marginTop: '4px' }}>
                <span style={{ color: '#2D9D9C' }}>Are you a patient? </span>
                <button
                  type="button"
                  onClick={() => navigate('/login')}
                  style={{ background: 'none', border: 'none', color: '#00C4CC', fontWeight: 600, cursor: 'pointer', padding: 0 }}
                >
                  Patient login →
                </button>
              </div>
            </div>

            {/* 3 Trust Badges */}
            <footer style={{ display: 'flex', justifyContent: 'space-between', marginTop: '28px', paddingTop: '18px', borderTop: '1px solid #9FFBFF' }}>
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
