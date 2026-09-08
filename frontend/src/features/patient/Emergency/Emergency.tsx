/**
 * ============================================================================
 * LIFELINK FRONTEND: EMERGENCY ASSISTANCE SOS WORKFLOW (features/patient/Emergency/Emergency.tsx)
 * ============================================================================
 * 
 * WHAT THIS COMPONENT DOES:
 * This component provides critical emergency assistance capabilities:
 * 1. India Unified Emergency Hotline (112): Offers a one-touch confirmed trigger
 *    that launches the device's native phone dialer pre-populated with "112".
 * 2. Emergency Contacts SOS Dispatch: Integrates with the patient's Health Passport
 *    to retrieve verified emergency contacts (spouse, parent, physician).
 * 3. User Consent Safety Guarantee: LifeLink NEVER silently sends messages or places
 *    calls in the background. It constructs a deep-link `sms:` URI with pre-filled distress
 *    copy so the patient reviews and authorizes the message before dispatch.
 */
import React, { useState } from 'react';
import { ShieldAlert, Phone, MessageCircle, Siren, UsersRound } from 'lucide-react';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Popup } from '../../../components/ui/Popup';
import { trpc } from '../../../lib/trpc';
import { useNavigate } from 'react-router-dom';

/** India’s unified emergency response number. The control only opens a dialer after confirmation. */
export const AMBULANCE_EMERGENCY_NUMBER = '112';
export const SMS_CONFIRMATION_TITLE = 'Prepare SOS message';

/** This copy is placed into the user’s SMS composer; LifeLink never sends it automatically. */
export function buildEmergencySmsBody() {
  return 'SOS: Please contact me immediately. I requested emergency help through LifeLink.';
}

function smsHref(phone: string) {
  return `sms:${phone.replace(/[^+\d]/g, '')}?body=${encodeURIComponent(buildEmergencySmsBody())}`;
}

export const Emergency = () => {
  const navigate = useNavigate();
  const profileQuery = trpc.patientProfile.get.useQuery();
  const [isAmbulanceConfirmOpen, setIsAmbulanceConfirmOpen] = useState(false);
  const [contactForSms, setContactForSms] = useState<{ name: string; phone: string } | null>(null);

  const contacts = profileQuery.data?.emergencyContacts ?? [];

  const openSmsComposer = () => {
    if (!contactForSms) return;
    // This opens the user’s native SMS composer. The user must review and send the message themselves.
    const smsTarget = smsHref(contactForSms.phone);
    setContactForSms(null);
    window.location.assign(smsTarget);
  };

  const openAmbulanceDialer = () => {
    setIsAmbulanceConfirmOpen(false);
    // This opens the dialer only. The user must still choose to place the call.
    window.location.assign(`tel:${AMBULANCE_EMERGENCY_NUMBER}`);
  };

  return (
    <div className="dashboard-workspace">
      <header style={{ marginBottom: 'var(--spacing-5)' }}>
        <div className="flex items-center gap-3">
          <div style={{ width: 52, height: 52, borderRadius: '16px', background: 'rgba(187, 44, 44, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ShieldAlert size={28} color="#B01E1E" />
          </div>
          <div>
            <h1 style={{ margin: 0 }}>Emergency Assistance</h1>
            <p className="caption" style={{ margin: '4px 0 0' }}>Choose an action yourself. LifeLink does not call emergency services, send messages, or share your location automatically.</p>
          </div>
        </div>
      </header>

      <div className="flex-col gap-4">
        <Card variant="emergency" style={{ padding: 'var(--spacing-5)' }}>
          <div className="flex-col gap-3">
            <div className="flex items-center gap-2">
              <Siren size={24} color="#B01E1E" />
              <h2 style={{ margin: 0, color: 'var(--color-primary)' }}>Call emergency response</h2>
            </div>
            <p style={{ margin: 0 }}>For an immediate emergency in India, you can open your device dialer for the unified emergency number <strong>{AMBULANCE_EMERGENCY_NUMBER}</strong>. Your device will ask you to place the call.</p>
            <Button variant="danger" onClick={() => setIsAmbulanceConfirmOpen(true)}>
              <Phone size={18} /> Call {AMBULANCE_EMERGENCY_NUMBER}
            </Button>
          </div>
        </Card>

        <Card variant="glass" style={{ padding: 'var(--spacing-5)' }}>
          <div className="flex items-center gap-2 mb-3">
            <UsersRound size={22} color="var(--color-primary)" />
            <div>
              <h2 style={{ margin: 0, fontSize: 'var(--text-h3)' }}>Emergency contacts</h2>
              <p className="caption" style={{ margin: '3px 0 0' }}>Preparing a message opens your phone’s SMS composer. Review it and choose whether to send it.</p>
            </div>
          </div>

          {profileQuery.isLoading && <p className="caption" style={{ margin: 0 }}>Loading your recorded emergency contacts…</p>}
          {!profileQuery.isLoading && contacts.length === 0 && (
            <div className="flex-col gap-3">
              <p className="caption" style={{ margin: 0 }}>No emergency contacts are recorded in your Health Passport yet.</p>
              <Button variant="outline" onClick={() => navigate('/patient/health-passport')}>Manage emergency contacts</Button>
            </div>
          )}
          {!profileQuery.isLoading && contacts.length > 0 && (
            <div className="flex-col gap-3">
              {contacts.map((contact) => (
                <div key={contact.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--spacing-3)', padding: '12px', border: '1px solid var(--color-border)', borderRadius: 'var(--border-radius-md)' }}>
                  <div>
                    <strong style={{ color: 'var(--color-primary)' }}>{contact.name}</strong>
                    <p className="caption" style={{ margin: '2px 0 0' }}>{contact.relationship}</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setContactForSms({ name: contact.name, phone: contact.phone })}>
                    <MessageCircle size={16} /> Review SOS message
                  </Button>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Popup isOpen={isAmbulanceConfirmOpen} onClose={() => setIsAmbulanceConfirmOpen(false)} title="Open emergency dialer" closeOnBackdrop={false}>
        <div className="flex-col gap-4">
          <p style={{ margin: 0 }}>This will open your device dialer with <strong>{AMBULANCE_EMERGENCY_NUMBER}</strong>. LifeLink will not place the call for you; you decide whether to continue in your phone app.</p>
          <div className="flex gap-3">
            <Button variant="outline" style={{ flex: 1 }} onClick={() => setIsAmbulanceConfirmOpen(false)}>Cancel</Button>
            <Button variant="danger" style={{ flex: 1 }} onClick={openAmbulanceDialer}><Phone size={16} /> Open dialer</Button>
          </div>
        </div>
      </Popup>

      <Popup isOpen={Boolean(contactForSms)} onClose={() => setContactForSms(null)} title={SMS_CONFIRMATION_TITLE} closeOnBackdrop={false}>
        <div className="flex-col gap-4">
          <p style={{ margin: 0 }}>This will open an SMS draft addressed to <strong>{contactForSms?.name}</strong>. LifeLink will not send it; you can review, edit, or cancel it in your messaging app.</p>
          <div className="flex gap-3">
            <Button variant="outline" style={{ flex: 1 }} onClick={() => setContactForSms(null)}>Cancel</Button>
            <Button variant="primary" style={{ flex: 1 }} onClick={openSmsComposer}><MessageCircle size={16} /> Open SMS draft</Button>
          </div>
        </div>
      </Popup>
    </div>
  );
};
