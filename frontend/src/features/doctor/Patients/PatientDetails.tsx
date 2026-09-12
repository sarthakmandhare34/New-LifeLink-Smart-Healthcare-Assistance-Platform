import { useState } from "react";                                                             // React hook for form tracking
import { useParams } from "react-router-dom";                                                   // Extracts URL parameters (patientId)
import { Card } from "../../../components/ui/Card";                                             // Visual card container
import { Button } from "../../../components/ui/Button";                                         // Styled button
import { Input } from "../../../components/ui/Input";                                           // Styled input
import { Activity, CalendarCheck, FileText, Lock, Pill, Trash2 } from "lucide-react";           // Clinical records iconography
import { trpc } from "../../../lib/trpc";                                                       // Type-safe tRPC client bridge

// Formats array of strings into comma-separated text or fallback
const listOrNotRecorded = (items: string[]) => items.length ? items.join(", ") : "Not recorded"; // Format helper
type PrescriptionItem = { name: string; dosage: string; instructions: string };                 // Prescription item data shape

// =========================================================================================
// DOCTOR CLINICAL PATIENT RECORD INSPECTOR & PRESCRIPTION WRITER
// Provides appointment-authorized deep inspection of an individual patient's medical baseline:
// - Health passport summary (Blood Group, Allergies, Chronic Conditions)
// - Historical AI triage assessment summaries
// - Active medicine cabinet regimens
// - Prescription authoring suite (creates digitally verified prescriptions)
// =========================================================================================
export const PatientView = () => {
  const { patientId } = useParams();                                                            // Retrieve patient ID from URL
  const parsedPatientId = Number(patientId);                                                    // Parse as number
  const utils = trpc.useUtils();                                                                // Client cache manager
  const [clinicalNotes, setClinicalNotes] = useState("");                                       // Clinician diagnostic notes state
  const [items, setItems] = useState<PrescriptionItem[]>([{ name: "", dosage: "", instructions: "" }]); // Medicine item list state
  const [prescriptionMessage, setPrescriptionMessage] = useState("");                           // User status feedback message

  // Query patient detail with relationship authorization check on backend
  const detail = trpc.doctorWorkspace.patientDetail.useQuery(
    { patientId: parsedPatientId },
    { enabled: Number.isInteger(parsedPatientId) && parsedPatientId > 0 }
  );

  // Mutation to persist a new digital prescription
  const createPrescription = trpc.doctorWorkspace.prescriptions.create.useMutation({
    onSuccess: async () => {
      setPrescriptionMessage("Prescription created for this assigned patient.");                // Feedback banner
      setClinicalNotes("");                                                                     // Clear notes
      setItems([{ name: "", dosage: "", instructions: "" }]);                                   // Reset medicine item inputs
      await utils.doctorWorkspace.patientDetail.invalidate({ patientId: parsedPatientId });      // Invalidate patient cache
    },
    onError: (error) => setPrescriptionMessage(error.message),                                  // Error message
  });

  // Mutation to update appointment status (e.g. Accept or Complete)
  const updateStatus = trpc.doctorWorkspace.appointments.updateStatus.useMutation({
    onSuccess: async () => {
      setPrescriptionMessage("Appointment updated successfully.");
      await Promise.all([
        utils.doctorWorkspace.patientDetail.invalidate({ patientId: parsedPatientId }),         // Refresh patient record
        utils.doctorWorkspace.appointments.list.invalidate(),                                   // Refresh appointment list
        utils.doctorWorkspace.dashboard.invalidate(),                                           // Refresh doctor dashboard counters
      ]);
    },
    onError: (error) => setPrescriptionMessage(error.message),
  });

  // Validation guards
  if (!Number.isInteger(parsedPatientId) || parsedPatientId <= 0) return <p role="alert">Invalid patient record request.</p>;
  if (detail.isLoading) return <p>Verifying the appointment relationship and loading the authorized patient summary…</p>;
  if (detail.isError || !detail.data) return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--spacing-4)" }}>
      <header><h1>Patient Record</h1></header>
      <Card style={{ textAlign: "center", padding: "var(--spacing-6) var(--spacing-4)" }}>
        <Lock size={40} color="var(--color-text-muted)" />
        <h2>Not authorized</h2>
        <p>This patient is not linked to an appointment assigned to the signed synthetic doctor.</p>
      </Card>
    </div>
  );

  const { patient, appointments, medicines, assessments } = detail.data;                         // Destructure authorized payload
  const hasActiveOrCompleted = appointments.some((appointment) => appointment.status === "Confirmed" || appointment.status === "Completed"); // Eligible to prescribe check

  // Prescribed items form managers
  const updateItem = (index: number, field: keyof PrescriptionItem, value: string) =>
    setItems((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, [field]: value } : item));
  const removeItem = (index: number) =>
    setItems((current) => current.filter((_, itemIndex) => itemIndex !== index));

  // Submit prescription handler
  const submitPrescription = (event: React.FormEvent) => {
    event.preventDefault();                                                                     // Prevent refresh
    setPrescriptionMessage("");                                                                 // Clear past message
    createPrescription.mutate({
      patientId: parsedPatientId,                                                               // Target patient ID
      clinicalNotes: clinicalNotes.trim() || undefined,                                         // Optional clinical notes
      items: items.map((item) => ({ name: item.name.trim(), dosage: item.dosage.trim(), instructions: item.instructions.trim() })) // Item array
    });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--spacing-4)" }}>
      {/* Header */}
      <header>
        <h1>Patient Record</h1>
        <p className="caption">{patient.name} · Appointment-authorized summary</p>
      </header>

      {/* Health Passport summary */}
      <Card>
        <h2>Health Passport summary</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 170px), 1fr))", gap: "var(--spacing-3)", marginTop: "var(--spacing-3)" }}>
          <div>
            <p className="caption">Blood group</p>
            <strong>{patient.bloodGroup}</strong>                                               {/* Patient blood group */}
          </div>
          <div>
            <p className="caption">Allergies</p>
            <strong>{listOrNotRecorded(patient.allergies)}</strong>                             {/* Allergies */}
          </div>
          <div>
            <p className="caption">Conditions</p>
            <strong>{listOrNotRecorded(patient.conditions)}</strong>                            {/* Chronic conditions */}
          </div>
        </div>
        <p className="caption" style={{ marginTop: "var(--spacing-4)" }}>Email, phone, emergency contacts, and unrelated patient records are intentionally not exposed to this doctor workspace.</p>
      </Card>

      {/* Booking Context */}
      <Card>
        <h2 style={{ display: "flex", alignItems: "center", gap: "var(--spacing-2)" }}>
          <CalendarCheck size={20} /> Booking context
        </h2>
        <div style={{ display: "grid", gap: "var(--spacing-2)", marginTop: "var(--spacing-3)" }}>
          {appointments.map((appointment) => (
            <div key={appointment.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "var(--spacing-2)", padding: "var(--spacing-2)", border: "1px solid var(--color-border)", borderRadius: "var(--border-radius-sm)" }}>
              <div>
                <strong>{new Date(appointment.scheduledAt).toLocaleString()} · {appointment.status}</strong>
                <p className="caption" style={{ margin: "4px 0 0" }}>Reason: {appointment.reason || "No booking reason was recorded."}</p>
              </div>
              {appointment.status === "Requested" || appointment.status === "Pending" ? (
                <Button size="sm" variant="primary" disabled={updateStatus.isPending} aria-label={`Accept appointment on ${new Date(appointment.scheduledAt).toLocaleDateString()}`} onClick={() => updateStatus.mutate({ id: appointment.id, status: "Confirmed" })}>
                  Accept Appointment
                </Button>
              ) : appointment.status === "Confirmed" ? (
                <Button size="sm" variant="primary" style={{ background: "#10b981", borderColor: "#10b981" }} disabled={updateStatus.isPending} aria-label={`Mark appointment on ${new Date(appointment.scheduledAt).toLocaleDateString()} completed`} onClick={() => updateStatus.mutate({ id: appointment.id, status: "Completed" })}>
                  ✓ Mark Completed
                </Button>
              ) : null}
            </div>
          ))}
        </div>
      </Card>

      {/* Submitted Assessment Summaries */}
      <Card>
        <h2 style={{ display: "flex", alignItems: "center", gap: "var(--spacing-2)" }}>
          <Activity size={20} /> Submitted assessment summaries
        </h2>
        {assessments.length ? (
          <div style={{ display: "grid", gap: "var(--spacing-3)", marginTop: "var(--spacing-3)" }}>
            {assessments.map((assessment) => (
              <div key={assessment.id} style={{ padding: "var(--spacing-3)", border: "1px solid var(--color-border)", borderRadius: "var(--border-radius-sm)" }}>
                <strong>{assessment.specialty} · {assessment.urgency}</strong>
                <p style={{ margin: "var(--spacing-2) 0 0" }}><b>Symptoms:</b> {assessment.symptoms}</p>
                <p className="caption" style={{ margin: "4px 0 0" }}>Duration: {assessment.duration} · Patient context: {assessment.reason}</p>
                <p className="caption" style={{ margin: "4px 0 0" }}>Automated guidance: {assessment.guidance}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="caption">No patient-submitted assessments are available for this assigned record.</p>
        )}
      </Card>

      {/* Patient Medicines */}
      <Card>
        <h2 style={{ display: "flex", alignItems: "center", gap: "var(--spacing-2)" }}>
          <Pill size={20} /> Medicines
        </h2>
        {medicines.length ? (
          <div style={{ display: "grid", gap: "var(--spacing-2)", marginTop: "var(--spacing-3)" }}>
            {medicines.map((medicine) => (
              <div key={medicine.id} style={{ padding: "var(--spacing-2)", border: "1px solid var(--color-border)", borderRadius: "var(--border-radius-sm)" }}>
                <strong>{medicine.name}</strong>
                <p className="caption" style={{ margin: "4px 0 0" }}>{medicine.dosage} · {medicine.frequency} · {medicine.schedule}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="caption">No medicines have been recorded by this patient.</p>
        )}
      </Card>

      {/* Create Prescription Suite */}
      <Card>
        <h2 style={{ display: "flex", alignItems: "center", gap: "var(--spacing-2)" }}>
          <FileText size={20} /> Create prescription
        </h2>
        {hasActiveOrCompleted ? (
          <form onSubmit={submitPrescription} style={{ display: "grid", gap: "var(--spacing-3)", marginTop: "var(--spacing-3)" }}>
            <label className="auth-field">
              <span>Clinical notes (optional)</span>
              <textarea value={clinicalNotes} onChange={(event) => setClinicalNotes(event.target.value)} maxLength={4000} rows={3} style={{ width: "100%", resize: "vertical" }} />
            </label>
            {items.map((item, index) => (
              <div key={index} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 140px), 1fr)) auto", gap: "var(--spacing-2)", alignItems: "center", padding: "var(--spacing-2)", border: "1px solid var(--color-border)", borderRadius: "var(--border-radius-sm)" }}>
                <Input placeholder="Medicine name" aria-label={`Medicine name ${index + 1}`} value={item.name} onChange={(event) => updateItem(index, "name", event.target.value)} required />
                <Input placeholder="Dosage" aria-label={`Dosage ${index + 1}`} value={item.dosage} onChange={(event) => updateItem(index, "dosage", event.target.value)} required />
                <Input placeholder="Instructions" aria-label={`Instructions ${index + 1}`} value={item.instructions} onChange={(event) => updateItem(index, "instructions", event.target.value)} required />
                {items.length > 1 ? (
                  <Button type="button" variant="outline" size="sm" onClick={() => removeItem(index)} aria-label={`Remove item ${index + 1}`} style={{ borderColor: "var(--color-semantic-emergency)", color: "var(--color-semantic-emergency)", height: "38px", padding: "0 8px" }}>
                    <Trash2 size={14} />
                  </Button>
                ) : null}
              </div>
            ))}
            <div style={{ display: "flex", gap: "var(--spacing-2)", flexWrap: "wrap" }}>
              <Button type="button" variant="secondary" onClick={() => setItems((current) => [...current, { name: "", dosage: "", instructions: "" }])}>
                Add medicine
              </Button>
              <Button type="submit" variant="primary" disabled={createPrescription.isPending}>
                {createPrescription.isPending ? "Creating…" : "Create prescription"}
              </Button>
            </div>
            {prescriptionMessage ? <p role="status" className="caption">{prescriptionMessage}</p> : null}
            <p className="caption">This creates an unsigned clinician-workspace prescription for the assigned patient. It is not a real signed medical order.</p>
          </form>
        ) : (
          <p className="caption">Accept the assigned appointment before creating a prescription for this patient.</p>
        )}
      </Card>
    </div>
  );
};
