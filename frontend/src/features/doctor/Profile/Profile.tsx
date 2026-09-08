import { Card } from "../../../components/ui/Card";
import { ShieldCheck, Stethoscope, MapPin, Building, Mail, User } from "lucide-react";
import { trpc } from "../../../lib/trpc";

export const DoctorProfile = () => {
  const profile = trpc.doctorWorkspace.profile.useQuery();
  if (profile.isLoading) return <div className="dashboard-loading"><p className="caption">Loading clinician profile…</p></div>;
  if (profile.isError || !profile.data) return <p role="alert">Unable to load the clinician profile. Please try again.</p>;

  const data = profile.data;

  return (
    <div className="dashboard-workspace">
      <header className="mb-4 flex items-center gap-3" style={{ marginBottom: 'var(--spacing-5)' }}>
        <div style={{ width: 52, height: 52, borderRadius: '14px', background: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Stethoscope size={26} color="#FFF" />
        </div>
        <div>
          <h1 style={{ margin: 0 }}>Clinician Profile</h1>
          <p className="caption" style={{ margin: '4px 0 0' }}>Your controlled LifeLink directory account</p>
        </div>
      </header>

      <section className="bento-grid">
        {/* Identity Card */}
        <Card variant="glass" className="bento-col-8" style={{ padding: 'clamp(16px, 4vw, 28px)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '28px' }}>
            <div style={{
              width: '72px', height: '72px', borderRadius: '50%',
              background: 'var(--color-primary-muted)', display: 'flex', alignItems: 'center',
              justifyContent: 'center', color: 'var(--color-primary)', fontSize: '2rem', fontWeight: 700,
              flexShrink: 0
            }}>
              {data.displayName.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.6rem' }}>{data.displayName}</h2>
              <p className="caption" style={{ margin: '4px 0 0' }}>{data.specialty}</p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: '20px' }}>
            <div style={{ padding: '16px', background: 'rgba(0,0,0,0.03)', borderRadius: '10px', border: '1px solid var(--color-border)' }}>
              <div className="flex items-center gap-2" style={{ marginBottom: '6px' }}>
                <Stethoscope size={16} color="var(--color-primary)" />
                <span className="caption" style={{ textTransform: 'uppercase', letterSpacing: '0.08em' }}>Specialty</span>
              </div>
              <strong style={{ fontSize: '1.05rem' }}>{data.specialty || 'Not set'}</strong>
            </div>
            <div style={{ padding: '16px', background: 'rgba(0,0,0,0.03)', borderRadius: '10px', border: '1px solid var(--color-border)' }}>
              <div className="flex items-center gap-2" style={{ marginBottom: '6px' }}>
                <MapPin size={16} color="var(--color-primary)" />
                <span className="caption" style={{ textTransform: 'uppercase', letterSpacing: '0.08em' }}>Locality</span>
              </div>
              <strong style={{ fontSize: '1.05rem' }}>{data.locality || 'Mumbai'}</strong>
            </div>
            <div style={{ padding: '16px', background: 'rgba(0,0,0,0.03)', borderRadius: '10px', border: '1px solid var(--color-border)' }}>
              <div className="flex items-center gap-2" style={{ marginBottom: '6px' }}>
                <Building size={16} color="var(--color-primary)" />
                <span className="caption" style={{ textTransform: 'uppercase', letterSpacing: '0.08em' }}>Rail Line</span>
              </div>
              <strong style={{ fontSize: '1.05rem' }}>{data.railLine ? `${data.railLine} Line` : 'Not set'}</strong>
            </div>
          </div>
        </Card>

        {/* Verification Notice */}
        <Card variant="glass" className="bento-col-4" style={{ padding: 'clamp(16px, 4vw, 28px)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ width: 44, height: 44, borderRadius: '12px', background: '#E6F0FF', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
              <ShieldCheck size={22} color="var(--color-primary)" />
            </div>
            <h3 style={{ margin: '0 0 12px' }}>Directory status</h3>
            <p className="caption" style={{ lineHeight: 1.6 }}>
              This is a controlled LifeLink directory account. Specialist records are not verified clinician credentials or medical registrations.
            </p>
          </div>
          <div style={{ padding: '14px', borderRadius: '10px', background: '#E6F0FF', marginTop: '20px' }}>
            <p style={{ margin: 0, color: 'var(--color-primary)', fontWeight: 600, fontSize: '14px' }}>
              Account type: Controlled directory specialist
            </p>
          </div>
        </Card>
      </section>
    </div>
  );
};
