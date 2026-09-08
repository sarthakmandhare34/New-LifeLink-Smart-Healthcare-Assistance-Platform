import { useNavigate } from "react-router-dom";
import { Activity, Lock, ArrowRight, Loader2 } from "lucide-react";
import { Card } from "../../../components/ui/Card";
import { Button } from "../../../components/ui/Button";
import { Badge } from "../../../components/ui/Badge";
import { trpc } from "../../../lib/trpc";

export const Assessments = () => {
  const navigate = useNavigate();
  const patients = trpc.doctorWorkspace.patients.useQuery();

  if (patients.isLoading) return (
    <div className="dashboard-loading">
      <p className="caption">Loading assigned patient assessments…</p>
    </div>
  );

  return (
    <div className="dashboard-workspace">
      <header className="mb-4 flex items-center gap-3" style={{ marginBottom: 'var(--spacing-5)' }}>
        <div style={{ width: 52, height: 52, borderRadius: '14px', background: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Activity size={26} color="#FFF" />
        </div>
        <div>
          <h1 style={{ margin: 0 }}>Patient Assessments</h1>
          <p className="caption" style={{ margin: '4px 0 0' }}>Review AI assessment context for your assigned patients</p>
        </div>
      </header>

      {patients.isError ? (
        <Card variant="glass" style={{ padding: '40px', textAlign: 'center' }}>
          <p role="alert" style={{ color: 'var(--color-semantic-emergency)' }}>Unable to verify assigned patient access. Please try again.</p>
        </Card>
      ) : !patients.data?.length ? (
        <Card variant="glass" style={{ padding: '60px 40px', textAlign: 'center' }}>
          <Activity size={48} color="var(--color-primary-muted)" style={{ marginBottom: '16px' }} />
          <h2 style={{ color: 'var(--color-text-muted)', marginBottom: '8px' }}>No assigned patient assessments</h2>
          <p className="caption">Assessment context appears when an assigned patient has submitted an AI health assessment.</p>
          <Button variant="primary" style={{ marginTop: '24px' }} onClick={() => navigate('/doctor/patients')}>
            View Patient Roster <ArrowRight size={16} />
          </Button>
        </Card>
      ) : (
        <section className="bento-grid">
          {patients.data.map((patient) => (
            <Card key={patient.id} variant="glass" className="bento-col-6" style={{ padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--color-primary-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-primary)', fontWeight: 700, flexShrink: 0 }}>
                    {patient.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <strong style={{ display: 'block', fontSize: '1.05rem' }}>{patient.name}</strong>
                    <div className="flex items-center gap-1" style={{ marginTop: '4px' }}>
                      <Lock size={12} color="var(--color-text-muted)" />
                      <span className="caption">Appointment-authorized only</span>
                    </div>
                  </div>
                </div>
                <Badge style={{ background: '#E6F0FF', color: 'var(--color-primary)', border: 'none' }}>Active</Badge>
              </div>
              <Button variant="outline" className="w-full" style={{ background: '#FFF', marginTop: '8px' }}
                onClick={() => navigate(`/doctor/patients/${patient.id}`)}>
                Review Assessment Context <ArrowRight size={14} />
              </Button>
            </Card>
          ))}
        </section>
      )}
    </div>
  );
};
