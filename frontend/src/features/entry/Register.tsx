import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { LifeLinkLogo } from '../../components/brand/LifeLinkLogo';
import { EntryThemeToggle } from '../../components/EntryThemeToggle';
import { trpc } from '../../lib/trpc';
import { Activity, Lock, User as UserIcon, Mail, HeartPulse, ShieldCheck, Shield } from 'lucide-react';
import { PATIENT_DASHBOARD_PATH } from '../patient/patientAuthRoutes';

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
    <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"/>
    <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"/>
    <path fill="#FBBC05" d="M5.28 14.27a7.18 7.18 0 0 1 0-4.54V6.58H1.25a11.97 11.97 0 0 0 0 10.84l4.03-3.15z"/>
    <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
  </svg>
);

export const PatientRegistration = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const trpcUtils = trpc.useUtils();
  const registerMutation = trpc.patientAuth.register.useMutation();
  const providerQuery = trpc.auth.providers.useQuery(undefined, {
    retry: 3,
    staleTime: 10000,
  });
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const authErrorParam = searchParams.get('authError');
  useEffect(() => {
    if (authErrorParam) {
      const errorMap: Record<string, string> = {
        invalid_provider_state: "The Google authorization session expired. Please try again.",
        provider_sign_in_cancelled: "Google sign-up was cancelled.",
        account_exists: "An account with this Google email already exists. Please sign in instead.",
        provider_sign_in_failed: "Google registration could not be verified. Please try again.",
      };
      setError(errorMap[authErrorParam] || "Google registration failed. Please try again.");
    }
  }, [authErrorParam]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      setIsLoading(false);
      return;
    }
    try {
      await registerMutation.mutateAsync({ name, email, password });
      await trpcUtils.auth.me.refetch();
      navigate(PATIENT_DASHBOARD_PATH, { replace: true });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Registration failed. Please try again.');
      setIsLoading(false);
    }
  };

  const handleGoogleClick = () => {
    const startUrl = providerQuery.data?.googleRegistrationStartUrl ?? providerQuery.data?.googleAuthorizationStartUrl ?? '/api/auth/google?intent=register';
    window.location.assign(startUrl);
  };

  return (
    <main className="auth-page" aria-labelledby="patient-register-heading" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
      <header className="workspace-portal-header" aria-label="LifeLink portal header">
        <div className="workspace-portal-brand">
          <span className="workspace-portal-mark" aria-hidden="true">
            <LifeLinkLogo variant="symbol" style={{ width: '22px', height: '22px', objectFit: 'contain' }} />
          </span>
          <span>
            <strong>LifeLink</strong>
            <small>Patient care portal</small>
          </span>
        </div>
        <div className="workspace-portal-assurance">
          <ShieldCheck size={16} aria-hidden="true" />
          <span>Patient-owned health passport</span>
        </div>
        <EntryThemeToggle />
      </header>

      <div className="doctor-setup-layout auth-split-layout" style={{ flex: 1, display: 'flex', width: '100%', position: 'relative', zIndex: 1 }}>
        {/* Ambient background ECG wave decoration */}
        <div className="ambient-ecg-decoration" style={{ position: 'absolute', bottom: '2%', left: '4%', opacity: 0.15, color: '#00C4CC' }}>
          <Activity size={320} strokeWidth={1} />
        </div>

        {/* Branding Panel (Left Column) */}
        <div className="auth-branding-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: 'var(--spacing-6)', zIndex: 1 }}>
          <div style={{ textAlign: 'center', maxWidth: '420px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <LifeLinkLogo className="lifelink-logo-auth" style={{ width: '280px', height: 'auto', marginBottom: '24px' }} />
            
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', marginTop: '40px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', border: '2px solid #00C4CC', display: 'grid', placeItems: 'center', color: '#00C4CC', background: 'rgba(0, 196, 204, 0.15)' }}>
                <HeartPulse size={24} strokeWidth={2} />
              </div>
              <h2 className="font-display" style={{ fontSize: '1.4rem', fontWeight: 700, margin: '8px 0 0', color: '#00C4CC', letterSpacing: '-0.01em', fontFamily: 'Outfit, sans-serif' }}>Care. Connect. Cure.</h2>
              <p className="caption" style={{ fontSize: '0.9rem', color: '#2D9D9C', letterSpacing: '0.5px' }}>Empowering Patients, Enhancing Lives.</p>
            </div>
          </div>
        </div>

        {/* Form Container (Right Column) */}
        <div style={{ flex: 1.1, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 'var(--spacing-4)', zIndex: 1 }}>
          <Card className="clinical-glass-card" style={{ width: '100%', maxWidth: '540px', maxHeight: '90vh', overflowY: 'auto', padding: 'clamp(24px, 5vw, 40px) clamp(18px, 4vw, 36px)' }}>
            <header className="auth-card-header" style={{ textAlign: 'center', marginBottom: '24px' }}>
              <h1 id="patient-register-heading" className="font-display" style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '6px', color: '#102B2D', letterSpacing: '-0.02em', fontFamily: 'Outfit, sans-serif' }}>Create Patient Account</h1>
              <p style={{ color: '#2D9D9C', fontSize: '0.92rem', margin: 0 }}>Set up your secure, patient-owned health passport</p>
            </header>

            {error && (
              <div className="alert-panel auth-message" role="alert" style={{ marginBottom: '20px', color: 'var(--color-semantic-emergency)', textAlign: 'center' }}>
                {error}
              </div>
            )}

            <form onSubmit={handleRegister} className="auth-form" style={{ display: 'grid', gap: '14px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label htmlFor="patient-name" style={{ fontWeight: 600, fontSize: '0.88rem', color: '#102B2D' }}>Full Name</label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <UserIcon size={18} style={{ position: 'absolute', left: '14px', color: '#2D9D9C', pointerEvents: 'none' }} />
                  <Input
                    id="patient-name"
                    type="text"
                    placeholder="e.g. Eleanor Vance"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    required
                    style={{ width: '100%', paddingLeft: '44px', borderRadius: '10px', height: '44px', fontSize: '0.92rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label htmlFor="patient-email" style={{ fontWeight: 600, fontSize: '0.88rem', color: '#102B2D' }}>Email</label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <Mail size={18} style={{ position: 'absolute', left: '14px', color: '#2D9D9C', pointerEvents: 'none' }} />
                  <Input
                    id="patient-email"
                    type="email"
                    placeholder="e.g. eleanor@example.com"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    autoComplete="username"
                    required
                    style={{ width: '100%', paddingLeft: '44px', borderRadius: '10px', height: '44px', fontSize: '0.92rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label htmlFor="patient-password" style={{ fontWeight: 600, fontSize: '0.88rem', color: '#102B2D' }}>Password</label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <Lock size={18} style={{ position: 'absolute', left: '14px', color: '#2D9D9C', pointerEvents: 'none' }} />
                  <Input
                    id="patient-password"
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    autoComplete="new-password"
                    required
                    style={{ width: '100%', paddingLeft: '44px', borderRadius: '10px', height: '44px', fontSize: '0.92rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label htmlFor="patient-confirm-password" style={{ fontWeight: 600, fontSize: '0.88rem', color: '#102B2D' }}>Confirm Password</label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <Lock size={18} style={{ position: 'absolute', left: '14px', color: '#2D9D9C', pointerEvents: 'none' }} />
                  <Input
                    id="patient-confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    autoComplete="new-password"
                    required
                    style={{ width: '100%', paddingLeft: '44px', borderRadius: '10px', height: '44px', fontSize: '0.92rem' }}
                  />
                </div>
              </div>

              <Button
                type="submit"
                variant="primary"
                disabled={isLoading}
                style={{ width: '100%', padding: '12px', fontSize: '1rem', fontWeight: 600, borderRadius: '10px', marginTop: '6px', cursor: 'pointer', opacity: isLoading ? 0.7 : 1 }}
              >
                {isLoading ? 'Creating account…' : 'Create Account'}
              </Button>
            </form>

            <div className="social-auth" style={{ marginTop: '20px' }}>
              <div className="social-auth-divider" style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#2D9D9C', fontSize: '0.82rem' }}>
                <div style={{ flex: 1, height: '1px', background: 'var(--color-border)' }} />
                <span>OR</span>
                <div style={{ flex: 1, height: '1px', background: 'var(--color-border)' }} />
              </div>
              <div className="social-auth-actions" style={{ marginTop: '14px' }}>
                <Button
                  type="button"
                  variant="outline"
                  className="btn w-full"
                  onClick={handleGoogleClick}
                  title="Sign up with Google"
                  style={{ borderRadius: '10px', height: '44px', fontSize: '0.92rem', width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px', cursor: 'pointer', fontWeight: 600 }}
                >
                  <GoogleIcon /> Sign up with Google
                </Button>
              </div>
            </div>

            <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '0.88rem' }}>
              <span style={{ color: '#2D9D9C' }}>Already registered? </span>
              <button
                type="button"
                onClick={() => navigate('/login')}
                style={{ background: 'none', border: 'none', color: '#00C4CC', fontWeight: 600, cursor: 'pointer', padding: 0 }}
              >
                Sign in
              </button>
            </div>

            {/* 3 Trust Badges */}
            <footer style={{ display: 'flex', justifyContent: 'space-between', marginTop: '28px', paddingTop: '18px', borderTop: '1px solid #9FFBFF' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', color: '#2D9D9C' }}>
                <ShieldCheck size={20} color="#00C4CC" />
                <span style={{ fontSize: '0.72rem', fontWeight: 600 }}>Secure Register</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', color: '#2D9D9C' }}>
                <ShieldCheck size={20} color="#00C4CC" />
                <span style={{ fontSize: '0.72rem', fontWeight: 600 }}>Encrypted Records</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', color: '#2D9D9C' }}>
                <Shield size={20} color="#00C4CC" />
                <span style={{ fontSize: '0.72rem', fontWeight: 600 }}>Protected Privacy</span>
              </div>
            </footer>
          </Card>
        </div>
      </div>
    </main>
  );
};
