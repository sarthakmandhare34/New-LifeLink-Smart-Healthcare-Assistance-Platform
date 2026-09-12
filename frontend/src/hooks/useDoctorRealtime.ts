import { useEffect } from "react";                                                            // React effect hook for SSE lifecycle
import { trpc } from "../lib/trpc";                                                             // Type-safe tRPC client bridge

// Notification message shape sent from backend SSE stream
type DoctorRealtimePayload = {
  id: number;                                                                                   // Event sequence ID
  type: "APPOINTMENT_UPDATED" | "ASSESSMENT_COMPLETED" | "PATIENT_RELATED_UPDATE";              // Clinician event domain
  entityId: string | null;                                                                      // Associated appointment/patient ID
  createdAt: string;                                                                            // Event timestamp
};

// =========================================================================================
// REAL-TIME SERVER-SENT EVENTS (SSE) HOOK FOR DOCTOR WORKSPACE
// Subscribes to `/api/doctor-events` to receive real-time push notifications whenever
// a patient books an appointment, submits a new assessment, or modifies their baseline.
// When an event arrives, automatically invalidates client cache to update UI instantly without full page reloads.
// =========================================================================================
export function useDoctorRealtime(enabled: boolean) {
  const utils = trpc.useUtils();                                                                // tRPC cache manager

  useEffect(() => {
    // Guard against running in non-browser environments or when disabled
    if (!enabled || typeof window === "undefined" || !("EventSource" in window)) return;
    
    const source = new EventSource("/api/doctor-events");                                       // Connect to SSE stream
    
    // Event listener for push notifications
    const onDoctorEvent = (message: Event) => {
      try {
        const payload = JSON.parse((message as MessageEvent<string>).data) as DoctorRealtimePayload; // Parse SSE JSON payload
        if (payload.type === "APPOINTMENT_UPDATED" || payload.type === "ASSESSMENT_COMPLETED" || payload.type === "PATIENT_RELATED_UPDATE") {
          // Immediately invalidate relevant doctor workstation queries
          void utils.doctorWorkspace.dashboard.invalidate();                                    // Refresh dashboard summary
          void utils.doctorWorkspace.appointments.list.invalidate();                            // Refresh appointments table
          void utils.doctorWorkspace.patients.invalidate();                                     // Refresh patient roster
          void utils.doctorWorkspace.patientDetail.invalidate();                                // Refresh active patient view
        }
      } catch {
        // Ignore malformed notification-only events; EventSource reconnects automatically when needed.
      }
    };

    source.addEventListener("doctor-event", onDoctorEvent);                                     // Attach event listener
    
    // Cleanup on component unmount or session end
    return () => {
      source.removeEventListener("doctor-event", onDoctorEvent);                                // Remove listener
      source.close();                                                                           // Close HTTP stream connection
    };
  }, [enabled, utils]);
}
