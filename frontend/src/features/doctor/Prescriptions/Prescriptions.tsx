import React from 'react';                                                                // Core React component engine
import { useNavigate } from 'react-router-dom';                                                 // SPA route navigation hook
import { FileText, Lock, ArrowRight, Plus, Pill, Clock, User, CheckCircle2 } from 'lucide-react'; // Prescription icons
import { Card } from '../../../components/ui/Card';                                            // Glassmorphic card container
import { Button } from '../../../components/ui/Button';                                        // Styled user interaction button
import { Badge } from '../../../components/ui/Badge';                                          // Status badge component
import { trpc } from '../../../lib/trpc';                                                       // Type-safe tRPC client bridge

// =========================================================================================
// DOCTOR PRESCRIPTIONS WORKSPACE
// Allows clinicians to inspect past digital prescriptions issued under their credential,
// verify cryptographic integrity hashes, and initiate new prescriptions for authorized patients.
// =========================================================================================
export const DoctorPrescriptions = () => {
  const navigate = useNavigate();                                                               // Page navigation controller
  const prescriptionsQuery = trpc.doctorWorkspace.prescriptions.list.useQuery();                // Fetches doctor's issued prescriptions
  const patientsQuery = trpc.doctorWorkspace.patients.useQuery();                               // Fetches authorized patient list

  const isLoading = prescriptionsQuery.isLoading || patientsQuery.isLoading;                    // Combined loading flag

  // Loading state placeholder
  if (isLoading) {
    return (
      <div className="dashboard-loading" style={{ padding: '32px' }}>
        <p className="caption" style={{ color: '#2D9D9C' }}>Loading prescriptions workspace…</p>
      </div>
    );
  }

  const issuedPrescriptions = prescriptionsQuery.data ?? [];                                    // Fallback to empty array
  const assignedPatients = patientsQuery.data ?? [];                                            // Fallback to empty array

  // Uniform card styling layout
  const cardStyle = {
    background: '#E6F9FC',                                                                      // Soft cyan background
    padding: 'clamp(16px, 4vw, 24px)',                                                          // Responsive fluid padding
    borderRadius: '16px',                                                                       // Rounded corners
    border: '1px solid #9FFBFF',                                                                // Cyan accent border
    boxShadow: '0 4px 16px rgba(16, 43, 45, 0.04)',                                            // Elevation shadow
    display: 'flex',
    flexDirection: 'column' as const,
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
      
      {/* Workspace Header */}
      <header style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'rgba(0, 196, 204, 0.15)', display: 'grid', placeItems: 'center', color: '#00C4CC', flexShrink: 0 }}>
          <FileText size={26} />                                                                {/* Prescriptions header icon */}
        </div>
        <div>
          <h1 className="font-display" style={{ margin: 0, fontSize: '2rem', fontWeight: 700, color: '#102B2D', fontFamily: 'Outfit, sans-serif' }}>
            Prescriptions Workspace
          </h1>
          <p style={{ color: '#2D9D9C', fontSize: '0.92rem', margin: '3px 0 0' }}>
            Manage and issue verified digital prescriptions for authorized patients.
          </p>
        </div>
      </header>

      {/* =====================================================================================
          SECTION 1: ISSUED PRESCRIPTIONS
          ===================================================================================== */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: '16px' }} aria-labelledby="issued-prescriptions-heading">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 id="issued-prescriptions-heading" style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: '#102B2D', fontFamily: 'Outfit, sans-serif' }}>
              Issued Prescriptions
            </h2>
            <p style={{ margin: '2px 0 0', color: '#2D9D9C', fontSize: '0.85rem' }}>
              Records created and verified by your clinician session.
            </p>
          </div>
          <span style={{ fontSize: '0.85rem', color: '#2D9D9C', fontWeight: 600 }}>
            {issuedPrescriptions.length} {issuedPrescriptions.length === 1 ? 'record' : 'records'}
          </span>
        </div>

        {/* Empty state if doctor hasn't written any prescriptions yet */}
        {issuedPrescriptions.length === 0 ? (
          <Card style={{ ...cardStyle, textAlign: 'center', padding: '40px 24px' }}>
            <FileText size={40} color="#2D9D9C" style={{ margin: '0 auto 12px', opacity: 0.6 }} />
            <p style={{ margin: 0, color: '#2D9D9C', fontStyle: 'italic', fontSize: '0.95rem' }}>
              No prescriptions issued yet.
            </p>
          </Card>
        ) : (
          /* Grid of issued prescription cards */
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 320px), 1fr))', gap: '16px' }}>
            {issuedPrescriptions.map((rx) => (
              <Card key={rx.id} style={cardStyle}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px', marginBottom: '12px' }}>
                  <div>
                    <strong style={{ fontSize: '1.05rem', color: '#102B2D', display: 'block' }}>
                      {rx.patientName || 'Assigned Patient'}                                    {/* Patient receiving medication */}
                    </strong>
                    <span style={{ fontSize: '0.82rem', color: '#2D9D9C' }}>
                      Issued: {new Date(rx.issuedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>
                  <Badge status="neutral">
                    <Lock size={10} style={{ marginRight: '3px' }} /> {rx.status}               {/* Locked prescription status */}
                  </Badge>
                </div>

                {/* Prescribed medication items list */}
                <div style={{ padding: '10px', background: 'rgba(255, 255, 255, 0.7)', borderRadius: '10px', border: '1px solid #9FFBFF', marginBottom: '10px' }}>
                  <span style={{ fontSize: '0.75rem', color: '#2D9D9C', fontWeight: 700, textTransform: 'uppercase' }}>
                    Prescribed Items:
                  </span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '4px' }}>
                    {rx.items && rx.items.length > 0 ? (
                      rx.items.map((item) => (
                        <div key={item.id} style={{ fontSize: '0.86rem', color: '#102B2D' }}>
                          <Pill size={12} color="#00C4CC" style={{ display: 'inline', marginRight: '6px' }} />
                          <strong>{item.name}</strong> — {item.dosage} ({item.instructions})
                        </div>
                      ))
                    ) : (
                      <span style={{ fontSize: '0.82rem', color: '#2D9D9C', fontStyle: 'italic' }}>No items recorded</span>
                    )}
                  </div>
                </div>

                {/* Optional clinical doctor notes */}
                {rx.clinicalNotes && (
                  <p style={{ margin: '0 0 10px', fontSize: '0.84rem', color: '#102B2D', fontStyle: 'italic' }}>
                    &ldquo;{rx.clinicalNotes}&rdquo;
                  </p>
                )}

                {/* Cryptographic SHA256 integrity tamper seal */}
                {rx.integrityReference && (
                  <div style={{ marginTop: 'auto', paddingTop: '8px', borderTop: '1px solid #9FFBFF' }}>
                    <span style={{ fontSize: '0.68rem', color: '#2D9D9C', fontWeight: 700 }}>INTEGRITY REFERENCE:</span>
                    <p style={{ margin: '2px 0 0', fontSize: '0.7rem', fontFamily: 'monospace', color: '#102B2D', wordBreak: 'break-all', overflowWrap: 'anywhere' }}>
                      {rx.integrityReference}
                    </p>
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* =====================================================================================
          SECTION 2: ASSIGNED PATIENTS ELIGIBLE FOR PRESCRIPTIONS
          ===================================================================================== */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: '16px' }} aria-labelledby="eligible-patients-heading">
        <div>
          <h2 id="eligible-patients-heading" style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: '#102B2D', fontFamily: 'Outfit, sans-serif' }}>
            Write New Prescription
          </h2>
          <p style={{ margin: '2px 0 0', color: '#2D9D9C', fontSize: '0.85rem' }}>
            Select an authorized patient with a confirmed or completed appointment.
          </p>
        </div>

        {/* Empty state when doctor has no authorized patients */}
        {assignedPatients.length === 0 ? (
          <Card style={{ ...cardStyle, textAlign: 'center', padding: '40px 24px' }}>
            <FileText size={40} color="#2D9D9C" style={{ margin: '0 auto 12px', opacity: 0.6 }} />
            <h3 style={{ margin: '0 0 6px', color: '#102B2D', fontSize: '1rem' }}>No eligible patient appointments</h3>
            <p style={{ margin: '0 0 16px', color: '#2D9D9C', fontSize: '0.88rem' }}>
              Prescriptions can only be created once an appointment request has been confirmed.
            </p>
            <Button
              variant="primary"
              onClick={() => navigate('/doctor/appointments')}
              style={{ alignSelf: 'center', borderRadius: '10px', background: '#00C4CC', borderColor: '#00C4CC', color: '#FFF', fontWeight: 700 }}
            >
              Review Appointments <ArrowRight size={16} />
            </Button>
          </Card>
        ) : (
          /* Grid of patients eligible for prescribing */
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 280px), 1fr))', gap: '16px' }}>
            {assignedPatients.map((patient) => (
              <Card key={patient.id} style={cardStyle}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
                  <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: 'rgba(0, 196, 204, 0.15)', display: 'grid', placeItems: 'center', color: '#00C4CC', fontWeight: 800, fontSize: '1.1rem', flexShrink: 0 }}>
                    {patient.name.charAt(0).toUpperCase()}                                      {/* Patient initial avatar */}
                  </div>
                  <div>
                    <strong style={{ display: 'block', fontSize: '1rem', color: '#102B2D' }}>{patient.name}</strong>
                    <span style={{ fontSize: '0.8rem', color: '#2D9D9C' }}>Patient ID: #{patient.id}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px', marginTop: 'auto' }}>
                  <Button
                    variant="outline"
                    size="sm"
                    style={{ flex: 1, borderRadius: '10px', borderColor: '#2D9D9C', color: '#2D9D9C' }}
                    onClick={() => navigate(`/doctor/patients/${patient.id}`)}
                  >
                    View Record
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    style={{ flex: 1, borderRadius: '10px', background: '#00C4CC', borderColor: '#00C4CC', color: '#FFF', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                    onClick={() => navigate(`/doctor/patients/${patient.id}`)} // Opens patient record to issue Rx
                  >
                    <Plus size={14} /> Write Rx
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

    </div>
  );
};
