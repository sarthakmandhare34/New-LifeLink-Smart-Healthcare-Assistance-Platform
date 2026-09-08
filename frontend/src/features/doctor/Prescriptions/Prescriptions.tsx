import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Lock, ArrowRight, Plus, Pill, Clock, User, CheckCircle2 } from 'lucide-react';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { trpc } from '../../../lib/trpc';

export const DoctorPrescriptions = () => {
  const navigate = useNavigate();
  const prescriptionsQuery = trpc.doctorWorkspace.prescriptions.list.useQuery();
  const patientsQuery = trpc.doctorWorkspace.patients.useQuery();

  const isLoading = prescriptionsQuery.isLoading || patientsQuery.isLoading;

  if (isLoading) {
    return (
      <div className="dashboard-loading" style={{ padding: '32px' }}>
        <p className="caption" style={{ color: '#2D9D9C' }}>Loading prescriptions workspace…</p>
      </div>
    );
  }

  const issuedPrescriptions = prescriptionsQuery.data ?? [];
  const assignedPatients = patientsQuery.data ?? [];

  const cardStyle = {
    background: '#E6F9FC',
    padding: 'clamp(16px, 4vw, 24px)',
    borderRadius: '16px',
    border: '1px solid #9FFBFF',
    boxShadow: '0 4px 16px rgba(16, 43, 45, 0.04)',
    display: 'flex',
    flexDirection: 'column' as const,
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
      
      {/* Header */}
      <header style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'rgba(0, 196, 204, 0.15)', display: 'grid', placeItems: 'center', color: '#00C4CC', flexShrink: 0 }}>
          <FileText size={26} />
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

      {/* SECTION 1: ISSUED PRESCRIPTIONS */}
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

        {issuedPrescriptions.length === 0 ? (
          <Card style={{ ...cardStyle, textAlign: 'center', padding: '40px 24px' }}>
            <FileText size={40} color="#2D9D9C" style={{ margin: '0 auto 12px', opacity: 0.6 }} />
            <p style={{ margin: 0, color: '#2D9D9C', fontStyle: 'italic', fontSize: '0.95rem' }}>
              No prescriptions issued yet.
            </p>
          </Card>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 320px), 1fr))', gap: '16px' }}>
            {issuedPrescriptions.map((rx) => (
              <Card key={rx.id} style={cardStyle}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px', marginBottom: '12px' }}>
                  <div>
                    <strong style={{ fontSize: '1.05rem', color: '#102B2D', display: 'block' }}>
                      {rx.patientName || 'Assigned Patient'}
                    </strong>
                    <span style={{ fontSize: '0.82rem', color: '#2D9D9C' }}>
                      Issued: {new Date(rx.issuedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>
                  <Badge status="neutral">
                    <Lock size={10} style={{ marginRight: '3px' }} /> {rx.status}
                  </Badge>
                </div>

                {/* Items */}
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

                {rx.clinicalNotes && (
                  <p style={{ margin: '0 0 10px', fontSize: '0.84rem', color: '#102B2D', fontStyle: 'italic' }}>
                    &ldquo;{rx.clinicalNotes}&rdquo;
                  </p>
                )}

                {/* Integrity Reference */}
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

      {/* SECTION 2: ASSIGNED PATIENTS TO PRESCRIBE */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: '16px' }} aria-labelledby="eligible-patients-heading">
        <div>
          <h2 id="eligible-patients-heading" style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: '#102B2D', fontFamily: 'Outfit, sans-serif' }}>
            Write New Prescription
          </h2>
          <p style={{ margin: '2px 0 0', color: '#2D9D9C', fontSize: '0.85rem' }}>
            Select an authorized patient with a confirmed or completed appointment.
          </p>
        </div>

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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 280px), 1fr))', gap: '16px' }}>
            {assignedPatients.map((patient) => (
              <Card key={patient.id} style={cardStyle}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
                  <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: 'rgba(0, 196, 204, 0.15)', display: 'grid', placeItems: 'center', color: '#00C4CC', fontWeight: 800, fontSize: '1.1rem', flexShrink: 0 }}>
                    {patient.name.charAt(0).toUpperCase()}
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
                    onClick={() => navigate(`/doctor/patients/${patient.id}`)}
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
