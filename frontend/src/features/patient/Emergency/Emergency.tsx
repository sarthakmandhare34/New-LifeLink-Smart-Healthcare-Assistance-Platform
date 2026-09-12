import React, { useState } from 'react';                                                  // Core React hooks for interactive state management
import { ShieldAlert, Phone, MessageCircle, Siren, UsersRound } from 'lucide-react';           // Emergency and communication icon set
import { Card } from '../../../components/ui/Card';                                            // Reusable visual card component
import { Button } from '../../../components/ui/Button';                                        // Accessible UI button
import { Popup } from '../../../components/ui/Popup';                                          // Modal dialog component for user confirmation gates
import { trpc } from '../../../lib/trpc';                                                       // Type-safe tRPC client bridge
import { useNavigate } from 'react-router-dom';                                                 // SPA route navigation hook

// =========================================================================================
// EMERGENCY SOS WORKFLOW CONSTANTS & DISPATCH PREPARATION
// In strict adherence to Indian Telecom and Digital Personal Data Protection guidelines:
// LifeLink NEVER silently places phone calls or sends SMS messages in the background.
// All actions require conscious user confirmation and hand off directly to native device apps.
// =========================================================================================

/** India’s unified emergency response hotline (112 ERSS - Emergency Response Support System) */
export const AMBULANCE_EMERGENCY_NUMBER = '112';                                                // Official all-in-one national emergency number in India
export const SMS_CONFIRMATION_TITLE = 'Prepare SOS message';                                    // Modal title ensuring clear patient consent

/** Prepares pre-composed distress message text for the patient's native SMS application */
export function buildEmergencySmsBody() {
  return 'SOS: Please contact me immediately. I requested emergency help through LifeLink.';      // Standard clear distress notification copy
}

/** Formats a sanitized tel/sms URI with URL-encoded distress message body */
function smsHref(phone: string) {
  return `sms:${phone.replace(/[^+\d]/g, '')}?body=${encodeURIComponent(buildEmergencySmsBody())}`; // Deep link invoking OS native SMS messenger
}

// =========================================================================================
// EMERGENCY ASSISTANCE SOS WORKFLOW COMPONENT
// Provides rapid one-touch access to the national 112 emergency hotline and emergency contacts.
// =========================================================================================
export const Emergency = () => {
  const navigate = useNavigate();                                                               // Router navigation hook for redirections
  const profileQuery = trpc.patientProfile.get.useQuery();                                      // Retrieves patient profile and emergency contacts
  const [isAmbulanceConfirmOpen, setIsAmbulanceConfirmOpen] = useState(false);                  // Modal gate before launching dialer for 112
  const [contactForSms, setContactForSms] = useState<{ name: string; phone: string } | null>(null); // Contact selected for SOS SMS composition

  const contacts = profileQuery.data?.emergencyContacts ?? [];                                  // Emergency contacts list or fallback to empty array

  // Open device native SMS composer with pre-filled distress message
  const openSmsComposer = () => {
    if (!contactForSms) return;                                                                 // Guard against unselected contact
    // Opens native SMS composer where user reviews and presses send themselves
    const smsTarget = smsHref(contactForSms.phone);                                             // Build deep link
    setContactForSms(null);                                                                     // Close modal dialog
    window.location.assign(smsTarget);                                                          // Hand off control to operating system SMS app
  };

  // Open device native phone dialer pre-populated with 112
  const openAmbulanceDialer = () => {
    setIsAmbulanceConfirmOpen(false);                                                           // Close modal dialog
    // Opens native dialer pre-populated with 112; user must tap dial button
    window.location.assign(`tel:${AMBULANCE_EMERGENCY_NUMBER}`);                                // Hand off control to phone dialer
  };

  return (
    <div className="dashboard-workspace">
      {/* Emergency header banner */}
      <header style={{ marginBottom: 'var(--spacing-5)' }}>
        <div className="flex items-center gap-3">
          <div style={{ width: 52, height: 52, borderRadius: '16px', background: 'rgba(187, 44, 44, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ShieldAlert size={28} color="#B01E1E" />                                           {/* Emergency alert badge */}
          </div>
          <div>
            <h1 style={{ margin: 0 }}>Emergency Assistance</h1>                                 {/* Page title */}
            <p className="caption" style={{ margin: '4px 0 0' }}>Choose an action yourself. LifeLink does not call emergency services, send messages, or share your location automatically.</p>
          </div>
        </div>
      </header>

      {/* Main emergency options container */}
      <div className="flex-col gap-4">
        {/* Urgent National Hotline 112 Card */}
        <Card variant="emergency" style={{ padding: 'var(--spacing-5)' }}>
          <div className="flex-col gap-3">
            <div className="flex items-center gap-2">
              <Siren size={24} color="#B01E1E" />                                               {/* Siren emergency icon */}
              <h2 style={{ margin: 0, color: 'var(--color-primary)' }}>Call emergency response</h2>
            </div>
            <p style={{ margin: 0 }}>For an immediate emergency in India, you can open your device dialer for the unified emergency number <strong>{AMBULANCE_EMERGENCY_NUMBER}</strong>. Your device will ask you to place the call.</p>
            <Button variant="danger" onClick={() => setIsAmbulanceConfirmOpen(true)}>
              <Phone size={18} /> Call {AMBULANCE_EMERGENCY_NUMBER}                             {/* Triggers confirmation modal before dialer */}
            </Button>
          </div>
        </Card>

        {/* Health Passport Emergency Contacts Card */}
        <Card variant="glass" style={{ padding: 'var(--spacing-5)' }}>
          <div className="flex items-center gap-2 mb-3">
            <UsersRound size={22} color="var(--color-primary)" />
            <div>
              <h2 style={{ margin: 0, fontSize: 'var(--text-h3)' }}>Emergency contacts</h2>
              <p className="caption" style={{ margin: '3px 0 0' }}>Preparing a message opens your phone’s SMS composer. Review it and choose whether to send it.</p>
            </div>
          </div>

          {/* Loading indicator */}
          {profileQuery.isLoading && <p className="caption" style={{ margin: 0 }}>Loading your recorded emergency contacts…</p>}
          
          {/* Empty contacts fallback with direct link to Health Passport */}
          {!profileQuery.isLoading && contacts.length === 0 && (
            <div className="flex-col gap-3">
              <p className="caption" style={{ margin: 0 }}>No emergency contacts are recorded in your Health Passport yet.</p>
              <Button variant="outline" onClick={() => navigate('/patient/health-passport')}>Manage emergency contacts</Button>
            </div>
          )}

          {/* Render verified emergency contacts */}
          {!profileQuery.isLoading && contacts.length > 0 && (
            <div className="flex-col gap-3">
              {contacts.map((contact) => (
                <div key={contact.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--spacing-3)', padding: '12px', border: '1px solid var(--color-border)', borderRadius: 'var(--border-radius-md)' }}>
                  <div>
                    <strong style={{ color: 'var(--color-primary)' }}>{contact.name}</strong>   {/* Contact name */}
                    <p className="caption" style={{ margin: '2px 0 0' }}>{contact.relationship}</p> {/* Contact relationship */}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setContactForSms({ name: contact.name, phone: contact.phone })} // Select contact for SMS draft modal
                    aria-label={`Review SOS message for ${contact.name}`}
                  >
                    <MessageCircle size={16} /> Review SOS message                              {/* SMS action trigger */}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Confirmation Modal before launching Phone Dialer */}
      <Popup isOpen={isAmbulanceConfirmOpen} onClose={() => setIsAmbulanceConfirmOpen(false)} title="Open emergency dialer" closeOnBackdrop={false}>
        <div className="flex-col gap-4">
          <p style={{ margin: 0 }}>This will open your device dialer with <strong>{AMBULANCE_EMERGENCY_NUMBER}</strong>. LifeLink will not place the call for you; you decide whether to continue in your phone app.</p>
          <div className="flex gap-3" style={{ flexWrap: 'wrap' }}>
            <Button variant="outline" style={{ flex: 1, minWidth: '120px' }} onClick={() => setIsAmbulanceConfirmOpen(false)}>Cancel</Button>
            <Button variant="danger" style={{ flex: 1, minWidth: '120px' }} onClick={openAmbulanceDialer}><Phone size={16} /> Open dialer</Button>
          </div>
        </div>
      </Popup>

      {/* Confirmation Modal before launching SMS Messenger */}
      <Popup isOpen={Boolean(contactForSms)} onClose={() => setContactForSms(null)} title={SMS_CONFIRMATION_TITLE} closeOnBackdrop={false}>
        <div className="flex-col gap-4">
          <p style={{ margin: 0 }}>This will open an SMS draft addressed to <strong>{contactForSms?.name}</strong>. LifeLink will not send it; you can review, edit, or cancel it in your messaging app.</p>
          <div className="flex gap-3" style={{ flexWrap: 'wrap' }}>
            <Button variant="outline" style={{ flex: 1, minWidth: '120px' }} onClick={() => setContactForSms(null)}>Cancel</Button>
            <Button variant="primary" style={{ flex: 1, minWidth: '120px' }} onClick={openSmsComposer}><MessageCircle size={16} /> Open SMS draft</Button>
          </div>
        </div>
      </Popup>
    </div>
  );
};
