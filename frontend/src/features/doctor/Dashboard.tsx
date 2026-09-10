import React from 'react';
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Users, Calendar, Clock, Activity, ArrowRight, Stethoscope } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { trpc } from "../../lib/trpc";

function urgencyBadge(urgency: string) {
  if (urgency === 'EMERGENCY') {
    return { bg: 'rgba(220, 38, 38, 0.12)', color: 'var(--color-semantic-emergency)', border: '1px solid rgba(220, 38, 38, 0.2)' };
  }
  if (urgency === 'MODERATE') {
    return { bg: 'rgba(217, 119, 6, 0.12)', color: 'var(--color-semantic-warning)', border: '1px solid rgba(217, 119, 6, 0.2)' };
  }
  if (urgency === 'ERROR') {
    return { bg: 'rgba(225, 29, 72, 0.12)', color: '#e11d48', border: '1px solid rgba(225, 29, 72, 0.2)' };
  }
  return { bg: 'rgba(13, 148, 136, 0.12)', color: 'var(--color-semantic-success)', border: '1px solid rgba(13, 148, 136, 0.2)' };
}

function statusBadge(status: string) {
  if (status === 'Confirmed' || status === 'Completed') {
    return { bg: 'rgba(13, 148, 136, 0.12)', color: 'var(--color-semantic-success)', border: '1px solid rgba(13, 148, 136, 0.2)' };
  }
  if (status === 'Cancelled') {
    return { bg: 'rgba(220, 38, 38, 0.12)', color: 'var(--color-semantic-emergency)', border: '1px solid rgba(220, 38, 38, 0.2)' };
  }
  return { bg: 'rgba(217, 119, 6, 0.12)', color: 'var(--color-semantic-warning)', border: '1px solid rgba(217, 119, 6, 0.2)' };
}

export const DoctorDashboard = () => {
  const navigate = useNavigate();
  const dashboard = trpc.doctorWorkspace.dashboard.useQuery();
  const session = trpc.doctorAuth.me.useQuery(undefined, { retry: false, refetchOnWindowFocus: false });
  const patientsQuery = trpc.doctorWorkspace.patients.useQuery(undefined, { enabled: Boolean(session.data) });
  const appointmentsQuery = trpc.doctorWorkspace.appointments.list.useQuery(undefined, { enabled: Boolean(session.data) });

  if (dashboard.isLoading) return (
    <div className="dashboard-loading" style={{ padding: '40px', textAlign: 'center' }}>
      <p className="caption" style={{ color: '#2D9D9C', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Loading clinical workspace…</p>
    </div>
  );
  if (dashboard.isError || !dashboard.data) return (
    <div style={{ padding: '40px', textAlign: 'center' }}>
      <p role="alert" style={{ color: 'var(--color-semantic-emergency)', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Unable to load the clinical workspace. Please try again.</p>
    </div>
  );

  const { pendingCount, upcomingCount, patientCount, assessmentCount = 0, recentAssessments = [] } = dashboard.data;
  const recentPatients = patientsQuery.data ?? [];

  // Upcoming appointments: strictly scheduled in the future with active status, ordered nearest first
  const now = Date.now();
  const upcomingAppointments = (appointmentsQuery.data ?? [])
    .filter(
      (a) =>
        ['Requested', 'Pending', 'Confirmed'].includes(a.status) &&
        new Date(a.scheduledAt).getTime() >= now
    )
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());

  // Recent activity: actual appointments ordered by most recent creation/schedule timestamp
  const recentActivity = (appointmentsQuery.data ?? [])
    .slice()
    .sort((a, b) => new Date(b.createdAt || b.scheduledAt).getTime() - new Date(a.createdAt || a.scheduledAt).getTime())
    .slice(0, 5);

  const displayName = session.data?.displayName
    ? `Dr. ${session.data.displayName.replace(/^Dr\.?\s*/i, '')}`
    : 'Doctor';

  const cardStyle = {
    background: '#E6F9FC',
    padding: 'clamp(16px, 4vw, 24px)',
    borderRadius: '20px',
    border: '1px solid #9FFBFF',
    boxShadow: '0 8px 32px rgba(16, 43, 45, 0.04)',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '16px',
  };

  const statCardStyle = {
    background: '#E6F9FC',
    padding: 'clamp(16px, 4vw, 22px)',
    borderRadius: '20px',
    border: '1px solid #9FFBFF',
    boxShadow: '0 8px 32px rgba(16, 43, 45, 0.04)',
    display: 'flex',
    flexDirection: 'column' as const,
    justifyContent: 'space-between' as const,
    minHeight: '140px',
  };

  const iconWrapperStyle = {
    width: '40px',
    height: '40px',
    borderRadius: '12px',
    background: 'rgba(0, 196, 204, 0.15)',
    display: 'grid',
    placeItems: 'center',
    color: '#00C4CC',
    flexShrink: 0,
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>

      {/* Welcome Header */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <h1 className="font-display" style={{ fontSize: '2rem', fontWeight: 700, margin: 0, color: '#102B2D', letterSpacing: '-0.02em', fontFamily: 'Outfit, sans-serif' }}>
          Welcome, {displayName}
        </h1>
        <p style={{ color: '#2D9D9C', fontSize: '1rem', margin: 0 }}>
          Practice overview and clinical triage workspace
        </p>
      </section>

      {/* 4 Operational Stat Cards */}
      <section
        style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: '20px' }}
        aria-label="Clinical practice statistics"
      >
        {/* 1. Upcoming Appointments — actual future/confirmed */}
        <Card style={statCardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#2D9D9C', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'Outfit, sans-serif' }}>
              Upcoming Appointments
            </span>
            <div style={iconWrapperStyle}>
              <Calendar size={20} />
            </div>
          </div>
          <div>
            <div className="font-display" style={{ fontSize: '2.2rem', fontWeight: 800, lineHeight: 1, color: '#102B2D', marginBottom: '8px', letterSpacing: '-0.02em', fontFamily: 'Outfit, sans-serif' }}>
              {upcomingCount}
            </div>
            <span style={{ fontSize: '0.78rem', color: '#2D9D9C' }}>Scheduled future visits</span>
          </div>
        </Card>

        {/* 2. Pending Requests — awaiting clinical action */}
        <Card style={statCardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#2D9D9C', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'Outfit, sans-serif' }}>
              Pending Requests
            </span>
            <div style={{ ...iconWrapperStyle, background: 'rgba(217, 119, 6, 0.15)', color: 'var(--color-semantic-warning)' }}>
              <Clock size={20} />
            </div>
          </div>
          <div>
            <div className="font-display" style={{ fontSize: '2.2rem', fontWeight: 800, lineHeight: 1, color: '#102B2D', marginBottom: '8px', letterSpacing: '-0.02em', fontFamily: 'Outfit, sans-serif' }}>
              {pendingCount}
            </div>
            <span style={{ fontSize: '0.78rem', color: pendingCount > 0 ? 'var(--color-semantic-warning)' : '#2D9D9C', fontWeight: pendingCount > 0 ? 700 : 500 }}>
              {pendingCount > 0 ? 'Requires action' : 'All clear'}
            </span>
          </div>
        </Card>

        {/* 3. Accessible Patients — authorized via appointments */}
        <Card style={statCardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#2D9D9C', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'Outfit, sans-serif' }}>
              Accessible Patients
            </span>
            <div style={iconWrapperStyle}>
              <Users size={20} />
            </div>
          </div>
          <div>
            <div className="font-display" style={{ fontSize: '2.2rem', fontWeight: 800, lineHeight: 1, color: '#102B2D', marginBottom: '8px', letterSpacing: '-0.02em', fontFamily: 'Outfit, sans-serif' }}>
              {patientCount}
            </div>
            <span style={{ fontSize: '0.78rem', color: '#2D9D9C' }}>Authorized patient links</span>
          </div>
        </Card>

        {/* 4. Recent Assessments — count of assessments submitted by authorized patients */}
        <Card style={statCardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#2D9D9C', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'Outfit, sans-serif' }}>
              Recent Assessments
            </span>
            <div style={{ ...iconWrapperStyle, background: 'rgba(45, 157, 156, 0.15)', color: '#2D9D9C' }}>
              <Activity size={20} />
            </div>
          </div>
          <div>
            <div className="font-display" style={{ fontSize: '2.2rem', fontWeight: 800, lineHeight: 1, color: '#102B2D', marginBottom: '8px', letterSpacing: '-0.02em', fontFamily: 'Outfit, sans-serif' }}>
              {assessmentCount}
            </div>
            <span style={{ fontSize: '0.78rem', color: '#2D9D9C' }}>Submitted triage context</span>
          </div>
        </Card>
      </section>

      {/* Main 2-Column Clinical Layout */}
      <section
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 420px), 1fr))',
          gap: '24px',
          alignItems: 'start',
        }}
        aria-label="Clinical practice activity"
      >
        {/* Left Column: Upcoming Appointments + Recent Assessments */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

          {/* 1. Upcoming Appointments */}
          <Card style={cardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: '#102B2D', fontFamily: 'Outfit, sans-serif' }}>
                  Upcoming Appointments
                </h2>
                <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: '#2D9D9C' }}>Chronological schedule</p>
              </div>
              <button
                onClick={() => navigate('/doctor/appointments')}
                aria-label="View all upcoming appointments"
                style={{ background: 'none', border: 'none', color: '#00C4CC', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                View All <ArrowRight size={14} />
              </button>
            </div>

            {upcomingAppointments.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {upcomingAppointments.slice(0, 4).map((apt: any, idx: number) => {
                  const aptDate = new Date(apt.scheduledAt);
                  const badge = statusBadge(apt.status);
                  const patientName = apt.patient?.name || apt.patientName || 'Patient';
                  return (
                    <div
                      key={apt.id || idx}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '8px',
                        padding: '14px 16px',
                        background: 'rgba(255, 255, 255, 0.65)',
                        borderRadius: '14px',
                        border: '1px solid rgba(0, 244, 255, 0.25)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', minWidth: 0, flex: '1 1 200px' }}>
                        <div style={{ width: '82px', flexShrink: 0 }}>
                          <span className="font-display" style={{ fontSize: '0.88rem', fontWeight: 700, color: '#00C4CC', display: 'block', fontFamily: 'Outfit, sans-serif' }}>
                            {aptDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                          </span>
                          <span style={{ fontSize: '0.75rem', color: '#2D9D9C', display: 'block' }}>
                            {aptDate.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <strong style={{ display: 'block', fontSize: '0.92rem', color: '#102B2D', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {patientName}
                          </strong>
                          <span style={{ fontSize: '0.78rem', color: '#2D9D9C', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {apt.reason || 'General Consultation'}
                          </span>
                        </div>
                      </div>
                      <span
                        style={{
                          padding: '4px 10px',
                          borderRadius: '8px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          background: badge.bg,
                          color: badge.color,
                          border: badge.border,
                          flexShrink: 0,
                        }}
                      >
                        {apt.status}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ padding: '24px 16px', textAlign: 'center', background: 'rgba(255, 255, 255, 0.4)', borderRadius: '14px', border: '1px dashed #9FFBFF' }}>
                <p style={{ fontSize: '0.88rem', color: '#2D9D9C', margin: '0 0 12px', fontStyle: 'italic' }}>No upcoming appointments scheduled.</p>
                <Button
                  size="sm"
                  onClick={() => navigate('/doctor/appointments')}
                  style={{ background: '#00C4CC', borderColor: '#00C4CC', borderRadius: '10px', color: '#FFF', fontWeight: 700 }}
                >
                  Review All Appointments
                </Button>
              </div>
            )}
          </Card>

          {/* 2. Recent Assessments (from authorized patients) */}
          <Card style={cardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: '#102B2D', fontFamily: 'Outfit, sans-serif' }}>
                  Recent Assessments
                </h2>
                <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: '#2D9D9C' }}>Submitted by assigned patients</p>
              </div>
              <button
                onClick={() => navigate('/doctor/assessments')}
                aria-label="View all recent assessments"
                style={{ background: 'none', border: 'none', color: '#00C4CC', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                View All <ArrowRight size={14} />
              </button>
            </div>

            {recentAssessments.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {recentAssessments.slice(0, 3).map((assessment: any, idx: number) => {
                  const badge = urgencyBadge(assessment.urgency);
                  return (
                    <div
                      key={assessment.id || idx}
                      tabIndex={assessment.patientId ? 0 : undefined}
                      role={assessment.patientId ? 'button' : undefined}
                      aria-label={assessment.patientId ? `View assessment for ${assessment.patientName || 'Assigned Patient'}` : undefined}
                      style={{
                        padding: '14px 16px',
                        background: 'rgba(255, 255, 255, 0.65)',
                        borderRadius: '14px',
                        border: '1px solid rgba(0, 244, 255, 0.25)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                        cursor: assessment.patientId ? 'pointer' : 'default',
                      }}
                      onClick={() => assessment.patientId && navigate(`/doctor/patients/${assessment.patientId}`)}
                      onKeyDown={(e) => {
                        if (assessment.patientId && (e.key === 'Enter' || e.key === ' ')) {
                          e.preventDefault();
                          navigate(`/doctor/patients/${assessment.patientId}`);
                        }
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <strong style={{ fontSize: '0.92rem', color: '#102B2D' }}>
                            {assessment.patientName || 'Assigned Patient'}
                          </strong>
                          <span style={{ fontSize: '0.75rem', color: '#2D9D9C', display: 'block' }}>
                            {new Date(assessment.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                        </div>
                        <span
                          style={{
                            padding: '3px 10px',
                            borderRadius: '8px',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            background: badge.bg,
                            color: badge.color,
                            border: badge.border,
                          }}
                        >
                          {assessment.urgency}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.82rem', color: '#102B2D', opacity: 0.85 }}>
                        <span style={{ fontWeight: 600, color: '#2D9D9C' }}>Specialty:</span> {assessment.specialty}
                      </div>
                      {assessment.guidance && (
                        <p style={{ margin: 0, fontSize: '0.78rem', color: '#2D9D9C', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {assessment.guidance}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ padding: '24px 16px', textAlign: 'center', background: 'rgba(255, 255, 255, 0.4)', borderRadius: '14px', border: '1px dashed #9FFBFF' }}>
                <p style={{ fontSize: '0.88rem', color: '#2D9D9C', margin: 0, fontStyle: 'italic' }}>
                  No recent assessments submitted by assigned patients.
                </p>
              </div>
            )}
          </Card>
        </div>

        {/* Right Column: Accessible Patients + Recent Activity */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

          {/* 3. Accessible Patients */}
          <Card style={cardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: '#102B2D', fontFamily: 'Outfit, sans-serif' }}>
                  Accessible Patients
                </h2>
                <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: '#2D9D9C' }}>Appointment-authorized records</p>
              </div>
              <button
                onClick={() => navigate('/doctor/patients')}
                aria-label="View all accessible patients"
                style={{ background: 'none', border: 'none', color: '#00C4CC', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                View All <ArrowRight size={14} />
              </button>
            </div>

            {recentPatients.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {recentPatients.slice(0, 4).map((pt: any, idx: number) => {
                  const initials = (pt.name || 'P')
                    .split(' ')
                    .map((w: string) => w[0])
                    .join('')
                    .toUpperCase()
                    .slice(0, 2);
                  return (
                    <div
                      key={pt.id || idx}
                      tabIndex={0}
                      role="button"
                      aria-label={`View records for ${pt.name}`}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px 14px',
                        background: 'rgba(255, 255, 255, 0.65)',
                        borderRadius: '12px',
                        border: '1px solid rgba(0, 244, 255, 0.25)',
                        cursor: 'pointer',
                        transition: 'transform 0.15s ease',
                      }}
                      onClick={() => navigate(`/doctor/patients/${pt.id}`)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          navigate(`/doctor/patients/${pt.id}`);
                        }
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div
                          style={{
                            width: '38px',
                            height: '38px',
                            borderRadius: '50%',
                            background: 'rgba(0, 196, 204, 0.15)',
                            color: '#00C4CC',
                            fontWeight: 700,
                            fontSize: '0.85rem',
                            display: 'grid',
                            placeItems: 'center',
                            flexShrink: 0,
                            fontFamily: 'Outfit, sans-serif',
                          }}
                        >
                          {initials}
                        </div>
                        <div>
                          <strong style={{ fontSize: '0.9rem', color: '#102B2D', display: 'block' }}>{pt.name}</strong>
                          <span style={{ fontSize: '0.72rem', color: '#2D9D9C' }}>Patient ID: #{pt.id}</span>
                        </div>
                      </div>
                      <ArrowRight size={16} color="#00C4CC" />
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ padding: '20px 16px', textAlign: 'center', background: 'rgba(255, 255, 255, 0.4)', borderRadius: '14px', border: '1px dashed #9FFBFF' }}>
                <p style={{ fontSize: '0.85rem', color: '#2D9D9C', margin: 0, fontStyle: 'italic' }}>No authorized patient records yet.</p>
              </div>
            )}
          </Card>

          {/* 4. Recent Activity */}
          <Card style={cardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: '#102B2D', fontFamily: 'Outfit, sans-serif' }}>
                  Recent Activity
                </h2>
                <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: '#2D9D9C' }}>Practice clinical timeline</p>
              </div>
            </div>

            {recentActivity.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {recentActivity.map((apt: any, idx: number) => {
                  const patientName = apt.patient?.name || apt.patientName || 'Patient';
                  const isCompleted = apt.status === 'Completed';
                  const isCancelled = apt.status === 'Cancelled';
                  const dotColor = isCompleted
                    ? 'var(--color-semantic-success)'
                    : isCancelled
                    ? 'var(--color-semantic-emergency)'
                    : '#00C4CC';
                  return (
                    <div key={apt.id || idx} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 0' }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: dotColor, flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ fontSize: '0.84rem', color: '#102B2D', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          <strong style={{ fontWeight: 600 }}>{patientName}</strong> &bull; <span style={{ color: dotColor, fontWeight: 600 }}>{apt.status}</span>
                        </span>
                        <span style={{ fontSize: '0.72rem', color: '#2D9D9C' }}>
                          {new Date(apt.scheduledAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ padding: '20px 16px', textAlign: 'center', background: 'rgba(255, 255, 255, 0.4)', borderRadius: '14px' }}>
                <p style={{ fontSize: '0.85rem', color: '#2D9D9C', margin: 0, fontStyle: 'italic' }}>No recent clinical activity.</p>
              </div>
            )}
          </Card>
        </div>
      </section>

    </div>
  );
};
