import { useNavigate } from "react-router-dom";                                                 // Router navigation hook
import { Activity, Lock, ArrowRight, Loader2 } from "lucide-react";                             // Clinical assessment and security icons
import { Card } from "../../../components/ui/Card";                                             // Visual card container
import { Button } from "../../../components/ui/Button";                                         // Styled action button
import { Badge } from "../../../components/ui/Badge";                                           // Status badge component
import { trpc } from "../../../lib/trpc";                                                       // Type-safe tRPC client bridge

// =========================================================================================
// DOCTOR ASSESSMENTS WORKBENCH
// Displays AI-generated triage assessment history for patients authorized via active appointments.
// Allows doctors to review AI symptom findings, urgency determinations, and differential context.
// =========================================================================================
export const Assessments = () => {
  const navigate = useNavigate();                                                               // Page navigation controller
  const patients = trpc.doctorWorkspace.patients.useQuery();                                    // Queries list of authorized patients for doctor

  // Loading skeleton placeholder
  if (patients.isLoading) return (
    <div className="dashboard-loading">
      <p className="caption">Loading assigned patient assessments…</p>
    </div>
  );

  return (
    <div className="dashboard-workspace">
      {/* Assessments workspace header banner */}
      <header className="mb-4 flex items-center gap-3" style={{ marginBottom: 'var(--spacing-5)' }}>
        <div style={{ width: 52, height: 52, borderRadius: '14px', background: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Activity size={26} color="#FFF" />                                                   {/* Health assessment pulse icon */}
        </div>
        <div>
          <h1 style={{ margin: 0 }}>Patient Assessments</h1>                                    {/* Workspace title */}
          <p className="caption" style={{ margin: '4px 0 0' }}>Review AI assessment context for your assigned patients</p>
        </div>
      </header>

      {/* Error state */}
      {patients.isError ? (
        <Card variant="glass" style={{ padding: '40px', textAlign: 'center' }}>
          <p role="alert" style={{ color: 'var(--color-semantic-emergency)' }}>Unable to verify assigned patient access. Please try again.</p>
        </Card>
      ) : !patients.data?.length ? (
        /* Empty assessments state */
        <Card variant="glass" style={{ padding: '60px 40px', textAlign: 'center' }}>
          <Activity size={48} color="var(--color-primary-muted)" style={{ marginBottom: '16px' }} />
          <h2 style={{ color: 'var(--color-text-muted)', marginBottom: '8px' }}>No assigned patient assessments</h2>
          <p className="caption">Assessment context appears when an assigned patient has submitted an AI health assessment.</p>
          <Button variant="primary" style={{ marginTop: '24px' }} onClick={() => navigate('/doctor/patients')}>
            View Patient Roster <ArrowRight size={16} />
          </Button>
        </Card>
      ) : (
        /* Bento grid displaying each authorized patient's assessment card */
        <section className="bento-grid">
          {patients.data.map((patient) => (
            <Card key={patient.id} variant="glass" className="bento-col-6" style={{ padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  {/* Patient circular monogram */}
                  <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--color-primary-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-primary)', fontWeight: 700, flexShrink: 0 }}>
                    {patient.name.charAt(0).toUpperCase()}                                      {/* Patient initial */}
                  </div>
                  <div>
                    <strong style={{ display: 'block', fontSize: '1.05rem' }}>{patient.name}</strong> {/* Patient name */}
                    <div className="flex items-center gap-1" style={{ marginTop: '4px' }}>
                      <Lock size={12} color="var(--color-text-muted)" />
                      <span className="caption">Appointment-authorized only</span>              {/* Privacy protection notice */}
                    </div>
                  </div>
                </div>
                <Badge style={{ background: '#E6F0FF', color: 'var(--color-primary)', border: 'none' }}>Active</Badge>
              </div>
              {/* Action button to open full patient assessment context */}
              <Button variant="outline" className="w-full" style={{ background: '#FFF', marginTop: '8px' }}
                onClick={() => navigate(`/doctor/patients/${patient.id}`)}>
                Review Assessment Context <ArrowRight size={14} />                              {/* Navigate to clinical inspection */}
              </Button>
            </Card>
          ))}
        </section>
      )}
    </div>
  );
};
