import React, { useState } from 'react';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { trpc } from '../../../lib/trpc';
import { Settings as SettingsIcon, Bell, Shield } from 'lucide-react';

export const Settings = () => {
  const meQuery = trpc.auth.me.useQuery();
  const patient = meQuery.data;

  const [aptReminders, setAptReminders] = useState(true);
  const [medAlerts, setMedAlerts] = useState(true);


  return (
    <div className="dashboard-workspace">
      <header className="mb-4 flex items-center gap-3">
        <div style={{ width: 52, height: 52, borderRadius: '14px', background: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <SettingsIcon size={26} color="#FFF" />
        </div>
        <div>
          <h1 style={{ margin: 0 }}>Workspace Preferences</h1>
          <p className="caption">Review future notification preferences and account options.</p>
        </div>
      </header>

      <div className="responsive-list-grid">
        
        {/* Notifications Bento Section */}
          <Card variant="glass" className="h-full flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-4 pb-2" style={{ borderBottom: '1px solid var(--color-border)' }}>
                <Bell size={20} color="var(--color-primary)" />
                <h2 style={{ margin: 0, fontSize: 'var(--text-h2)' }}>Notification Preferences</h2>
              </div>
              
              <div className="flex-col gap-3">
                 <div className="flex items-center justify-between py-2" style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <div>
                      <label htmlFor="pref-apt-reminders" style={{ margin: 0, fontWeight: 600, display: 'block', cursor: 'pointer' }}>Appointment reminder preference</label>
                      <span className="caption">Reminder delivery is not active yet. This preference is saved only for the current workspace session.</span>
                    </div>
                    <input 
                      id="pref-apt-reminders"
                      type="checkbox" 
                      aria-label="Appointment reminder preference"
                      checked={aptReminders} 
                      onChange={(e) => setAptReminders(e.target.checked)} 
                      style={{ accentColor: 'var(--color-primary)', transform: 'scale(1.2)', cursor: 'pointer' }} 
                    />
                 </div>

                 <div className="flex items-center justify-between py-2">
                    <div>
                      <label htmlFor="pref-med-alerts" style={{ margin: 0, fontWeight: 600, display: 'block', cursor: 'pointer' }}>Medicine inventory preference</label>
                      <span className="caption">Inventory alerts are not active yet. This preference is saved only for the current workspace session.</span>
                    </div>
                    <input 
                      id="pref-med-alerts"
                      type="checkbox" 
                      aria-label="Medicine inventory preference"
                      checked={medAlerts} 
                      onChange={(e) => setMedAlerts(e.target.checked)} 
                      style={{ accentColor: 'var(--color-primary)', transform: 'scale(1.2)', cursor: 'pointer' }} 
                    />
                 </div>
              </div>
            </div>

            <div className="flex items-center gap-3 mt-4 pt-3" style={{ borderTop: '1px solid var(--color-border)' }}>
              <span className="caption" style={{ color: 'var(--color-text-muted)' }}>Preferences are read-only in this workspace.</span>
            </div>
          </Card>

        {/* Security & Account Bento Section */}
          <Card variant="glass" className="h-full flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-4 pb-2" style={{ borderBottom: '1px solid var(--color-border)' }}>
                <Shield size={20} color="var(--color-primary)" />
                <h2 style={{ margin: 0, fontSize: 'var(--text-h2)' }}>Account Options</h2>
              </div>
              
              <div className="flex items-center justify-between py-2 mb-3" style={{ borderBottom: '1px solid var(--color-border)' }}>
                <div>
                  <p style={{ margin: 0, fontWeight: 600 }}>Patient password changes</p>
                  <span className="caption">Password changes are not available in this workspace.</span>
                </div>
                <Button variant="secondary" size="sm" disabled>Not available</Button>
              </div>

              <div className="flex items-center justify-between py-2">
                <div>
                  <p style={{ margin: 0, fontWeight: 600, color: 'var(--color-text-muted)' }}>Delete Account</p>
                  <span className="caption">Deletion requests are not available in this workspace.</span>
                </div>
                <Button variant="outline" size="sm" disabled style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}>
                  Not available
                </Button>
              </div>
            </div>
          </Card>

      </div>
    </div>
  );
};
