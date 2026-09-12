import React, { useState } from 'react';                                                  // Core React engine & component state tracking
import { Card } from '../../../components/ui/Card';                                            // Reusable glassmorphic UI container
import { Button } from '../../../components/ui/Button';                                        // Styled user interaction action button
import { Badge } from '../../../components/ui/Badge';                                          // Visual indicator chip for status badges
import { FileText, Lock, ArrowLeft, Pill, Clock, UserCheck, Stethoscope } from 'lucide-react';  // Medical and navigation iconography
import { trpc } from '../../../lib/trpc';                                                       // Type-safe client RPC gateway

// =========================================================================================
// PATIENT PRESCRIPTION VAULT COMPONENT
// Displays official digital medical prescriptions issued to the logged-in patient by licensed specialists.
// Features dual view: summary list cards and detailed itemized clinical verification views.
// =========================================================================================
export const Prescriptions = () => {
  // Query server for full list of prescriptions assigned to the current patient session
  const prescriptionsQuery = trpc.patientPrescription.list.useQuery();                          // Fetches all authorized prescriptions for current patient
  const [selectedRxId, setSelectedRxId] = useState<number | null>(null);                        // Tracks ID of prescription actively being viewed in modal/detail mode

  // Detail query for selected prescription (verifies server-side ownership and cryptographic tamper seals)
  const detailQuery = trpc.patientPrescription.getById.useQuery(
    { id: selectedRxId! },                                                                      // Target prescription identifier
    { enabled: selectedRxId !== null && selectedRxId > 0 }                                      // Query only fires when a positive numeric ID is selected
  );

  // Render friendly loading state during initial network synchronization
  if (prescriptionsQuery.isLoading) {                                                           // Check if initial prescriptions list is fetching
    return (
      <div className="flex items-center justify-center" style={{ minHeight: '50vh' }}>
        <p className="caption" style={{ color: '#2D9D9C' }}>Loading prescriptions…</p>         {/* Visual loading feedback */}
      </div>
    );
  }

  const prescriptions = prescriptionsQuery.data ?? [];                                          // Default to empty array if query response is null

  // =========================================================================================
  // DETAIL VIEW: ITEM-BY-ITEM CLINICAL PRESCRIPTION BREAKDOWN
  // =========================================================================================
  if (selectedRxId !== null) {                                                                  // Patient has clicked a specific prescription
    const rx = detailQuery.data;                                                                // Loaded prescription details
    const prescribingDoctor = rx?.doctor ?? null;                                               // Specialist who authorized and signed the prescription

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
        {/* Navigation header with back button */}
        <header style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Button
            variant="outline"                                                                   // Outline button style
            size="sm"                                                                          // Compact button size
            onClick={() => setSelectedRxId(null)}                                              // Reset selected ID to return to summary list
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', borderRadius: '10px' }}
          >
            <ArrowLeft size={16} /> Back to Prescriptions                                      {/* Back navigation button */}
          </Button>
          <h1 className="font-display" style={{ margin: 0, fontSize: '1.75rem', fontWeight: 700, color: '#102B2D', fontFamily: 'Outfit, sans-serif' }}>
            Prescription Details
          </h1>
        </header>

        {/* Loading detail state indicator */}
        {detailQuery.isLoading ? (
          <div className="flex items-center justify-center" style={{ minHeight: '30vh' }}>
            <p className="caption" style={{ color: '#2D9D9C' }}>Verifying prescription record…</p> {/* Integrity verification placeholder */}
          </div>
        ) : detailQuery.isError || !rx ? (
          /* Error or unauthorized state */
          <Card style={{ padding: '32px', textAlign: 'center', background: '#E6F9FC', border: '1px solid #9FFBFF', borderRadius: '16px' }}>
            <p role="alert" style={{ color: 'var(--color-semantic-emergency)', margin: 0, fontWeight: 600 }}>
              Prescription record not found or access is not authorized.
            </p>
          </Card>
        ) : (
          /* Detailed clinical prescription card */
          <Card
            style={{
              maxWidth: '760px',
              margin: '0 auto',
              width: '100%',
              background: '#FFFFFF',
              border: '1px solid #9FFBFF',
              borderRadius: '20px',
              boxShadow: '0 8px 32px rgba(16, 43, 45, 0.05)',
              padding: 'clamp(16px, 4vw, 28px)',
            }}
          >
            {/* Header / Doctor Info & Integrity Reference */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', borderBottom: '2px solid #E6F9FC', paddingBottom: '20px', marginBottom: '20px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <Stethoscope size={18} color="#00C4CC" />                                     {/* Specialist icon */}
                  <h2 style={{ fontSize: '1.25rem', margin: 0, fontWeight: 700, color: '#102B2D', fontFamily: 'Outfit, sans-serif' }}>
                    {prescribingDoctor?.name || 'Controlled Directory Specialist'}             {/* Doctor name display */}
                  </h2>
                </div>
                <p style={{ margin: '2px 0', fontSize: '0.9rem', color: '#2D9D9C' }}>
                  {prescribingDoctor?.specialty || 'Specialist'} • {prescribingDoctor?.hospital || 'Controlled Clinical Workspace'}
                </p>
                <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                  Issue Date: {new Date(rx.issuedAt).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
                </p>
              </div>

              {/* Prescription lock status & tamper hash */}
              <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
                <Badge status="neutral">
                  <Lock size={12} style={{ marginRight: '4px' }} /> {rx.status}               {/* Lock badge indicating immutable record */}
                </Badge>
                {rx.integrityReference && (
                  <div style={{ maxWidth: 'min(100%, 320px)', textAlign: 'right' }}>
                    <span style={{ fontSize: '0.7rem', color: '#2D9D9C', fontWeight: 600 }}>INTEGRITY REFERENCE</span>
                    <p
                      style={{
                        margin: '2px 0 0',
                        fontSize: '0.72rem',
                        fontFamily: 'monospace',
                        color: '#102B2D',
                        background: '#E6F9FC',
                        padding: '4px 8px',
                        borderRadius: '6px',
                        border: '1px solid #9FFBFF',
                        wordBreak: 'break-all',
                        overflowWrap: 'anywhere',
                      }}
                    >
                      {rx.integrityReference}                                                   {/* SHA256 integrity hash verification token */}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Prescribed Items (Rx) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '1.75rem', fontFamily: 'Outfit, sans-serif', fontWeight: 800, color: '#00C4CC', letterSpacing: '-0.02em' }}>
                  Rx                                                                            {/* Classic Latin prescription symbol */}
                </span>
                <h3 style={{ margin: 0, fontSize: '1rem', color: '#2D9D9C', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Prescribed Medication
                </h3>
              </div>

              {/* Medication roster */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {rx.items && rx.items.length > 0 ? (
                  rx.items.map((item) => (                                                      // Iterate through individual medicines
                    <div
                      key={item.id}
                      style={{
                        padding: '16px',
                        background: '#E6F9FC',
                        borderRadius: '12px',
                        border: '1px solid #9FFBFF',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                        <Pill size={16} color="#00C4CC" />                                      {/* Medicine pill icon */}
                        <strong style={{ fontSize: '1.05rem', color: '#102B2D', fontWeight: 700 }}>
                          {item.name}                                                           {/* Drug trade/generic name */}
                        </strong>
                        <span
                          style={{
                            padding: '2px 8px',
                            background: '#FFFFFF',
                            borderRadius: '6px',
                            border: '1px solid #9FFBFF',
                            fontSize: '0.82rem',
                            fontWeight: 600,
                            color: '#008B90',
                          }}
                        >
                          {item.dosage}                                                         {/* Specific dosage e.g. 500mg */}
                        </span>
                      </div>
                      <p style={{ margin: 0, fontSize: '0.88rem', color: '#102B2D', lineHeight: 1.5 }}>
                        <strong style={{ color: '#2D9D9C' }}>Instructions:</strong> {item.instructions} {/* Doctor's frequency/timing instructions */}
                      </p>
                    </div>
                  ))
                ) : (
                  <p style={{ color: '#2D9D9C', fontStyle: 'italic', margin: 0 }}>No prescription items recorded.</p>
                )}
              </div>

              {/* Clinical Notes & Observations */}
              {rx.clinicalNotes && (
                <div
                  style={{
                    marginTop: '12px',
                    padding: '16px',
                    background: 'rgba(0, 196, 204, 0.06)',
                    borderRadius: '12px',
                    border: '1px dashed #00C4CC',
                  }}
                >
                  <h4 style={{ margin: '0 0 6px 0', fontSize: '0.9rem', color: '#008B90', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Clinical Notes & Observations
                  </h4>
                  <p style={{ margin: 0, fontSize: '0.92rem', color: '#102B2D', fontStyle: 'italic', lineHeight: 1.5 }}>
                    &ldquo;{rx.clinicalNotes}&rdquo;                                            {/* Clinician diagnostic remarks */}
                  </p>
                </div>
              )}
            </div>
          </Card>
        )}
      </div>
    );
  }

  // =========================================================================================
  // LIST VIEW: ALL PRESCRIBED RECORDS
  // =========================================================================================
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
      {/* Header banner */}
      <header style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'rgba(0, 196, 204, 0.15)', display: 'grid', placeItems: 'center', color: '#00C4CC', flexShrink: 0 }}>
          <FileText size={26} />                                                                {/* Prescriptions header icon */}
        </div>
        <div>
          <h1 className="font-display" style={{ margin: 0, fontSize: '2rem', fontWeight: 700, color: '#102B2D', fontFamily: 'Outfit, sans-serif' }}>
            Prescriptions
          </h1>
          <p style={{ color: '#2D9D9C', fontSize: '0.92rem', margin: '3px 0 0' }}>
            Verified medical prescriptions issued by your assigned LifeLink specialists.
          </p>
        </div>
      </header>

      {/* Empty state when patient has no prescriptions */}
      {prescriptions.length === 0 ? (
        <Card style={{ textAlign: 'center', padding: '56px 24px', background: '#E6F9FC', border: '1px solid #9FFBFF', borderRadius: '16px' }}>
          <FileText size={44} color="#2D9D9C" style={{ margin: '0 auto 12px', opacity: 0.7 }} />
          <p style={{ margin: 0, fontSize: '1rem', color: '#2D9D9C', fontStyle: 'italic' }}>
            No prescriptions issued yet.
          </p>
        </Card>
      ) : (
        /* Prescriptions responsive card grid */
        <div className="responsive-list-grid">
          {prescriptions.map((prescription) => (
            <Card
              key={prescription.id}                                                             // React key
              variant="glass"                                                                   // Glassmorphic styling
              className="h-full flex-col justify-between"                                       // Layout classes
              onClick={() => setSelectedRxId(prescription.id)}                                  // Opens detail modal on click
              style={{
                background: '#E6F9FC',
                border: '1px solid #9FFBFF',
                borderRadius: '16px',
                padding: '22px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(0, 196, 204, 0.15)', display: 'grid', placeItems: 'center', color: '#00C4CC', flexShrink: 0 }}>
                      <FileText size={20} />
                    </div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#102B2D', fontFamily: 'Outfit, sans-serif' }}>
                        {prescription.doctor?.name || 'Assigned Specialist'}                    {/* Prescribing doctor */}
                      </h3>
                      <span style={{ fontSize: '0.82rem', color: '#2D9D9C' }}>
                        {new Date(prescription.issuedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    </div>
                  </div>
                  <Badge status="neutral">
                    <Lock size={10} style={{ marginRight: '3px' }} /> {prescription.status}     {/* Verification badge */}
                  </Badge>
                </div>

                <div
                  style={{
                    padding: '12px',
                    background: 'rgba(255, 255, 255, 0.65)',
                    borderRadius: '10px',
                    border: '1px solid #9FFBFF',
                    marginTop: '8px',
                  }}
                >
                  <span style={{ fontSize: '0.78rem', color: '#2D9D9C', fontWeight: 700, textTransform: 'uppercase' }}>
                    Prescribed Items:
                  </span>
                  <p style={{ margin: '4px 0 0', fontWeight: 600, fontSize: '0.9rem', color: '#102B2D' }}>
                    {prescription.items && prescription.items.length
                      ? prescription.items.map((item) => `${item.name} (${item.dosage})`).join(', ') // Joined list of drug names
                      : 'No items recorded'}
                  </p>
                </div>
              </div>

              {/* View details action trigger */}
              <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
                <Button
                  variant="primary"                                                             // Primary button style
                  size="sm"                                                                    // Compact size
                  onClick={(event) => {
                    event.stopPropagation();                                                    // Avoid bubbling to parent card
                    setSelectedRxId(prescription.id);                                           // Select this prescription for detail inspection
                  }}
                  style={{ borderRadius: '10px', background: '#00C4CC', borderColor: '#00C4CC', color: '#FFF', fontWeight: 700 }}
                  aria-label={`View details for prescription from ${prescription.doctor?.name || 'specialist'} on ${new Date(prescription.issuedAt).toLocaleDateString()}`}
                >
                  View Details
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
