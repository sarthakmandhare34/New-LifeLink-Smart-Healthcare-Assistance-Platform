import { useNavigate } from "react-router-dom";                                                 // React router hook for navigation transitions
import { Users, ArrowRight, UserCheck, Loader2 } from "lucide-react";                           // Roster, action, and loading icons
import { Card } from "../../../components/ui/Card";                                             // Visual card container component
import { Button } from "../../../components/ui/Button";                                         // Standard action button
import { Badge } from "../../../components/ui/Badge";                                           // Small pill badge component
import { trpc } from "../../../lib/trpc";                                                       // Type-safe tRPC client bridge

// =========================================================================================
// DOCTOR PATIENT ROSTER COMPONENT
// Lists all patients who have authorized clinical access with this doctor via confirmed or
// pending appointment bookings. In strict adherence to healthcare privacy (HIPAA/DPDP),
// doctors can only inspect health records of patients with an active clinical relationship.
// =========================================================================================
export const Patients = () => {
  const navigate = useNavigate();                                                               // Page navigation controller
  const patients = trpc.doctorWorkspace.patients.useQuery();                                    // Fetches list of authorized patients for doctor

  // Loading state placeholder with animated spinner
  if (patients.isLoading) return (
    <div className="dashboard-loading">
      <Loader2 size={24} className="workspace-choice-spinner" style={{ animation: 'spin 1s linear infinite' }} />
      <p className="caption">Loading authorized patients…</p>
    </div>
  );

  // Error boundary state
  if (patients.isError) return <p role="alert">Unable to load authorized patients. Please try again.</p>;

  return (
    <div className="dashboard-workspace">
      {/* Roster header banner */}
      <header className="mb-4 flex items-center gap-3" style={{ marginBottom: 'var(--spacing-5)' }}>
        <div style={{ width: 52, height: 52, borderRadius: '14px', background: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Users size={26} color="#FFF" />                                                      {/* Patient group icon */}
        </div>
        <div>
          <h1 style={{ margin: 0 }}>Patient Roster</h1>                                         {/* Page title */}
          <p className="caption" style={{ margin: '4px 0 0' }}>Patients authorized via assigned appointments</p>
        </div>
        <div style={{ marginLeft: 'auto' }}>
          <Badge style={{ background: '#E6F0FF', color: 'var(--color-primary)', border: 'none', padding: '8px 16px', fontSize: '14px', fontWeight: 700 }}>
            {patients.data?.length ?? 0} Patients                                               {/* Patient counter badge */}
          </Badge>
        </div>
      </header>

      {/* Empty roster state */}
      {!patients.data?.length ? (
        <Card variant="glass" style={{ padding: '60px 40px', textAlign: 'center' }}>
          <UserCheck size={48} color="var(--color-primary-muted)" style={{ marginBottom: '16px' }} />
          <h2 style={{ color: 'var(--color-text-muted)', marginBottom: '8px' }}>No authorized patients yet</h2>
          <p className="caption">Patients appear here once an appointment is assigned and confirmed to your account.</p>
          <Button variant="primary" style={{ marginTop: '24px' }} onClick={() => navigate('/doctor/appointments')}>
            Review Appointments <ArrowRight size={16} />                                         {/* Quick link to appointments */}
          </Button>
        </Card>
      ) : (
        /* Patient cards grid */
        <section className="bento-grid">
          {patients.data.map((patient) => (
            <Card key={patient.id} variant="glass" className="bento-col-6 interactive-surface" style={{ padding: 'clamp(16px, 4vw, 24px)', cursor: 'pointer' }}
              onClick={() => navigate(`/doctor/patients/${patient.id}`)}>                       {/* Navigate to patient health passport view */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  {/* Patient initial circular avatar */}
                  <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--color-primary-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-primary)', fontSize: '1.2rem', fontWeight: 700, flexShrink: 0 }}>
                    {patient.name.charAt(0).toUpperCase()}                                      {/* First letter avatar */}
                  </div>
                  <div>
                    <strong style={{ fontSize: '1.05rem', display: 'block' }}>{patient.name}</strong> {/* Patient full legal name */}
                    <p className="caption" style={{ margin: '4px 0 0' }}>Appointment-authorized access</p>
                  </div>
                </div>
                {/* Direct action button */}
                <Button variant="outline" size="sm" style={{ background: '#FFF', flexShrink: 0 }}
                  onClick={(e) => { e.stopPropagation(); navigate(`/doctor/patients/${patient.id}`); }}>
                  View record <ArrowRight size={14} />                                          {/* Direct view link */}
                </Button>
              </div>
            </Card>
          ))}
        </section>
      )}
    </div>
  );
};
