export type Role = 'patient' | 'doctor';

export interface User {
  id: string;
  role: Role;
  name: string;
  email: string;
  avatarUrl?: string;
}

export interface EmergencyContact {
  id: string;
  name: string;
  relationship: string;
  phone: string;
}

export interface Patient extends User {
  role: 'patient';
  bloodGroup: string;
  allergies: string[];
  conditions: string[];
  emergencyContacts: EmergencyContact[];
  settings?: {
    aptReminders: boolean;
    medAlerts: boolean;
  };
}

export interface Doctor extends User {
  role: 'doctor';
  specialty: string;
  hospital: string;
  location: string;
  isVerified: boolean;
}

export type AppointmentStatus = 'Requested' | 'Pending' | 'Confirmed' | 'Completed' | 'Cancelled';

export interface Appointment {
  id: string;
  patientId: string;
  doctorId: string;
  date: string; // ISO string
  time: string; // e.g. "10:00 AM"
  status: AppointmentStatus;
}

export interface Medicine {
  id: string;
  patientId: string;
  name: string;
  dosage: string;
  frequency: string;
  schedule: string;
  startDate: string;
  endDate: string;
  quantity: number;
  expiry: string; // ISO string
  lowStock: boolean;
}

export interface Prescription {
  id: string;
  patientId: string;
  doctorId: string;
  date: string;
  status: 'UNSIGNED / CONTROLLED WORKSPACE' | 'SIGNED — CONTROLLED STATE';
  medicines: { name: string; dosage: string; instructions: string }[];
  clinicalNotes: string;
  integrityReference: string;
}

export interface Assessment {
  id: string;
  patientId: string;
  date: string;
  symptoms: string;
  age: number;
  gender: string;
  conditions: string;
  duration: string;
  urgency: 'LOW' | 'MODERATE' | 'EMERGENCY' | 'ERROR';
  reason: string;
  specialty: string;
  guidance: string;
}
