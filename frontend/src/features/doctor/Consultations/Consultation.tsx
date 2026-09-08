import { useNavigate } from "react-router-dom";
import { Card } from "../../../components/ui/Card";
import { Button } from "../../../components/ui/Button";
import { CheckCircle2, Clock, Stethoscope, User } from "lucide-react";
import { trpc } from "../../../lib/trpc";

export const Consultation = () => {
  const navigate = useNavigate();
  const appointments = trpc.doctorWorkspace.appointments.list.useQuery();

  if (appointments.isLoading) return <p>Loading assigned consultations…</p>;

  const activeConsultations = (appointments.data ?? []).filter(
    (a) => a.status === "Confirmed" || a.status === "Requested" || a.status === "Pending",
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--spacing-4)" }}>
      <header>
        <h1>Consultation Workspace</h1>
        <p className="caption">
          Authorized active consultations for your assigned clinical appointments.
        </p>
      </header>

      {activeConsultations.length === 0 ? (
        <Card style={{ textAlign: "center", padding: "var(--spacing-6) var(--spacing-4)" }}>
          <Stethoscope size={40} color="var(--color-primary)" />
          <h2>No active consultations</h2>
          <p>You have no active appointment requests or confirmed consultations awaiting review.</p>
          <Button variant="primary" onClick={() => navigate("/doctor/appointments")} style={{ marginTop: "var(--spacing-3)" }}>
            View All Appointments
          </Button>
        </Card>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--spacing-3)" }}>
          {activeConsultations.map((appointment) => (
            <Card
              key={appointment.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "var(--spacing-3)",
                borderLeft: appointment.status === "Confirmed" ? "4px solid var(--color-primary)" : "4px solid #f59e0b",
              }}
            >
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "var(--spacing-2)", marginBottom: "4px" }}>
                  <User size={18} color="var(--color-primary)" />
                  <h3 style={{ margin: 0 }}>{appointment.patient.name}</h3>
                  <span
                    style={{
                      background: appointment.status === "Confirmed" ? "#eff6ff" : "#fffbeb",
                      color: appointment.status === "Confirmed" ? "#1e40af" : "#92400e",
                      padding: "2px 8px",
                      borderRadius: 12,
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                  >
                    {appointment.status === "Confirmed" ? "Confirmed (Ready)" : "Requested"}
                  </span>
                </div>
                <p className="caption" style={{ margin: "var(--spacing-1) 0" }}>
                  Scheduled: {new Date(appointment.scheduledAt).toLocaleString()}
                </p>
                <p style={{ margin: "var(--spacing-1) 0", fontSize: 14 }}>
                  <strong>Reason:</strong> {appointment.reason}
                </p>
              </div>

              <div style={{ display: "flex", gap: "var(--spacing-2)" }}>
                <Button variant="primary" onClick={() => navigate(`/doctor/patients/${appointment.patient.id}`)}>
                  Open Clinical Record & Prescribe
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
