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
    <BrowserRouter>                                                                        {/* HTML5 history pushState navigation container */}
      <Routes>                                                                             {/* Declarative client-side route matcher */}
        {/* Public Entry Routes */}
        <Route path="/" element={<WorkspaceSelector />} />                                  {/* Portal selector for patient vs clinician workspace */}
        <Route path="/login" element={<PatientLogin />} />                                  {/* Patient sign-in form */}
        <Route path="/register" element={<PatientRegistration />} />                        {/* Patient new account registration form */}
        <Route path="/doctor/login" element={<DoctorLogin />} />                            {/* Clinician credential authentication screen */}
        <Route path="/doctor/reset" element={<DoctorResetPassword />} />                    {/* Administrative clinician password reset */}

        {/* Patient Portal Routes - Uses AppShell for layout */}
        <Route path="/patient" element={<AppShell />}>                                      {/* Patient navigation shell with sidebar & header */}
          <Route path="dashboard" element={<PatientDashboard />} />                        {/* Patient home dashboard with live statistics */}
          <Route path="health-passport" element={<HealthPassport />} />                    {/* Emergency medical ID card & patient profile */}
          <Route path="assessment" element={<AIAssessment />} />                            {/* AI symptom triage & specialist recommendation */}
          <Route path="specialists" element={<SpecialistFinder />} />                      {/* Mumbai railway corridor specialist discovery */}
          <Route path="appointments" element={<Appointments />} />                          {/* Patient consultation booking & appointment management */}
          <Route path="medicines" element={<MedicineCabinet />} />                          {/* Medication tracking & dosage adherence */}
          <Route path="prescriptions" element={<Prescriptions />} />                        {/* Digital prescriptions issued by clinicians */}
          <Route path="emergency" element={<Emergency />} />                                {/* Quick-dial SOS emergency contacts & alerts */}
          <Route path="profile" element={<Profile />} />                                    {/* Personal account & avatar settings */}
          <Route path="settings" element={<Settings />} />                                  {/* Appearance & application preferences */}
          {/* Default redirect for /patient */}
          <Route index element={<Navigate to="dashboard" replace />} />                     {/* Redirect /patient to /patient/dashboard */}
        </Route>

        {/* Doctor Portal Routes - Uses DoctorAppShell for layout */}
        <Route path="/doctor" element={<DoctorAppShell />}>                                {/* Clinician workspace layout shell */}
          <Route path="dashboard" element={<DoctorDashboard />} />                          {/* Doctor clinic dashboard with patient queues */}
          <Route path="patients" element={<Patients />} />                                  {/* Assigned patient roster */}
          <Route path="patients/:patientId" element={<PatientView />} />                    {/* Full medical record for single patient */}
          <Route path="appointments" element={<DoctorAppointments />} />                    {/* Consultation scheduling & status updates */}
          <Route path="consultation" element={<Consultation />} />                          {/* Live clinical examination workspace */}
          <Route path="prescriptions" element={<DoctorPrescriptions />} />                  {/* Issued prescription archive */}
          <Route path="prescriptions/create" element={<DoctorPrescriptions />} />           {/* Digital prescription creator */}
          <Route path="assessments" element={<Assessments />} />                            {/* AI triage reports submitted by patients */}
          <Route path="profile" element={<DoctorProfile />} />                              {/* Clinician credentials & specialty information */}
          <Route path="settings" element={<DoctorSettings />} />                            {/* Clinician workspace preferences */}
          {/* Default redirect for /doctor */}
          <Route index element={<Navigate to="dashboard" replace />} />                     {/* Redirect /doctor to /doctor/dashboard */}
        </Route>

        {/* Fallback route for unknown paths */}
        <Route path="*" element={<Navigate to="/" replace />} />                            {/* Catch-all route redirecting back to home selector */}
      </Routes>
    </BrowserRouter>
  );
}

export default App;
