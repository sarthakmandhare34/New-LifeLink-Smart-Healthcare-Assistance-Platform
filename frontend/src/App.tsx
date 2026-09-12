/**
 * Liquid-glass design note: both patient and doctor flows use the same pearlescent
 * surface system, with page-specific content kept intact inside shared shells.
 */
import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import { DoctorAppShell } from './components/layout/DoctorAppShell';
import { PatientDashboard } from './features/patient/Dashboard';
import { HealthPassport } from './features/patient/HealthPassport/HealthPassport';
import { MedicineCabinet } from './features/patient/Medicines/MedicineCabinet';
import { PatientLogin } from './features/entry/Login';
import { PatientRegistration } from './features/entry/Register';
import { AIAssessment } from './features/patient/Assessment/AIAssessment';
import { SpecialistFinder } from './features/patient/Specialists/SpecialistFinder';
import { Appointments } from './features/patient/Appointments/Appointments';
import { Prescriptions } from './features/patient/Prescriptions/Prescriptions';
import { Emergency } from './features/patient/Emergency/Emergency';
import { Profile } from './features/patient/Profile/Profile';
import { Settings } from './features/patient/Settings/Settings';
import { DoctorLogin } from './features/doctor/Login';
import { DoctorResetPassword } from './features/doctor/ResetPassword';
import { DoctorDashboard } from './features/doctor/Dashboard';
import { Patients } from './features/doctor/Patients/Patients';
import { DoctorAppointments } from './features/doctor/Appointments/Appointments';
import { Consultation } from './features/doctor/Consultations/Consultation';
import { DoctorPrescriptions } from './features/doctor/Prescriptions/Prescriptions';
import { Assessments } from './features/doctor/Assessments/Assessments';
import { DoctorProfile } from './features/doctor/Profile/Profile';
import { DoctorSettings } from './features/doctor/Settings/Settings';
import { PatientView } from './features/doctor/Patients/PatientDetails';
import { WorkspaceSelector } from './features/entry/WorkspaceSelector';

/**
 * Main Application Router Component
 * 
 * This component defines the entire routing structure for the LifeLink platform.
 * It separates the application into three main areas:
 * 1. Entry / Public Routes (Login, Registration, Workspace Selection)
 * 2. Patient Portal (/patient/*) - Protected routes wrapped in AppShell
 * 3. Doctor Portal (/doctor/*) - Protected routes wrapped in DoctorAppShell
 * 
 * Each portal uses a nested routing strategy where the "Shell" component handles
 * the shared UI (like sidebars and headers), and the child components render
 * specific features (like Dashboards, Appointments, etc.).
 */
function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Entry Routes */}
        <Route path="/" element={<WorkspaceSelector />} />
        <Route path="/login" element={<PatientLogin />} />
        <Route path="/register" element={<PatientRegistration />} />
        <Route path="/doctor/login" element={<DoctorLogin />} />
        <Route path="/doctor/reset" element={<DoctorResetPassword />} />

        {/* Patient Portal Routes - Uses AppShell for layout */}
        <Route path="/patient" element={<AppShell />}>
          <Route path="dashboard" element={<PatientDashboard />} />
          <Route path="health-passport" element={<HealthPassport />} />
          <Route path="assessment" element={<AIAssessment />} />
          <Route path="specialists" element={<SpecialistFinder />} />
          <Route path="appointments" element={<Appointments />} />
          <Route path="medicines" element={<MedicineCabinet />} />
          <Route path="prescriptions" element={<Prescriptions />} />
          <Route path="emergency" element={<Emergency />} />
          <Route path="profile" element={<Profile />} />
          <Route path="settings" element={<Settings />} />
          {/* Default redirect for /patient */}
          <Route index element={<Navigate to="dashboard" replace />} />
        </Route>

        {/* Doctor Portal Routes - Uses DoctorAppShell for layout */}
        <Route path="/doctor" element={<DoctorAppShell />}>
          <Route path="dashboard" element={<DoctorDashboard />} />
          <Route path="patients" element={<Patients />} />
          <Route path="patients/:patientId" element={<PatientView />} />
          <Route path="appointments" element={<DoctorAppointments />} />
          <Route path="consultation" element={<Consultation />} />
          <Route path="prescriptions" element={<DoctorPrescriptions />} />
          <Route path="prescriptions/create" element={<DoctorPrescriptions />} />
          <Route path="assessments" element={<Assessments />} />
          <Route path="profile" element={<DoctorProfile />} />
          <Route path="settings" element={<DoctorSettings />} />
          {/* Default redirect for /doctor */}
          <Route index element={<Navigate to="dashboard" replace />} />
        </Route>

        {/* Fallback route for unknown paths */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
