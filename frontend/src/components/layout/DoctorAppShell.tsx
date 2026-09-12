import React, { useState, useEffect } from "react";                                         // Core React hooks
import { Navigate, NavLink, Outlet, useNavigate } from "react-router-dom";                     // Navigation routing primitives
import {
  Calendar, LayoutDashboard, FileText, Users, Activity,
  Settings as SettingsIcon, User, LogOut, Sun, Moon, Bell,
  ChevronDown, Menu, X, Stethoscope
} from "lucide-react";                                                                          // Clinician workspace icon set
import { LifeLinkLogo } from "../brand/LifeLinkLogo";                                           // Official brand logo component
import { trpc } from "../../lib/trpc";                                                          // Type-safe tRPC client bridge
import { useDoctorRealtime } from "../../hooks/useDoctorRealtime";                              // Real-time doctor SSE subscription hook
import { useTheme } from "../../context/ThemeContext";                                          // Application theme manager
import { registerPatientInactivityTimer } from "../../hooks/patientInactivity";                  // Auto-logout security timer hook
import { toast } from "sonner";                                                                 // User feedback toast notifications

// Doctor portal navigation items
const navItems = [
  { path: "/doctor/dashboard", label: "Dashboard", icon: LayoutDashboard },                    // Clinical dashboard
  { path: "/doctor/appointments", label: "Appointments", icon: Calendar },                      // Visit schedule management
  { path: "/doctor/patients", label: "Patients", icon: Users },                                 // Authorized patient roster
  { path: "/doctor/assessments", label: "Assessments", icon: Activity },                        // Patient AI assessment context
  { path: "/doctor/consultation", label: "Consultation", icon: Stethoscope },                    // Active consultation manager
  { path: "/doctor/prescriptions", label: "Prescriptions", icon: FileText },                   // Digital prescriptions suite
  { path: "/doctor/profile", label: "Profile", icon: User },                                     // Clinician details
  { path: "/doctor/settings", label: "Settings", icon: SettingsIcon },                           // Password & account settings
];

// =========================================================================================
// DOCTOR CLINICIAN APPLICATION SHELL (DoctorAppShell)
// Provides the dedicated workstation frame for medical specialists:
// - Navigation sidebar configured with clinician tools and brand identity
// - Header with theme toggling and doctor profile menu
// - 5-minute inactivity session expiration protection
// - Server-Sent Events (SSE) listener updating appointments and assessments in real time
// =========================================================================================
export const DoctorAppShell = () => {
  const navigate = useNavigate();                                                               // Router navigation hook
  const utils = trpc.useUtils();                                                                // Cache invalidator
  const { theme, toggleTheme } = useTheme();                                                    // Theme toggle hook
  const [isMobileOpen, setIsMobileOpen] = useState(false);                                      // Mobile drawer open state
  
  // Query active clinician session
  const session = trpc.doctorAuth.me.useQuery(undefined, { retry: false, refetchOnWindowFocus: false });
  
  // Clinician logout mutation
  const logoutMutation = trpc.doctorAuth.logout.useMutation({
    onSuccess: async () => {
      utils.doctorAuth.me.setData(undefined, null);                                             // Clear auth cache
      await utils.doctorWorkspace.invalidate();                                                 // Invalidate workspace cache
      navigate("/doctor/login", { replace: true });                                             // Redirect to doctor login
    },
  });

  useDoctorRealtime(Boolean(session.data));                                                     // Subscribe to real-time doctor events

  // Handle logout action
  const handleLogout = async (e: React.MouseEvent) => {
    e.preventDefault();
    await logoutMutation.mutateAsync();
  };

  const closeMobile = () => setIsMobileOpen(false);                                             // Close mobile sidebar

  // Close mobile drawer on Escape key
  useEffect(() => {
    if (!isMobileOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeMobile();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMobileOpen]);

  // Automatic inactivity auto-logout protection (5 minutes)
  useEffect(() => {
    if (!session.data || typeof window === 'undefined') return;

    let hasExpired = false;
    return registerPatientInactivityTimer(window, () => {
      if (hasExpired) return;
      hasExpired = true;
      void (async () => {
        try {
          await logoutMutation.mutateAsync();
        } finally {
          toast.error('You have been signed out after five minutes of inactivity.');
          navigate('/doctor/login', { replace: true });
        }
      })();
    });
  }, [session.data, logoutMutation, navigate]);

  // Loading skeleton screen
  if (session.isLoading) return (
    <main className="doctor-content">
      <div className="container"><p>Verifying clinician session…</p></div>
    </main>
  );

  // Redirect to login if doctor session is absent
  if (!session.data) return <Navigate to="/doctor/login" replace />;

  // Calculate doctor initials for avatar display
  const initials = (session.data?.displayName?.trim() || 'Doctor')
    .split(/\s+/)
    .filter(Boolean)
    .map((w: string) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'D';

  return (
    <div className="app-layout">
      {/* Mobile backdrop dim overlay */}
      {isMobileOpen && (
        <button
          type="button"
          className="app-sidebar-backdrop"
          aria-label="Close navigation"
          onClick={closeMobile}
        />
      )}

      {/* Navigation Sidebar */}
      <aside
        id="doctor-sidebar"
        className={`app-sidebar ${isMobileOpen ? 'is-open' : ''}`}
        aria-label="Doctor navigation"
      >
        {/* Brand logo header */}
        <div className="app-sidebar-header" style={{ padding: '20px 24px', borderBottom: '1px solid var(--color-border)' }}>
          <NavLink to="/doctor/dashboard" onClick={closeMobile} className="app-sidebar-brand-link" aria-label="LifeLink clinician home" style={{ display: 'flex', alignItems: 'center' }}>
            <LifeLinkLogo className="lifelink-logo-sidebar lifelink-logo-sidebar-patient" style={{ width: '165px', height: 'auto' }} />
          </NavLink>
        </div>

        {/* Doctor workspace navigation links */}
        <nav className="app-sidebar-nav" style={{ padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, overflowY: 'auto' }}>
          {navItems.map(({ path, label, icon: Icon }) => (
            <NavLink
              key={path}
              to={path}
              onClick={closeMobile}
              className={({ isActive }) => `app-sidebar-nav-item ${isActive ? "active" : ""}`}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '10px 14px',
                borderRadius: '10px',
                fontSize: '0.92rem',
                fontWeight: isActive ? 600 : 500,
                color: isActive ? 'var(--color-primary)' : 'var(--color-text-muted)',
                background: isActive ? 'var(--color-primary-muted)' : 'transparent',
                textDecoration: 'none',
                transition: 'background 0.15s, color 0.15s'
              })}
            >
              <Icon size={19} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Logout button */}
        <div style={{ padding: '16px 12px', borderTop: '1px solid var(--color-border)' }}>
          <button
            type="button"
            onClick={handleLogout}
            style={{
              display: 'flex', alignItems: 'center', gap: '12px',
              width: '100%', padding: '10px 14px', borderRadius: '10px',
              border: 'none', background: 'transparent',
              color: 'var(--color-text-muted)', fontSize: '0.92rem',
              fontWeight: 500, cursor: 'pointer', textAlign: 'left'
            }}
            title="Sign out of clinician workspace"
          >
            <LogOut size={19} />
            <span>Log Out</span>
          </button>
        </div>
      </aside>

      {/* Main Viewport Content Area */}
      <main className="app-main">
        {/* Top App Header */}
        <header className="app-header">
          <div className="app-header-context">
            {/* Mobile menu button */}
            <button
              type="button"
              className="app-mobile-menu-button"
              aria-label={isMobileOpen ? 'Close navigation' : 'Open navigation'}
              aria-expanded={isMobileOpen}
              aria-controls="doctor-sidebar"
              onClick={() => setIsMobileOpen((open) => !open)}
            >
              {isMobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <NavLink to="/doctor/dashboard" className="app-mobile-brand" aria-label="LifeLink clinician home">
              <LifeLinkLogo variant="symbol" className="app-mobile-brand-symbol" />
              <span>LifeLink</span>
            </NavLink>
          </div>

          {/* Header controls */}
          <div className="app-header-controls">
            <button className="icon-btn" aria-label="Toggle theme" onClick={toggleTheme} title="Toggle theme">
              {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
            </button>

            {/* Notification bell */}
            <button
              className="icon-btn"
              aria-label="Notifications"
              style={{ position: 'relative', background: 'var(--color-background)', width: '40px', height: '40px', borderRadius: '50%', display: 'grid', placeItems: 'center', border: '1px solid var(--color-border)', cursor: 'pointer' }}
            >
              <Bell size={19} color="var(--color-text-muted)" />
            </button>

            {/* Doctor Profile monogram badge */}
            <button
              type="button"
              onClick={() => navigate('/doctor/profile')}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}
              aria-label="Open your profile"
            >
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--color-primary-muted)', color: 'var(--color-primary)', fontWeight: 700, fontSize: '0.88rem', display: 'grid', placeItems: 'center', border: '1px solid var(--color-glass-border)', boxShadow: 'var(--shadow-sm)' }}>
                {initials}
              </div>
              <ChevronDown size={16} color="var(--color-text-muted)" />
            </button>
          </div>
        </header>

        {/* Dynamic nested doctor view content */}
        <div className="app-content">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
