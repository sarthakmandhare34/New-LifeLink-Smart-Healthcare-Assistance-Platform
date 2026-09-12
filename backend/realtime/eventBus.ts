import { EventEmitter } from "node:events";                                            // Node built-in event dispatcher for in-memory pub/sub

// Supported event types triggered for patient accounts
export const PATIENT_EVENT_TYPES = [
  "PROFILE_UPDATED",                                                                       // Fired when patient profile or emergency contact details change
  "APPOINTMENT_UPDATED",                                                                   // Fired when an appointment status is confirmed or rescheduled
  "PRESCRIPTION_CREATED",                                                                  // Fired when a doctor issues a new digital prescription
  "ASSESSMENT_COMPLETED",                                                                  // Fired when AI triage finishes analyzing patient symptoms
  "MEDICINE_UPDATED",                                                                      // Fired when medicines are added, marked taken, or refilled
] as const;

export type PatientEventType = (typeof PATIENT_EVENT_TYPES)[number];                      // Union type of all patient event strings

// Supported event types triggered for doctor dashboards
export const DOCTOR_EVENT_TYPES = ["APPOINTMENT_UPDATED", "ASSESSMENT_COMPLETED", "PATIENT_RELATED_UPDATE"] as const;
export type DoctorEventType = (typeof DOCTOR_EVENT_TYPES)[number];                        // Union type of all doctor event strings

// Data shape for patient real-time notifications
export type RealtimePatientEvent = {
  id: number;                                                                              // Sequence ID from patient_events table in MySQL
  userId: number;                                                                          // Primary recipient patient user ID
  type: PatientEventType;                                                                  // Categorical event identifier
  entityId: string | null;                                                                 // Target entity reference (appointment ID, prescription ID, etc.)
  createdAt: Date;                                                                         // Timestamp when event occurred
};

// Data shape for doctor real-time notifications
export type RealtimeDoctorEvent = {
  id: number;                                                                              // Sequence ID from doctor_events table in MySQL
  doctorId: string;                                                                        // Target clinician identifier (e.g. mock-central-cardiology-csmt)
  patientUserId: number;                                                                   // Related patient who booked or updated
  type: DoctorEventType;                                                                   // Type of clinician update
  entityId: string | null;                                                                 // Associated entity ID
  createdAt: Date;                                                                         // Event creation timestamp
};

// In-process event emitter distributing events to active SSE client connections
const patientEventBus = new EventEmitter();
patientEventBus.setMaxListeners(0);                                                        // Unlimited listeners to support concurrent browser tabs

// Generates unique pub/sub channel name for a patient
function eventChannel(userId: number) {
  return `patient:${userId}`;                                                              // e.g. "patient:42"
}

// Generates unique pub/sub channel name for a doctor
function doctorEventChannel(doctorId: string) {
  return `doctor:${doctorId}`;                                                             // e.g. "doctor:mock-central-cardiology-csmt"
}

// Emits an event to all open browser connections belonging to this patient
export function publishPatientEvent(event: RealtimePatientEvent) {
  const channel = eventChannel(event.userId);                                              // Locate patient channel
  const listeners = patientEventBus.listeners(channel);                                    // Find active SSE connections
  for (const listener of listeners) {
    try {
      (listener as (e: RealtimePatientEvent) => void)(event);                              // Push event to connection
    } catch (err) {
      console.error("[Realtime] Patient listener failed", err);
    }
  }
}

// Subscribes an SSE connection to a patient's channel; returns unsubscribe cleanup callback
export function subscribeToPatientEvents(userId: number, listener: (event: RealtimePatientEvent) => void) {
  const channel = eventChannel(userId);                                                    // Form channel name
  patientEventBus.on(channel, listener);                                                   // Register event listener
  return () => patientEventBus.off(channel, listener);                                     // Unsubscribe cleanup closure
}

// Emits an event to all active doctor dashboard connections for a clinician
export function publishDoctorEvent(event: RealtimeDoctorEvent) {
  const channel = doctorEventChannel(event.doctorId);                                      // Locate doctor channel
  const listeners = patientEventBus.listeners(channel);                                    // Find active clinician SSE connections
  for (const listener of listeners) {
    try {
      (listener as (e: RealtimeDoctorEvent) => void)(event);                               // Push event to clinician
    } catch (err) {
      console.error("[Realtime] Doctor listener failed", err);
    }
  }
}

// Subscribes a clinician's dashboard SSE stream; returns unsubscribe cleanup callback
export function subscribeToDoctorEvents(doctorId: string, listener: (event: RealtimeDoctorEvent) => void) {
  const channel = doctorEventChannel(doctorId);                                            // Form doctor channel name
  patientEventBus.on(channel, listener);                                                   // Register listener
  return () => patientEventBus.off(channel, listener);                                     // Return unsubscribe callback
}
