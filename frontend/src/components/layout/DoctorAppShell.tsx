/** Shared clinician shell for the restricted synthetic doctor workspace. */
import React, { useState, useEffect } from "react";
import { Navigate, NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  Calendar, LayoutDashboard, FileText, Users, Activity,
  Settings as SettingsIcon, User, LogOut, Sun, Moon, Bell,
  ChevronDown, Menu, X, Stethoscope
} from "lucide-react";
import { LifeLinkLogo } from "../brand/LifeLinkLogo";
import { trpc } from "../../lib/trpc";
import { useDoctorRealtime } from "../../hooks/useDoctorRealtime";
import { useTheme } from "../../context/ThemeContext";

const navItems = [
  { path: "/doctor/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { path: "/doctor/appointments", label: "Appointments", icon: Calendar },
  { path: "/doctor/patients", label: "Patients", icon: Users },
  { path: "/doctor/assessments", label: "Assessments", icon: Activity },
  { path: "/doctor/consultation", label: "Consultation", icon: Stethoscope },
  { path: "/doctor/prescriptions", label: "Prescriptions", icon: FileText },
  { path: "/doctor/profile", label: "Profile", icon: User },
  { path: "/doctor/settings", label: "Settings", icon: SettingsIcon },
];

export const DoctorAppShell = () => {
  const navigate = useNavigate();
  const utils = trpc.useUtils();
  const { theme, toggleTheme } = useTheme();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const session = trpc.doctorAuth.me.useQuery(undefined, { retry: false, refetchOnWindowFocus: false });
  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: async () => {
      utils.doctorAuth.me.setData(undefined, null);
      await utils.invalidate();
      navigate("/doctor/login", { replace: true });
    },
  });
  useDoctorRealtime(Boolean(session.data));

  const handleLogout = async (e: React.MouseEvent) => {
    e.preventDefault();
    await logoutMutation.mutateAsync();
  };

  const closeMobile = () => setIsMobileOpen(false);

  useEffect(() => {
    if (!isMobileOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeMobile();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMobileOpen]);

  if (session.isLoading) return (
    <main className="doctor-content">
      <div className="container"><p>Verifying clinician session…</p></div>
    </main>
  );
  if (!session.data) return <Navigate to="/doctor/login" replace />;

  const initials = (session.data?.displayName?.trim() || 'Doctor')
    .split(/\s+/)
    .filter(Boolean)
    .map((w: string) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'D';

  return (
    <div className="app-layout">
      {isMobileOpen && (
        <button
          type="button"
          className="app-sidebar-backdrop"
          aria-label="Close navigation"
          onClick={closeMobile}
        />
      )}

      <aside
        id="doctor-sidebar"
        className={`app-sidebar ${isMobileOpen ? 'is-open' : ''}`}
        aria-label="Doctor navigation"
      >
        <div className="app-sidebar-header" style={{ padding: '20px 24px', borderBottom: '1px solid var(--color-border)' }}>
          <NavLink to="/doctor/dashboard" onClick={closeMobile} className="app-sidebar-brand-link" aria-label="LifeLink clinician home" style={{ display: 'flex', alignItems: 'center' }}>
            <LifeLinkLogo className="lifelink-logo-sidebar lifelink-logo-sidebar-patient" style={{ width: '165px', height: 'auto' }} />
          </NavLink>
        </div>

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

      <main className="app-main">
        <header className="app-header">
          <div className="app-header-context">
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

          <div className="app-header-controls">
            <button className="icon-btn" aria-label="Toggle theme" onClick={toggleTheme} title="Toggle theme">
              {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
            </button>

            {/* Notification Bell — no hardcoded count */}
            <button
              className="icon-btn"
              aria-label="Notifications"
              style={{ position: 'relative', background: 'var(--color-background)', width: '40px', height: '40px', borderRadius: '50%', display: 'grid', placeItems: 'center', border: '1px solid var(--color-border)', cursor: 'pointer' }}
            >
              <Bell size={19} color="var(--color-text-muted)" />
            </button>

            {/* Doctor Profile Pill */}
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

        <div className="app-content">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
