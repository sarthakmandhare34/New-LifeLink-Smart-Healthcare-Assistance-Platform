/**
 * ============================================================================
 * LIFELINK FRONTEND: PATIENT DASHBOARD (features/patient/Dashboard.tsx)
 * ============================================================================
 * 
 * WHAT THIS COMPONENT DOES:
 * Serves as the primary patient homepage upon authentication:
 * 1. Summary Query (`trpc.patientDashboard.summary.useQuery`):
 *    Fetches aggregated patient clinical data in a single round-trip:
 *    - Profile details (Name, Blood Group)
 *    - Closest upcoming confirmed/requested appointment
 *    - Most recent completed AI symptom assessment
 *    - Active medications list from the medicine cabinet
 *    - Recent digital prescriptions issued by doctors
 * 2. Visual Liquid-Glass Design System:
 *    - Uses responsive CSS grid cards (`repeat(auto-fit, minmax(280px, 1fr))`)
 *    - Color-coded urgency indicators for triage and appointment statuses
 * 3. Quick-Nav Links: Provides immediate routing to book appointments, manage meds, or launch SOS emergency.
 */
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Calendar, Activity, Pill, FileText, TriangleAlert, ArrowRight, Clock
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { trpc } from '../../lib/trpc';
import { useAuth } from '../../_core/hooks/useAuth';

function urgencyColor(urgency: string) {
  if (urgency === 'EMERGENCY') return { bg: 'rgba(220, 38, 38, 0.12)', color: 'var(--color-semantic-emergency)' };
  if (urgency === 'MODERATE') return { bg: 'rgba(217, 119, 6, 0.12)', color: 'var(--color-semantic-warning)' };
  if (urgency === 'ERROR') return { bg: 'rgba(225, 29, 72, 0.12)', color: '#e11d48' };
  return { bg: 'rgba(13, 148, 136, 0.12)', color: 'var(--color-semantic-success)' };
}

export const PatientDashboard = () => {
  const { user } = useAuth();
  const dashboardQuery = trpc.patientDashboard.summary.useQuery();
  const navigate = useNavigate();

  if (dashboardQuery.isLoading) {
    return (
      <div className="dashboard-loading" style={{ padding: '24px' }}>
        <p className="caption" style={{ color: '#2D9D9C', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Loading your health workspace…</p>
      </div>
    );
  }

  if (!dashboardQuery.data?.profile) {
    return (
      <div className="dashboard-loading" style={{ padding: '24px' }}>
        <p className="caption" style={{ color: 'var(--color-semantic-emergency)', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Your patient profile could not be loaded. Please refresh and try again.</p>
      </div>
    );
  }

  const { profile: patient, latestAssessment, medicines, appointments, prescriptions } = dashboardQuery.data;
  
  // Ensure we get the closest FUTURE appointment, not just the first one returned.
  const now = new Date();
  const upcomingAppointment = appointments
    .filter((a) => ['Requested', 'Pending', 'Confirmed'].includes(a.status) && new Date(a.scheduledAt) >= now)
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())[0] ?? null;

  const latestPrescription = prescriptions[0] ?? null;

  const cardStyle = {
    padding: 'clamp(16px, 4vw, 24px)',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '16px',
    minHeight: '220px',
  };

  const iconWrapperStyle = {
    width: '40px',
    height: '40px',
    borderRadius: '12px',
    background: 'rgba(0, 196, 204, 0.15)', // #00C4CC with opacity
    display: 'grid',
    placeItems: 'center',
    color: '#00C4CC',
    flexShrink: 0
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>

      {/* Welcome Header */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <h1 className="font-display" style={{ fontSize: '2rem', fontWeight: 700, margin: 0, color: '#102B2D', letterSpacing: '-0.02em', fontFamily: 'Outfit, sans-serif' }}>
          Good morning, {patient.name || user?.name || 'Patient'}
        </h1>
        <p style={{ color: '#2D9D9C', fontSize: '1rem', margin: 0 }}>
          Your LifeLink overview
        </p>
      </section>

      {/* Row 1: Upcoming Appointment + Recent Assessment */}
      <section
        style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: '20px' }}
        aria-label="Health activity"
      >
        {/* Upcoming Appointment */}
        <Card className="clinical-glass-card interactive-surface" style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h2 style={{ fontSize: '0.8rem', fontWeight: 700, color: '#2D9D9C', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'Outfit, sans-serif' }}>Upcoming Appointment</h2>
            </div>
            <div style={iconWrapperStyle}>
              <Calendar size={20} />
            </div>
          </div>

          {upcomingAppointment ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Clock size={14} color="#2D9D9C" />
                <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#102B2D' }}>
                  {new Date(upcomingAppointment.scheduledAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                  {' '}•{' '}
                  {new Date(upcomingAppointment.scheduledAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <p style={{ fontSize: '0.85rem', color: '#102B2D', margin: 0, opacity: 0.85 }}>
                {upcomingAppointment.reason || 'General Consultation'}
              </p>
              <span style={{ display: 'inline-block', padding: '4px 12px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 700,
                background: upcomingAppointment.status === 'Confirmed' ? 'rgba(13, 148, 136, 0.12)' : 'rgba(217, 119, 6, 0.12)',
                color: upcomingAppointment.status === 'Confirmed' ? 'var(--color-semantic-success)' : 'var(--color-semantic-warning)',
                alignSelf: 'flex-start',
                marginTop: '4px'
              }}>
                {upcomingAppointment.status}
              </span>
            </div>
          ) : (
            <p style={{ fontSize: '0.9rem', color: '#2D9D9C', margin: 0, fontStyle: 'italic' }}>No upcoming visits scheduled.</p>
          )}

          <Button
            variant="outline"
            size="sm"
            className="btn-arrow-hover"
            onClick={() => navigate('/patient/appointments')}
            style={{ alignSelf: 'flex-start', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '6px', marginTop: 'auto' }}
          >
            View Appointments <ArrowRight size={14} />
          </Button>
        </Card>

        {/* Recent Assessment */}
        <Card className="clinical-glass-card interactive-surface" style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h2 style={{ fontSize: '0.8rem', fontWeight: 700, color: '#2D9D9C', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'Outfit, sans-serif' }}>Recent Assessment</h2>
            </div>
            <div style={iconWrapperStyle}>
              <Activity size={20} />
            </div>
          </div>

          {latestAssessment ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <p style={{ fontSize: '0.85rem', color: '#2D9D9C', margin: 0 }}>
                {new Date(latestAssessment.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
              </p>
              <span style={{
                display: 'inline-block', padding: '4px 12px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 700, alignSelf: 'flex-start',
                background: urgencyColor(latestAssessment.urgency).bg,
                color: urgencyColor(latestAssessment.urgency).color,
                marginTop: '2px'
              }}>
                {latestAssessment.urgency}
              </span>
              <p style={{ fontSize: '0.9rem', fontWeight: 700, color: '#102B2D', margin: '2px 0 0' }}>
                {latestAssessment.specialty}
              </p>
            </div>
          ) : (
            <p style={{ fontSize: '0.9rem', color: '#2D9D9C', margin: 0, fontStyle: 'italic' }}>No assessments completed yet.</p>
          )}

          <Button
            variant="outline"
            size="sm"
            className="btn-arrow-hover"
            onClick={() => navigate('/patient/assessment')}
            style={{ alignSelf: 'flex-start', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '6px', marginTop: 'auto' }}
          >
            {latestAssessment ? 'New Assessment' : 'Start Assessment'} <ArrowRight size={14} />
          </Button>
        </Card>
      </section>

      {/* Row 2: Medicines + Prescriptions */}
      <section
        style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: '20px' }}
        aria-label="Medical records"
      >
        {/* Medicines */}
        <Card className="clinical-glass-card interactive-surface" style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <h2 style={{ fontSize: '0.8rem', fontWeight: 700, color: '#2D9D9C', margin: 0, textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'Outfit, sans-serif' }}>Medicines</h2>
            <div style={{ ...iconWrapperStyle, background: 'rgba(45, 157, 156, 0.15)', color: '#2D9D9C' }}>
              <Pill size={20} />
            </div>
          </div>

          {medicines.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {medicines.slice(0, 2).map((med, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: 'var(--color-surface-interactive)', borderRadius: '12px', border: '1px solid var(--color-border)' }}>
                  <Pill size={16} color="#00C4CC" />
                  <div>
                    <strong style={{ fontSize: '0.9rem', color: '#102B2D', display: 'block', fontWeight: 700 }}>{med.name}</strong>
                    <span style={{ fontSize: '0.8rem', color: '#2D9D9C' }}>{med.dosage}</span>
                  </div>
                </div>
              ))}
              {medicines.length > 2 && (
                <p style={{ fontSize: '0.8rem', color: '#2D9D9C', margin: '4px 0 0', fontWeight: 600 }}>+{medicines.length - 2} more</p>
              )}
            </div>
          ) : (
            <p style={{ fontSize: '0.9rem', color: '#2D9D9C', margin: 0, fontStyle: 'italic' }}>No medicines recorded.</p>
          )}

          <Button
            variant="outline"
            size="sm"
            className="btn-arrow-hover"
            onClick={() => navigate('/patient/medicines')}
            style={{ alignSelf: 'flex-start', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '6px', marginTop: 'auto' }}
          >
            Medicine Cabinet <ArrowRight size={14} />
          </Button>
        </Card>

        {/* Prescriptions */}
        <Card className="clinical-glass-card interactive-surface" style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <h2 style={{ fontSize: '0.8rem', fontWeight: 700, color: '#2D9D9C', margin: 0, textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'Outfit, sans-serif' }}>Prescriptions</h2>
            <div style={{ ...iconWrapperStyle, background: 'rgba(45, 157, 156, 0.15)', color: '#2D9D9C' }}>
              <FileText size={20} />
            </div>
          </div>

          {latestPrescription ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <p style={{ fontSize: '0.85rem', color: '#2D9D9C', margin: 0 }}>
                {new Date(latestPrescription.issuedAt ?? latestPrescription.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
              </p>
              <p style={{ fontSize: '0.9rem', fontWeight: 700, color: '#102B2D', margin: '2px 0 0' }}>
                {latestPrescription.clinicalNotes || `Prescription #${latestPrescription.id}`}
              </p>
              <span style={{ display: 'inline-block', padding: '4px 12px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 700, background: 'rgba(13, 148, 136, 0.12)', color: 'var(--color-semantic-success)', alignSelf: 'flex-start', marginTop: '4px' }}>
                {latestPrescription.status}
              </span>
            </div>
          ) : (
            <p style={{ fontSize: '0.9rem', color: '#2D9D9C', margin: 0, fontStyle: 'italic' }}>No prescriptions issued yet.</p>
          )}

          <Button
            variant="outline"
            size="sm"
            className="btn-arrow-hover"
            onClick={() => navigate('/patient/prescriptions')}
            style={{ alignSelf: 'flex-start', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '6px', marginTop: 'auto' }}
          >
            View Prescriptions <ArrowRight size={14} />
          </Button>
        </Card>
      </section>

      {/* Emergency Assistance Banner */}
      <section>
        <div
          role="region"
          aria-label="Emergency assistance"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '16px',
            padding: 'clamp(16px, 4vw, 22px) clamp(16px, 4vw, 28px)',
            background: 'rgba(220, 38, 38, 0.04)',
            border: '1px solid rgba(220, 38, 38, 0.18)',
            borderLeft: '4px solid var(--color-semantic-emergency)',
            borderRadius: '16px',
            boxShadow: 'var(--shadow-sm)',
            fontFamily: 'Plus Jakarta Sans, sans-serif'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(220, 38, 38, 0.10)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
              <TriangleAlert size={22} color="var(--color-semantic-emergency)" />
            </div>
            <div>
              <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--color-semantic-emergency)', margin: '0 0 4px', fontFamily: 'Outfit, sans-serif' }}>Emergency Assistance</h2>
              <p style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', margin: 0 }}>
                Need urgent help? Access emergency contacts and services.
              </p>
            </div>
          </div>
          <Button
            variant="danger"
            onClick={() => navigate('/patient/emergency')}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', borderRadius: '12px', flexShrink: 0, fontWeight: 700 }}
          >
            <TriangleAlert size={16} /> Emergency Assistance
          </Button>
        </div>
      </section>

    </div>
  );
};

