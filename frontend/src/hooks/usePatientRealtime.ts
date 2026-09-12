import { useEffect } from "react";                                                            // React effect hook for SSE lifecycle
import { trpc } from "../lib/trpc";                                                             // Type-safe client tRPC bridge

// Real-time notification payload received by patient SSE listener
type PatientRealtimePayload = {
  id: number;                                                                                   // Event sequence ID
  type: "PROFILE_UPDATED" | "APPOINTMENT_UPDATED" | "PRESCRIPTION_CREATED" | "ASSESSMENT_COMPLETED" | "MEDICINE_UPDATED"; // Event type
  entityId: string | null;                                                                      // Associated primary key
  createdAt: string;                                                                            // Event timestamp
};

// =========================================================================================
// REAL-TIME SERVER-SENT EVENTS (SSE) HOOK FOR PATIENT PORTAL
// Establishes a persistent SSE stream to `/api/patient-events`.
// Whenever a doctor confirms an appointment, issues a new prescription, or updates medical records,
// this hook receives the event and intelligently invalidates exact cached queries so the patient
// sees the update in real-time without needing to manually refresh their browser.
// =========================================================================================
export function usePatientRealtime(enabled: boolean) {
  const utils = trpc.useUtils();                                                                // tRPC cache manager

  useEffect(() => {
    // Guard against SSR or disabled state
    if (!enabled || typeof window === "undefined" || !("EventSource" in window)) return;

    const source = new EventSource("/api/patient-events");                                      // Open same-origin SSE connection

    // Granular cache invalidation dispatcher matching received event domain
    const refreshForEvent = (type: PatientRealtimePayload["type"]) => {
      void utils.patientDashboard.summary.invalidate();                                         // Refresh aggregate dashboard
      switch (type) {
        case "PROFILE_UPDATED":
          void utils.patientProfile.get.invalidate();                                           // Refresh profile
          break;
        case "APPOINTMENT_UPDATED":
          void utils.patientAppointment.list.invalidate();                                      // Refresh appointments
          break;
        case "PRESCRIPTION_CREATED":
          void utils.patientPrescription.list.invalidate();                                     // Refresh prescriptions
          break;
        case "ASSESSMENT_COMPLETED":
          void utils.assessment.list.invalidate();                                              // Refresh assessments
          break;
        case "MEDICINE_UPDATED":
          void utils.patientMedicine.list.invalidate();                                         // Refresh medicine cabinet
          break;
      }
    };

    // Message handler
    const onPatientEvent = (message: Event) => {
      try {
        const payload = JSON.parse((message as MessageEvent<string>).data) as PatientRealtimePayload; // Parse event payload
        refreshForEvent(payload.type);                                                          // Trigger cache updates
      } catch {
        // Ignore malformed stream messages; EventSource will automatically reconnect
      }
    };

    source.addEventListener("patient-event", onPatientEvent);                                   // Register listener

    // Teardown stream on unmount
    return () => {
      source.removeEventListener("patient-event", onPatientEvent);                              // Remove listener
      source.close();                                                                           // Close stream
    };
  }, [enabled, utils]);
}
