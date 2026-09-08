import { useNavigate } from "react-router-dom";
import { Users, ArrowRight, UserCheck, Loader2 } from "lucide-react";
import { Card } from "../../../components/ui/Card";
import { Button } from "../../../components/ui/Button";
import { Badge } from "../../../components/ui/Badge";
import { trpc } from "../../../lib/trpc";

export const Patients = () => {
  const navigate = useNavigate();
  const patients = trpc.doctorWorkspace.patients.useQuery();

  if (patients.isLoading) return (
    <div className="dashboard-loading">
      <Loader2 size={24} className="workspace-choice-spinner" style={{ animation: 'spin 1s linear infinite' }} />
      <p className="caption">Loading authorized patients…</p>
    </div>
  );
  if (patients.isError) return <p role="alert">Unable to load authorized patients. Please try again.</p>;

  return (
    <div className="dashboard-workspace">
      <header className="mb-4 flex items-center gap-3" style={{ marginBottom: 'var(--spacing-5)' }}>
        <div style={{ width: 52, height: 52, borderRadius: '14px', background: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Users size={26} color="#FFF" />
        </div>
        <div>
          <h1 style={{ margin: 0 }}>Patient Roster</h1>
          <p className="caption" style={{ margin: '4px 0 0' }}>Patients authorized via assigned appointments</p>
        </div>
        <div style={{ marginLeft: 'auto' }}>
          <Badge style={{ background: '#E6F0FF', color: 'var(--color-primary)', border: 'none', padding: '8px 16px', fontSize: '14px', fontWeight: 700 }}>
            {patients.data?.length ?? 0} Patients
          </Badge>
        </div>
      </header>

      {!patients.data?.length ? (
        <Card variant="glass" style={{ padding: '60px 40px', textAlign: 'center' }}>
          <UserCheck size={48} color="var(--color-primary-muted)" style={{ marginBottom: '16px' }} />
          <h2 style={{ color: 'var(--color-text-muted)', marginBottom: '8px' }}>No authorized patients yet</h2>
          <p className="caption">Patients appear here once an appointment is assigned and confirmed to your account.</p>
          <Button variant="primary" style={{ marginTop: '24px' }} onClick={() => navigate('/doctor/appointments')}>
            Review Appointments <ArrowRight size={16} />
          </Button>
        </Card>
      ) : (
        <section className="bento-grid">
          {patients.data.map((patient) => (
            <Card key={patient.id} variant="glass" className="bento-col-6 interactive-surface" style={{ padding: 'clamp(16px, 4vw, 24px)', cursor: 'pointer' }}
              onClick={() => navigate(`/doctor/patients/${patient.id}`)}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--color-primary-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-primary)', fontSize: '1.2rem', fontWeight: 700, flexShrink: 0 }}>
                    {patient.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <strong style={{ fontSize: '1.05rem', display: 'block' }}>{patient.name}</strong>
                    <p className="caption" style={{ margin: '4px 0 0' }}>Appointment-authorized access</p>
                  </div>
                </div>
                <Button variant="outline" size="sm" style={{ background: '#FFF', flexShrink: 0 }}
                  onClick={(e) => { e.stopPropagation(); navigate(`/doctor/patients/${patient.id}`); }}>
                  View record <ArrowRight size={14} />
                </Button>
              </div>
            </Card>
          ))}
        </section>
      )}
    </div>
  );
};
