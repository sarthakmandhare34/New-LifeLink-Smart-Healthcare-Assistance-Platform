// =========================================================================================
// FRONTEND DOMAIN TYPE DEFINITIONS
// Canonical TypeScript models representing patients, doctors, appointments, prescriptions,
// medications, and AI assessments throughout the client application.
// =========================================================================================

export type Role = 'patient' | 'doctor';                                                        // Dual portal user authorization roles

export interface User {
  id: string;                                                                                  // Unique user ID
  role: Role;                                                                                   // Role type
  name: string;                                                                                 // Display name
  email: string;                                                                                // Email address
  avatarUrl?: string;                                                                           // Profile picture URL
}

export interface EmergencyContact {
  id: string;                                                                                  // Emergency contact identifier
  name: string;                                                                                 // Contact full name
  relationship: string;                                                                         // Relationship to patient
  phone: string;                                                                                // Phone number
}

export interface Patient extends User {
  role: 'patient';                                                                              // Locked role discriminant
  bloodGroup: string;                                                                           // ABO/Rh blood type
  allergies: string[];                                                                          // Known allergen sensitivities
  conditions: string[];                                                                         // Chronic medical conditions
  emergencyContacts: EmergencyContact[];                                                        // Trusted contact list
  settings?: {
    aptReminders: boolean;                                                                      // Appointment notification toggle
    medAlerts: boolean;                                                                         // Medicine inventory alert toggle
  };
}

export interface Doctor extends User {
  role: 'doctor';                                                                               // Locked role discriminant
  specialty: string;                                                                            // Medical triage specialty
  hospital: string;                                                                             // Clinical hospital or center
  location: string;                                                                             // Geographic locality
  isVerified: boolean;                                                                          // Verification status
}

export type AppointmentStatus = 'Requested' | 'Pending' | 'Confirmed' | 'Completed' | 'Cancelled'; // Appointment lifecycle states

export interface Appointment {
  id: string;                                                                                  // Appointment ID
  patientId: string;                                                                            // Patient ID
  doctorId: string;                                                                             // Doctor ID
  date: string;                                                                                 // ISO date string
  time: string;                                                                                 // Time string
  status: AppointmentStatus;                                                                    // Current status
}

export interface Medicine {
  id: string;                                                                                  // Medicine ID
  patientId: string;                                                                            // Owner patient ID
  name: string;                                                                                 // Drug name
  dosage: string;                                                                               // Strength
  frequency: string;                                                                            // Cadence
  schedule: string;                                                                             // Daily timing
  startDate: string;                                                                            // Start date
  endDate: string;                                                                              // End date
  quantity: number;                                                                             // Remaining count
  expiry: string;                                                                               // Expiry date
  lowStock: boolean;                                                                            // Low inventory flag
}

export interface Prescription {
  id: string;                                                                                  // Prescription ID
  patientId: string;                                                                            // Patient ID
  doctorId: string;                                                                             // Prescribing clinician ID
  date: string;                                                                                 // Date issued
  status: 'UNSIGNED / CONTROLLED WORKSPACE' | 'SIGNED — CONTROLLED STATE';                     // Verification status
  medicines: { name: string; dosage: string; instructions: string }[];                          // Drug items
  clinicalNotes: string;                                                                        // Notes
  integrityReference: string;                                                                   // Cryptographic SHA256 integrity hash
}

export interface Assessment {
  id: string;                                                                                  // Assessment ID
  patientId: string;                                                                            // Patient ID
  date: string;                                                                                 // Assessment timestamp
  symptoms: string;                                                                             // Reported symptoms
  age: number;                                                                                  // Age
  gender: string;                                                                               // Biological gender
  conditions: string;                                                                           // Pre-existing conditions
  duration: string;                                                                             // Symptom duration
  urgency: 'LOW' | 'MODERATE' | 'EMERGENCY' | 'ERROR';                                          // Triage urgency
  reason: string;                                                                               // Clinical reasoning
  specialty: string;                                                                            // Recommended specialty
  guidance: string;                                                                             // Triage advice
}
