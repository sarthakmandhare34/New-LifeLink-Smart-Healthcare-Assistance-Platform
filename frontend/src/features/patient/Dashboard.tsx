import React from 'react';                                                                // Core React UI framework
import { useNavigate } from 'react-router-dom';                                                 // Single-page application route navigator
import { 
  Calendar, Activity, Pill, FileText, TriangleAlert, ArrowRight, Clock
} from 'lucide-react';                                                                          // Healthcare status and navigation iconography
import { Card } from '../../components/ui/Card';                                                // Glassmorphic responsive container
import { Button } from '../../components/ui/Button';                                            // Interactive button component
import { trpc } from '../../lib/trpc';                                                          // Type-safe tRPC client bridge
import { useAuth } from '../../_core/hooks/useAuth';                                            // Authentication state hook supplying active user

// Dynamic badge coloring function based on triage urgency
function urgencyColor(urgency: string) {
  if (urgency === 'EMERGENCY') return { bg: 'rgba(220, 38, 38, 0.12)', color: 'var(--color-semantic-emergency)' }; // Urgent red styling
  if (urgency === 'MODERATE') return { bg: 'rgba(217, 119, 6, 0.12)', color: 'var(--color-semantic-warning)' };     // Moderate amber styling
  if (urgency === 'ERROR') return { bg: 'rgba(225, 29, 72, 0.12)', color: '#e11d48' };                             // Parse warning styling
  return { bg: 'rgba(13, 148, 136, 0.12)', color: 'var(--color-semantic-success)' };                               // Routine green styling
}

// =========================================================================================
// PATIENT CLINICAL DASHBOARD
// Serves as the primary patient portal landing screen upon successful authentication.
// Aggregates upcoming scheduled visits, latest AI symptom triage result, active medicine cabinet,
// verified doctor prescriptions, and one-touch emergency hotline access.
// =========================================================================================
export const PatientDashboard = () => {
  const { user } = useAuth();                                                                   // Logged-in session credentials
  const dashboardQuery = trpc.patientDashboard.summary.useQuery();                              // Single aggregated server query
  const navigate = useNavigate();                                                               // Router navigation hook

  // Loading skeleton placeholder while aggregate dashboard query is resolving
  if (dashboardQuery.isLoading) {
    return (
      <div className="dashboard-loading" style={{ padding: '24px' }}>
        <p className="caption" style={{ color: '#2D9D9C', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Loading your health workspace…</p>
      </div>
    );
  }

  // Error boundary state if patient profile could not be loaded
  if (!dashboardQuery.data?.profile) {
    return (
      <div className="dashboard-loading" style={{ padding: '24px' }}>
        <p className="caption" style={{ color: 'var(--color-semantic-emergency)', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Your patient profile could not be loaded. Please refresh and try again.</p>
      </div>
    );
  }

  const { profile: patient, latestAssessment, medicines, appointments, prescriptions } = dashboardQuery.data; // Destructure aggregate payload
  
  // Find the closest upcoming confirmed/pending appointment scheduled for the future
  const now = new Date();
  const upcomingAppointment = appointments
    .filter((a) => ['Requested', 'Pending', 'Confirmed'].includes(a.status) && new Date(a.scheduledAt) >= now) // Filter future active appointments
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())[0] ?? null;         // Pick earliest chronological visit

  const latestPrescription = prescriptions[0] ?? null;                                          // Most recently issued prescription

  // Reusable card styling layout tokens
  const cardStyle = {
    padding: 'clamp(16px, 4vw, 24px)',                                                          // Fluid responsive padding
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '16px',
    minHeight: '220px',                                                                         // Consistent height across grid columns
  };

  // Icon badge wrapper styling
  const iconWrapperStyle = {
    width: '40px',
    height: '40px',
    borderRadius: '12px',
    background: 'rgba(0, 196, 204, 0.15)',                                                      // Brand cyan translucent backdrop
    display: 'grid',
    placeItems: 'center',                                                                       // Center SVG inside circle
    color: '#00C4CC',
    flexShrink: 0
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>

      {/* Welcome Greeting Header */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <h1 className="font-display" style={{ fontSize: '2rem', fontWeight: 700, margin: 0, color: '#102B2D', letterSpacing: '-0.02em', fontFamily: 'Outfit, sans-serif' }}>
          Good morning, {patient.name || user?.name || 'Patient'}                               {/* Personalized clinical greeting */}
        </h1>
        <p style={{ color: '#2D9D9C', fontSize: '1rem', margin: 0 }}>
          Your LifeLink overview
        </p>
      </section>

      {/* =====================================================================================
          ROW 1: UPCOMING APPOINTMENT & RECENT AI ASSESSMENT
          ===================================================================================== */}
      <section
        style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: '20px' }}
        aria-label="Health activity"
      >
        {/* Upcoming Appointment Card */}
        <Card className="clinical-glass-card interactive-surface" style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h2 style={{ fontSize: '0.8rem', fontWeight: 700, color: '#2D9D9C', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'Outfit, sans-serif' }}>Upcoming Appointment</h2>
            </div>
            <div style={iconWrapperStyle}>
              <Calendar size={20} />                                                            {/* Calendar appointment icon */}
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
                {upcomingAppointment.status}                                                    {/* Booking status badge */}
              </span>
            </div>
          ) : (
            <p style={{ fontSize: '0.9rem', color: '#2D9D9C', margin: 0, fontStyle: 'italic' }}>No upcoming visits scheduled.</p>
          )}

          {/* Quick link to appointments manager */}
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

        {/* Recent AI Symptom Assessment Card */}
        <Card className="clinical-glass-card interactive-surface" style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h2 style={{ fontSize: '0.8rem', fontWeight: 700, color: '#2D9D9C', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'Outfit, sans-serif' }}>Recent Assessment</h2>
            </div>
            <div style={iconWrapperStyle}>
              <Activity size={20} />                                                            {/* Vital activity pulse icon */}
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
                {latestAssessment.urgency}                                                      {/* Urgency status badge */}
              </span>
              <p style={{ fontSize: '0.9rem', fontWeight: 700, color: '#102B2D', margin: '2px 0 0' }}>
                {latestAssessment.specialty}                                                    {/* Triaged clinical specialty */}
              </p>
            </div>
          ) : (
            <p style={{ fontSize: '0.9rem', color: '#2D9D9C', margin: 0, fontStyle: 'italic' }}>No assessments completed yet.</p>
          )}

          {/* Quick link to start or view assessments */}
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

      {/* =====================================================================================
          ROW 2: ACTIVE MEDICATIONS & OFFICIAL PRESCRIPTIONS
          ===================================================================================== */}
      <section
        style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: '20px' }}
        aria-label="Medical records"
      >
        {/* Medicines Overview Card */}
        <Card className="clinical-glass-card interactive-surface" style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <h2 style={{ fontSize: '0.8rem', fontWeight: 700, color: '#2D9D9C', margin: 0, textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'Outfit, sans-serif' }}>Medicines</h2>
            <div style={{ ...iconWrapperStyle, background: 'rgba(45, 157, 156, 0.15)', color: '#2D9D9C' }}>
              <Pill size={20} />                                                                {/* Medication icon */}
            </div>
          </div>

          {medicines.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {medicines.slice(0, 2).map((med, idx) => (                                        // Preview first two medications
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

          {/* Quick link to medicine cabinet */}
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

        {/* Digital Prescriptions Card */}
        <Card className="clinical-glass-card interactive-surface" style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <h2 style={{ fontSize: '0.8rem', fontWeight: 700, color: '#2D9D9C', margin: 0, textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'Outfit, sans-serif' }}>Prescriptions</h2>
            <div style={{ ...iconWrapperStyle, background: 'rgba(45, 157, 156, 0.15)', color: '#2D9D9C' }}>
              <FileText size={20} />                                                            {/* Medical record icon */}
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
                {latestPrescription.status}                                                     {/* Prescription status */}
              </span>
            </div>
          ) : (
            <p style={{ fontSize: '0.9rem', color: '#2D9D9C', margin: 0, fontStyle: 'italic' }}>No prescriptions issued yet.</p>
          )}

          {/* Quick link to prescriptions repository */}
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

      {/* =====================================================================================
          EMERGENCY ASSISTANCE CALLOUT BANNER
          ===================================================================================== */}
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
              <TriangleAlert size={22} color="var(--color-semantic-emergency)" />               {/* Emergency warning icon */}
            </div>
            <div>
              <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--color-semantic-emergency)', margin: '0 0 4px', fontFamily: 'Outfit, sans-serif' }}>Emergency Assistance</h2>
              <p style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', margin: 0 }}>
                Need urgent help? Access emergency contacts and services.
              </p>
            </div>
          </div>
          {/* Direct navigation to Emergency Assistance portal */}
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
