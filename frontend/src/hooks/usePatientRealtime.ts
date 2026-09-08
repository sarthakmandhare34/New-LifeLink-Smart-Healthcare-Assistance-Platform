import { useEffect } from "react";
import { trpc } from "../lib/trpc";

type PatientRealtimePayload = {
  id: number;
  type: "PROFILE_UPDATED" | "APPOINTMENT_UPDATED" | "PRESCRIPTION_CREATED" | "ASSESSMENT_COMPLETED" | "MEDICINE_UPDATED";
  entityId: string | null;
  createdAt: string;
};

/** Opens one same-origin SSE stream per signed-in patient shell. The server derives ownership from the signed session. */
export function usePatientRealtime(enabled: boolean) {
  const utils = trpc.useUtils();

  useEffect(() => {
    if (!enabled || typeof window === "undefined" || !("EventSource" in window)) return;

    const source = new EventSource("/api/patient-events");
    const refreshForEvent = (type: PatientRealtimePayload["type"]) => {
      void utils.patientDashboard.summary.invalidate();
      switch (type) {
        case "PROFILE_UPDATED":
          void utils.patientProfile.get.invalidate();
          break;
        case "APPOINTMENT_UPDATED":
          void utils.patientAppointment.list.invalidate();
          break;
        case "PRESCRIPTION_CREATED":
          void utils.patientPrescription.list.invalidate();
          break;
        case "ASSESSMENT_COMPLETED":
          void utils.assessment.list.invalidate();
          break;
        case "MEDICINE_UPDATED":
          void utils.patientMedicine.list.invalidate();
          break;
      }
    };

    const onPatientEvent = (message: Event) => {
      try {
        const payload = JSON.parse((message as MessageEvent<string>).data) as PatientRealtimePayload;
        refreshForEvent(payload.type);
      } catch {
        // Ignore malformed stream messages; EventSource will reconnect if the transport closes.
      }
    };

    source.addEventListener("patient-event", onPatientEvent);
    return () => {
      source.removeEventListener("patient-event", onPatientEvent);
      source.close();
    };
  }, [enabled, utils]);
}
