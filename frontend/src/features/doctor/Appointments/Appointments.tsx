import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "../../../components/ui/Card";
import { Button } from "../../../components/ui/Button";
import { CheckCircle2, Clock, XCircle, CheckCheck } from "lucide-react";
import { trpc } from "../../../lib/trpc";

export const DoctorAppointments = () => {
  const navigate = useNavigate();
  const utils = trpc.useUtils();
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const appointments = trpc.doctorWorkspace.appointments.list.useQuery();
  const updateStatus = trpc.doctorWorkspace.appointments.updateStatus.useMutation({
    onSuccess: async (data, variables) => {
      if (variables.status === "Confirmed") {
        setFeedbackMessage("Appointment accepted and confirmed. Patient has been notified.");
      } else if (variables.status === "Completed") {
        setFeedbackMessage("Appointment marked as Completed! Consultation finished successfully.");
      } else if (variables.status === "Cancelled") {
        setFeedbackMessage("Appointment has been cancelled/declined.");
      }
      await Promise.all([
        utils.doctorWorkspace.appointments.list.invalidate(),
        utils.doctorWorkspace.dashboard.invalidate(),
        utils.doctorWorkspace.patients.invalidate(),
      ]);
    },
  });

  if (appointments.isLoading) return <p>Loading assigned appointments…</p>;
  if (appointments.isError) return <p role="alert">Unable to load assigned appointments. Please try again.</p>;

  const getBorderColor = (status: string) => {
    switch (status) {
      case "Completed": return "4px solid #10b981";
      case "Confirmed": return "4px solid var(--color-primary)";
      case "Cancelled": return "4px solid var(--color-danger, #ef4444)";
      default: return "4px solid #f59e0b";
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Completed":
        return <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "#ecfdf5", color: "#065f46", padding: "3px 10px", borderRadius: 12, fontSize: 13, fontWeight: 600 }}><CheckCheck size={14} /> Completed</span>;
      case "Confirmed":
        return <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "#eff6ff", color: "#1e40af", padding: "3px 10px", borderRadius: 12, fontSize: 13, fontWeight: 600 }}><CheckCircle2 size={14} /> Confirmed (Active)</span>;
      case "Cancelled":
        return <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "#fef2f2", color: "#991b1b", padding: "3px 10px", borderRadius: 12, fontSize: 13, fontWeight: 600 }}><XCircle size={14} /> Cancelled</span>;
      default:
        return <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "#fffbeb", color: "#92400e", padding: "3px 10px", borderRadius: 12, fontSize: 13, fontWeight: 600 }}><Clock size={14} /> {status}</span>;
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--spacing-4)" }}>
      <header>
        <h1>Appointments</h1>
        <p className="caption">
          Manage patient appointment requests, confirm consultations, and mark finished consultations as Completed.
        </p>
      </header>

      {feedbackMessage && (
        <div style={{ background: "#ecfdf5", border: "1px solid #10b981", color: "#065f46", padding: "var(--spacing-3)", borderRadius: "var(--border-radius-md)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span><strong>Status updated:</strong> {feedbackMessage}</span>
          <button type="button" aria-label="Dismiss status notification" onClick={() => setFeedbackMessage(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#065f46", fontWeight: "bold", fontSize: "1.2rem", padding: "4px 8px" }}>×</button>
        </div>
      )}

      {!appointments.data?.length ? (
        <Card style={{ textAlign: "center", padding: "var(--spacing-6) var(--spacing-4)" }}>
          <p>No assigned appointments yet.</p>
        </Card>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--spacing-3)" }}>
          {appointments.data.map((appointment) => {
            const isPending = appointment.status === "Requested" || appointment.status === "Pending";
            const isConfirmed = appointment.status === "Confirmed";
            const isCompleted = appointment.status === "Completed";

            return (
              <Card
                key={appointment.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: "var(--spacing-3)",
                  alignItems: "center",
                  flexWrap: "wrap",
                  borderLeft: getBorderColor(appointment.status),
                }}
              >
                <div style={{ flex: "1 1 min(100%, 360px)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "var(--spacing-2)", marginBottom: "4px" }}>
                    <h3 style={{ margin: 0 }}>{appointment.patient.name}</h3>
                    {getStatusBadge(appointment.status)}
                  </div>
                  <p className="caption" style={{ margin: "var(--spacing-1) 0" }}>
                    Scheduled: {new Date(appointment.scheduledAt).toLocaleString()}
                  </p>
                  <p style={{ margin: "var(--spacing-2) 0" }}>
                    <strong>Booking reason:</strong> {appointment.reason}
                  </p>
                </div>

                <div style={{ display: "flex", gap: "var(--spacing-2)", flexWrap: "wrap" }}>
                  <Button variant="secondary" onClick={() => navigate(`/doctor/patients/${appointment.patient.id}`)}>
                    Review patient
                  </Button>

                  {isPending && (
                    <>
                      <Button
                        variant="primary"
                        disabled={updateStatus.isPending}
                        onClick={() => updateStatus.mutate({ id: appointment.id, status: "Confirmed" })}
                      >
                        Accept
                      </Button>
                      <Button
                        variant="secondary"
                        disabled={updateStatus.isPending}
                        onClick={() => updateStatus.mutate({ id: appointment.id, status: "Cancelled" })}
                      >
                        Decline
                      </Button>
                    </>
                  )}

                  {isConfirmed && (
                    <>
                      <Button
                        variant="primary"
                        style={{ background: "#10b981", borderColor: "#10b981" }}
                        disabled={updateStatus.isPending}
                        onClick={() => updateStatus.mutate({ id: appointment.id, status: "Completed" })}
                      >
                        ✓ Mark as Completed
                      </Button>
                      <Button
                        variant="secondary"
                        disabled={updateStatus.isPending}
                        onClick={() => updateStatus.mutate({ id: appointment.id, status: "Cancelled" })}
                      >
                        Cancel
                      </Button>
                    </>
                  )}

                  {isCompleted && (
                    <span className="caption" style={{ color: "#065f46", fontWeight: 600, alignSelf: "center" }}>
                      Consultation Complete
                    </span>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {updateStatus.isError && (
        <p role="alert" style={{ color: "var(--color-danger)" }}>
          {updateStatus.error.message || "That appointment could not be updated."}
        </p>
      )}
    </div>
  );
};
