import React, { useEffect, useState } from 'react';
import { Card } from '../../../components/ui/Card';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { User, CheckCircle2, Camera, Loader2 } from 'lucide-react';
import { trpc } from '../../../lib/trpc';

export const Profile = () => {
  const trpcUtils = trpc.useUtils();
  const profileQuery = trpc.patientProfile.get.useQuery();
  const updateMutation = trpc.patientProfile.update.useMutation();
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [first, setFirst] = useState('');
  const [last, setLast] = useState('');
  const [phone, setPhone] = useState('');
  const [photoError, setPhotoError] = useState('');
  const [isPhotoSaving, setIsPhotoSaving] = useState(false);

  useEffect(() => {
    if (!profileQuery.data) return;
    const nameParts = profileQuery.data.name.trim().split(/\s+/);
    setFirst(nameParts.shift() || '');
    setLast(nameParts.join(' '));
    setPhone(profileQuery.data.phone || '');
  }, [profileQuery.data]);

  if (profileQuery.isLoading) {
    return <div className="flex items-center justify-center h-full"><p className="caption">Loading patient profile…</p></div>;
  }
  if (!profileQuery.data) return null;
  const profile = profileQuery.data;
  const profileInitial = profile.name.trim().charAt(0).toUpperCase() || 'P';

  const handlePhotoChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const photo = event.target.files?.[0];
    event.target.value = '';
    if (!photo) return;

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(photo.type)) {
      setPhotoError('Use a JPG, PNG, or WebP image.');
      return;
    }
    if (photo.size > 2 * 1024 * 1024) {
      setPhotoError('Choose an image smaller than 2 MB.');
      return;
    }

    setPhotoError('');
    setIsPhotoSaving(true);
    try {
      const response = await fetch('/api/patient/profile-photo', {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Content-Type': photo.type,
          'X-LifeLink-Request': 'profile-photo',
        },
        body: photo,
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(typeof payload.error === 'string' ? payload.error : 'Your photo could not be saved.');
      await Promise.all([
        trpcUtils.patientProfile.get.invalidate(),
        trpcUtils.patientDashboard.summary.invalidate(),
      ]);
    } catch (uploadError) {
      setPhotoError(uploadError instanceof Error ? uploadError.message : 'Your photo could not be saved.');
    } finally {
      setIsPhotoSaving(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!first.trim() || !last.trim()) {
      setError('First and last name are required.');
      return;
    }
    setError('');
    setIsSaving(true);
    setSuccess(false);

    try {
      await updateMutation.mutateAsync({
        name: `${first.trim()} ${last.trim()}`,
        phone: phone.trim(),
      });
      await trpcUtils.patientProfile.get.invalidate();
      await trpcUtils.patientDashboard.summary.invalidate();
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError('Failed to update patient profile.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="container patient-profile-page" style={{ padding: 0 }}>
      <header className="patient-profile-heading">
        <div className="patient-profile-heading-icon">
          <User size={24} color="var(--color-primary)" />
        </div>
        <div>
          <h1 style={{ margin: 0 }}>Patient Profile</h1>
          <p className="caption">Manage identity information and contact preferences.</p>
        </div>
      </header>

      <Card variant="glass" className="patient-profile-card">
        <div className="patient-profile-identity">
          <label className="profile-photo-picker">
            <input className="profile-photo-input" type="file" accept="image/jpeg,image/png,image/webp" onChange={handlePhotoChange} disabled={isPhotoSaving} aria-label="Upload profile photo" />
            <span className="patient-profile-avatar">
              {profile.avatarUrl ? <img src={profile.avatarUrl} alt="" /> : <span>{profileInitial}</span>}
            </span>
            <span className="profile-photo-edit" aria-hidden="true">{isPhotoSaving ? <Loader2 size={14} /> : <Camera size={14} />}</span>
          </label>
          <div>
            <h2 style={{ margin: 0, fontSize: 'var(--text-h2)' }}>{profile.name}</h2>
            <div className="flex items-center gap-2 mt-1">
              <Badge status="success"><CheckCircle2 size={12} /> Patient Account</Badge>
              <span className="caption">Private profile</span>
            </div>
            <p className="profile-photo-help">{isPhotoSaving ? 'Saving your photo…' : 'Select the circle to add or change a photo. JPG, PNG, or WebP up to 2 MB.'}</p>
          </div>
        </div>

        {photoError && <div className="alert-panel mb-3"><span style={{ fontSize: 'var(--text-caption)' }}>{photoError}</span></div>}

        {error && (
          <div className="alert-panel mb-3">
            <span style={{ fontSize: 'var(--text-caption)' }}>{error}</span>
          </div>
        )}

        <form onSubmit={handleSave} className="flex-col gap-4">
          <div className="flex flex-col sm:flex-row gap-3">
             <div style={{ flex: 1 }}>
               <label htmlFor="profile-first-name" style={{ display: 'block', marginBottom: 'var(--spacing-1)', fontWeight: 600, fontSize: 'var(--text-caption)' }}>First Name</label>
               <Input id="profile-first-name" type="text" value={first} onChange={e => setFirst(e.target.value)} required />
             </div>
             <div style={{ flex: 1 }}>
               <label htmlFor="profile-last-name" style={{ display: 'block', marginBottom: 'var(--spacing-1)', fontWeight: 600, fontSize: 'var(--text-caption)' }}>Last Name</label>
               <Input id="profile-last-name" type="text" value={last} onChange={e => setLast(e.target.value)} required />
             </div>
          </div>

          <div>
            <label htmlFor="profile-email" style={{ display: 'block', marginBottom: 'var(--spacing-1)', fontWeight: 600, fontSize: 'var(--text-caption)' }}>Registered Email Address</label>
            <Input id="profile-email" type="email" value={profile.email} readOnly style={{ background: 'var(--color-background)', color: 'var(--color-text-muted)', cursor: 'not-allowed' }} />
          </div>

          <div>
            <label htmlFor="profile-phone" style={{ display: 'block', marginBottom: 'var(--spacing-1)', fontWeight: 600, fontSize: 'var(--text-caption)' }}>Primary Contact Phone</label>
            <Input id="profile-phone" type="tel" value={phone} onChange={e => setPhone(e.target.value)} />
          </div>

          <div className="flex items-center gap-3 mt-2">
            <Button type="submit" variant="primary" disabled={isSaving}>
              {isSaving ? 'Saving Changes...' : 'Save Profile Changes'}
            </Button>
            {success && <span style={{ color: 'var(--color-success)', fontWeight: 600, fontSize: 'var(--text-caption)' }}>Profile updated successfully!</span>}
          </div>
        </form>
      </Card>
    </div>
  );
};
