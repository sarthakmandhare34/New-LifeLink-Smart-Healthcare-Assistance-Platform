import React, { useEffect, useState } from 'react';
import { Card } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Popup } from '../../../components/ui/Popup';
import { 
  FileHeart, 
  ShieldAlert, 
  Activity, 
  Droplets, 
  Users, 
  Edit2, 
  Save, 
  X, 
  Plus, 
  Trash2, 
  Clock, 
  AlertCircle,
  Phone,
  UserCheck
} from 'lucide-react';
import { trpc } from '../../../lib/trpc';

const VALID_BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] as const;

type EmergencyContactDraft = {
  id?: string;
  name: string;
  relationship: string;
  phone: string;
};

type EmergencyContactItem = {
  id: string;
  name: string;
  relationship: string;
  phone: string;
};

function urgencyBadgeStyle(urgency: string) {
  if (urgency === 'EMERGENCY') {
    return { bg: 'rgba(220, 38, 38, 0.12)', color: 'var(--color-semantic-emergency)', border: '1px solid rgba(220, 38, 38, 0.2)' };
  }
  if (urgency === 'MODERATE') {
    return { bg: 'rgba(217, 119, 6, 0.12)', color: 'var(--color-semantic-warning)', border: '1px solid rgba(217, 119, 6, 0.2)' };
  }
  if (urgency === 'ERROR') {
    return { bg: 'rgba(225, 29, 72, 0.12)', color: '#e11d48', border: '1px solid rgba(225, 29, 72, 0.2)' };
  }
  return { bg: 'rgba(13, 148, 136, 0.12)', color: 'var(--color-semantic-success)', border: '1px solid rgba(13, 148, 136, 0.2)' };
}

export const HealthPassport = () => {
  const trpcUtils = trpc.useUtils();
  const profileQuery = trpc.patientProfile.get.useQuery();
  const assessmentsQuery = trpc.assessment.list.useQuery();

  const updateMutation = trpc.patientProfile.update.useMutation();
  const createEmergencyContactMutation = trpc.patientProfile.emergencyContacts.create.useMutation();
  const updateEmergencyContactMutation = trpc.patientProfile.emergencyContacts.update.useMutation();
  const removeEmergencyContactMutation = trpc.patientProfile.emergencyContacts.remove.useMutation();

  // Health Passport Edit state
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [passportError, setPassportError] = useState('');
  const [bloodGroup, setBloodGroup] = useState('');
  const [allergies, setAllergies] = useState('');
  const [conditions, setConditions] = useState('');

  // Emergency Contact Modal state
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [contactDraft, setContactDraft] = useState<EmergencyContactDraft>({ name: '', relationship: '', phone: '' });
  const [contactError, setContactError] = useState('');
  const [isSavingContact, setIsSavingContact] = useState(false);

  // Delete Contact confirmation state
  const [contactToDelete, setContactToDelete] = useState<EmergencyContactItem | null>(null);
  const [isDeletingContact, setIsDeletingContact] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  useEffect(() => {
    if (!profileQuery.data) return;
    setBloodGroup(profileQuery.data.bloodGroup || '');
    setAllergies(profileQuery.data.allergies.join(', '));
    setConditions(profileQuery.data.conditions.join(', '));
  }, [profileQuery.data]);

  if (profileQuery.isLoading) {
    return (
      <div className="flex items-center justify-center" style={{ minHeight: '50vh' }}>
        <p className="caption" style={{ color: '#2D9D9C' }}>Loading Health Passport…</p>
      </div>
    );
  }

  if (!profileQuery.data) {
    return (
      <div className="flex items-center justify-center" style={{ minHeight: '50vh' }}>
        <p className="caption" style={{ color: 'var(--color-semantic-emergency)' }}>
          Health Passport could not be loaded. Please refresh your browser.
        </p>
      </div>
    );
  }

  const patient = profileQuery.data;

  // Passport Edit Handlers
  const handleEditClick = () => {
    setPassportError('');
    setBloodGroup(patient.bloodGroup || '');
    setAllergies(patient.allergies.join(', '));
    setConditions(patient.conditions.join(', '));
    setIsEditing(true);
  };

  const handleCancelPassportEdit = () => {
    setPassportError('');
    setBloodGroup(patient.bloodGroup || '');
    setAllergies(patient.allergies.join(', '));
    setConditions(patient.conditions.join(', '));
    setIsEditing(false);
  };

  const handleSavePassport = async () => {
    setIsSaving(true);
    setPassportError('');
    try {
      await updateMutation.mutateAsync({
        bloodGroup: bloodGroup.trim() || undefined,
        allergies: allergies.split(',').map(s => s.trim()).filter(Boolean),
        conditions: conditions.split(',').map(s => s.trim()).filter(Boolean),
      });
      await trpcUtils.patientProfile.get.invalidate();
      await trpcUtils.patientDashboard.summary.invalidate();
      setIsEditing(false);
    } catch (e: any) {
      setPassportError(e?.message || 'Failed to update Health Passport. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Contact Modal Handlers
  const openAddContact = () => {
    setContactError('');
    setContactDraft({ name: '', relationship: '', phone: '' });
    setIsContactModalOpen(true);
  };

  const openEditContact = (contact: EmergencyContactItem) => {
    setContactError('');
    setContactDraft({
      id: contact.id,
      name: contact.name,
      relationship: contact.relationship,
      phone: contact.phone,
    });
    setIsContactModalOpen(true);
  };

  const closeContactModal = () => {
    setIsContactModalOpen(false);
    setContactDraft({ name: '', relationship: '', phone: '' });
    setContactError('');
  };

  const handleSaveContact = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = contactDraft.name.trim();
    const relationship = contactDraft.relationship.trim();
    const phone = contactDraft.phone.trim();

    if (!name || !relationship || !phone) {
      setContactError('Please fill out the contact name, relationship, and phone number.');
      return;
    }

    setIsSavingContact(true);
    setContactError('');
    try {
      if (contactDraft.id) {
        await updateEmergencyContactMutation.mutateAsync({
          id: Number(contactDraft.id),
          values: { name, relationship, phone },
        });
      } else {
        await createEmergencyContactMutation.mutateAsync({ name, relationship, phone });
      }
      await trpcUtils.patientProfile.get.invalidate();
      await trpcUtils.patientDashboard.summary.invalidate();
      closeContactModal();
    } catch (error: any) {
      setContactError(error?.message || 'The emergency contact could not be saved. Please check the contact number and try again.');
    } finally {
      setIsSavingContact(false);
    }
  };

  // Contact Delete Handlers
  const confirmDeleteContact = async () => {
    if (!contactToDelete) return;
    setIsDeletingContact(true);
    setDeleteError('');
    try {
      await removeEmergencyContactMutation.mutateAsync({ id: Number(contactToDelete.id) });
      await trpcUtils.patientProfile.get.invalidate();
      await trpcUtils.patientDashboard.summary.invalidate();
      setContactToDelete(null);
    } catch (err: any) {
      setDeleteError(err?.message || 'Failed to remove contact. Please try again.');
    } finally {
      setIsDeletingContact(false);
    }
  };

  const cardStyle = {
    background: '#E6F9FC',
    padding: '24px',
    borderRadius: '16px',
    border: '1px solid #9FFBFF',
    boxShadow: '0 4px 16px rgba(16, 43, 45, 0.04)',
    display: 'flex',
    flexDirection: 'column' as const,
  };

  const iconCircleStyle = {
    width: '40px',
    height: '40px',
    borderRadius: '12px',
    background: 'rgba(0, 196, 204, 0.15)',
    display: 'grid',
    placeItems: 'center',
    color: '#00C4CC',
    flexShrink: 0,
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
      
      {/* Header */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'rgba(0, 196, 204, 0.15)', display: 'grid', placeItems: 'center', color: '#00C4CC', flexShrink: 0 }}>
            <FileHeart size={26} />
          </div>
          <div>
            <h1 className="font-display" style={{ fontSize: '2rem', fontWeight: 700, margin: 0, color: '#102B2D', fontFamily: 'Outfit, sans-serif' }}>
              Digital Health Passport
            </h1>
            <p style={{ color: '#2D9D9C', fontSize: '0.92rem', margin: '3px 0 0' }}>
              Your verified clinical baseline. Patient-controlled and securely stored.
            </p>
          </div>
        </div>

        {!isEditing ? (
          <Button
            variant="outline"
            onClick={handleEditClick}
            style={{ display: 'flex', gap: '8px', alignItems: 'center', borderRadius: '12px', borderColor: '#00C4CC', color: '#00C4CC', fontWeight: 600 }}
          >
            <Edit2 size={16} /> Edit Passport
          </Button>
        ) : (
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <Button
              variant="outline"
              onClick={handleCancelPassportEdit}
              disabled={isSaving}
              style={{ display: 'flex', gap: '6px', alignItems: 'center', borderRadius: '12px' }}
            >
              <X size={16} /> Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleSavePassport}
              disabled={isSaving}
              style={{ display: 'flex', gap: '6px', alignItems: 'center', borderRadius: '12px', background: '#00C4CC', borderColor: '#00C4CC', color: '#FFF', fontWeight: 700 }}
            >
              <Save size={16} /> {isSaving ? 'Saving…' : 'Save Changes'}
            </Button>
          </div>
        )}
      </header>

      {passportError && (
        <div
          role="alert"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '12px 16px',
            background: 'rgba(220, 38, 38, 0.08)',
            border: '1px solid rgba(220, 38, 38, 0.25)',
            borderRadius: '12px',
            color: 'var(--color-semantic-emergency)',
            fontSize: '0.9rem',
          }}
        >
          <AlertCircle size={20} style={{ flexShrink: 0 }} />
          <span>{passportError}</span>
        </div>
      )}

      {/* TOP ROW: Blood Group, Allergies, Existing Conditions */}
      <section
        style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: '20px' }}
        aria-label="Core clinical information"
      >
        {/* Blood Group */}
        <Card style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={iconCircleStyle}><Droplets size={20} /></div>
              <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#102B2D', fontFamily: 'Outfit, sans-serif' }}>
                Blood Group
              </h2>
            </div>
            {isEditing && <span style={{ fontSize: '0.78rem', color: '#2D9D9C', fontWeight: 600 }}>Editing</span>}
          </div>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', minHeight: '90px' }}>
            {isEditing ? (
              <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <span style={{ fontSize: '0.82rem', color: '#2D9D9C', fontWeight: 600 }}>Select Blood Group</span>
                <select
                  value={bloodGroup}
                  onChange={(e) => setBloodGroup(e.target.value)}
                  style={{
                    height: '46px',
                    padding: '0 14px',
                    borderRadius: '12px',
                    border: '1px solid #9FFBFF',
                    background: '#FFFFFF',
                    color: '#102B2D',
                    fontSize: '1.1rem',
                    fontWeight: 700,
                    outline: 'none',
                    fontFamily: 'Plus Jakarta Sans, sans-serif',
                  }}
                >
                  <option value="">Not specified</option>
                  {VALID_BLOOD_GROUPS.map((bg) => (
                    <option key={bg} value={bg}>{bg}</option>
                  ))}
                </select>
              </label>
            ) : (
              <div>
                {patient.bloodGroup ? (
                  <strong style={{ fontSize: '2.6rem', color: '#102B2D', lineHeight: 1, fontFamily: 'Outfit, sans-serif', fontWeight: 800 }}>
                    {patient.bloodGroup}
                  </strong>
                ) : (
                  <span style={{ fontSize: '1.2rem', color: '#2D9D9C', fontStyle: 'italic', fontWeight: 500 }}>
                    Not recorded
                  </span>
                )}
              </div>
            )}
          </div>
        </Card>

        {/* Allergies */}
        <Card style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={iconCircleStyle}><ShieldAlert size={20} /></div>
              <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#102B2D', fontFamily: 'Outfit, sans-serif' }}>
                Allergies
              </h2>
            </div>
            {isEditing && <span style={{ fontSize: '0.78rem', color: '#2D9D9C', fontWeight: 600 }}>Editing</span>}
          </div>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            {isEditing ? (
              <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <span style={{ fontSize: '0.82rem', color: '#2D9D9C', fontWeight: 600 }}>Allergies (comma-separated)</span>
                <Input
                  type="text"
                  value={allergies}
                  onChange={(e) => setAllergies(e.target.value)}
                  placeholder="e.g. Penicillin, Peanuts, Latex"
                  style={{ background: '#FFFFFF', borderColor: '#9FFBFF', color: '#102B2D', borderRadius: '12px' }}
                />
              </label>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {patient.allergies && patient.allergies.length > 0 ? (
                  patient.allergies.map((allergy) => (
                    <span
                      key={allergy}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '8px',
                        background: 'rgba(0, 196, 204, 0.12)',
                        color: '#008B90',
                        border: '1px solid rgba(0, 196, 204, 0.25)',
                        fontSize: '0.88rem',
                        fontWeight: 600,
                      }}
                    >
                      {allergy}
                    </span>
                  ))
                ) : (
                  <span style={{ fontSize: '0.9rem', color: '#2D9D9C', fontStyle: 'italic' }}>
                    No allergies recorded.
                  </span>
                )}
              </div>
            )}
          </div>
        </Card>

        {/* Existing Conditions */}
        <Card style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={iconCircleStyle}><Activity size={20} /></div>
              <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#102B2D', fontFamily: 'Outfit, sans-serif' }}>
                Existing Conditions
              </h2>
            </div>
            {isEditing && <span style={{ fontSize: '0.78rem', color: '#2D9D9C', fontWeight: 600 }}>Editing</span>}
          </div>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            {isEditing ? (
              <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <span style={{ fontSize: '0.82rem', color: '#2D9D9C', fontWeight: 600 }}>Conditions (comma-separated)</span>
                <Input
                  type="text"
                  value={conditions}
                  onChange={(e) => setConditions(e.target.value)}
                  placeholder="e.g. Asthma, Hypertension"
                  style={{ background: '#FFFFFF', borderColor: '#9FFBFF', color: '#102B2D', borderRadius: '12px' }}
                />
              </label>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {patient.conditions && patient.conditions.length > 0 ? (
                  patient.conditions.map((condition) => (
                    <span
                      key={condition}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '8px',
                        background: 'rgba(45, 157, 156, 0.12)',
                        color: '#102B2D',
                        border: '1px solid rgba(45, 157, 156, 0.25)',
                        fontSize: '0.88rem',
                        fontWeight: 600,
                      }}
                    >
                      {condition}
                    </span>
                  ))
                ) : (
                  <span style={{ fontSize: '0.9rem', color: '#2D9D9C', fontStyle: 'italic' }}>
                    No medical conditions recorded.
                  </span>
                )}
              </div>
            )}
          </div>
        </Card>
      </section>

      {/* EMERGENCY CONTACTS SECTION */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: '16px' }} aria-labelledby="emergency-contacts-title">
        <Card style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={iconCircleStyle}><Users size={20} /></div>
              <div>
                <h2 id="emergency-contacts-title" style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: '#102B2D', fontFamily: 'Outfit, sans-serif' }}>
                  Emergency Contacts
                </h2>
                <p style={{ margin: '2px 0 0', color: '#2D9D9C', fontSize: '0.85rem' }}>
                  Trusted individuals who can be contacted during an emergency.
                </p>
              </div>
            </div>

            <Button
              variant="primary"
              onClick={openAddContact}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                borderRadius: '12px',
                background: '#00C4CC',
                borderColor: '#00C4CC',
                color: '#FFF',
                fontWeight: 700,
                fontSize: '0.9rem',
              }}
            >
              <Plus size={16} /> Add Contact
            </Button>
          </div>

          {patient.emergencyContacts && patient.emergencyContacts.length > 0 ? (
            <div style={{ width: '100%', overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '8px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #9FFBFF' }}>
                    <th style={{ textAlign: 'left', padding: '12px', color: '#2D9D9C', fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase' }}>Name</th>
                    <th style={{ textAlign: 'left', padding: '12px', color: '#2D9D9C', fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase' }}>Relationship</th>
                    <th style={{ textAlign: 'left', padding: '12px', color: '#2D9D9C', fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase' }}>Phone</th>
                    <th style={{ textAlign: 'right', padding: '12px', color: '#2D9D9C', fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {patient.emergencyContacts.map((contact) => (
                    <tr key={contact.id} style={{ borderBottom: '1px solid rgba(159, 251, 255, 0.6)' }}>
                      <td style={{ padding: '14px 12px', fontWeight: 700, color: '#102B2D', fontSize: '0.95rem' }}>
                        {contact.name}
                      </td>
                      <td style={{ padding: '14px 12px', color: '#2D9D9C', fontSize: '0.9rem', fontWeight: 500 }}>
                        {contact.relationship}
                      </td>
                      <td style={{ padding: '14px 12px', color: '#102B2D', fontSize: '0.9rem', fontWeight: 600 }}>
                        {contact.phone}
                      </td>
                      <td style={{ padding: '14px 12px', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '8px', justifyContent: 'flex-end' }}>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEditContact(contact)}
                            aria-label={`Edit contact ${contact.name}`}
                            style={{ padding: '6px 10px', borderRadius: '8px', borderColor: '#2D9D9C', color: '#2D9D9C' }}
                          >
                            <Edit2 size={14} />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setContactToDelete(contact)}
                            aria-label={`Delete contact ${contact.name}`}
                            style={{ padding: '6px 10px', borderRadius: '8px', borderColor: 'var(--color-semantic-emergency)', color: 'var(--color-semantic-emergency)' }}
                          >
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p style={{ margin: '12px 0 0', color: '#2D9D9C', fontStyle: 'italic', fontSize: '0.9rem' }}>
              No emergency contacts recorded. Use the button above to register a contact.
            </p>
          )}
        </Card>
      </section>

      {/* PREVIOUS HEALTH ASSESSMENTS / HISTORY */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: '16px' }} aria-labelledby="assessment-history-title">
        <Card style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <div style={iconCircleStyle}><Clock size={20} /></div>
            <div>
              <h2 id="assessment-history-title" style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: '#102B2D', fontFamily: 'Outfit, sans-serif' }}>
                Health History & Previous Assessments
              </h2>
              <p style={{ margin: '2px 0 0', color: '#2D9D9C', fontSize: '0.85rem' }}>
                Persisted clinical triage records linked to your health passport.
              </p>
            </div>
          </div>

          {assessmentsQuery.isLoading ? (
            <p style={{ color: '#2D9D9C', fontSize: '0.9rem', fontStyle: 'italic' }}>Loading health history…</p>
          ) : assessmentsQuery.data && assessmentsQuery.data.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 260px), 1fr))', gap: '14px' }}>
              {assessmentsQuery.data.map((item: any) => {
                const badge = urgencyBadgeStyle(item.urgency);
                return (
                  <div
                    key={item.id}
                    style={{
                      padding: '16px',
                      borderRadius: '12px',
                      background: 'rgba(255, 255, 255, 0.6)',
                      border: '1px solid #9FFBFF',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.8rem', color: '#2D9D9C', fontWeight: 600 }}>
                        {new Date(item.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                      <span
                        style={{
                          padding: '2px 8px',
                          borderRadius: '6px',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          background: badge.bg,
                          color: badge.color,
                          border: badge.border,
                        }}
                      >
                        {item.urgency}
                      </span>
                    </div>
                    <strong style={{ fontSize: '0.92rem', color: '#102B2D', fontWeight: 700 }}>
                      {item.specialty}
                    </strong>
                    <p style={{ margin: 0, fontSize: '0.82rem', color: '#102B2D', opacity: 0.8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.symptoms}
                    </p>
                  </div>
                );
              })}
            </div>
          ) : (
            <p style={{ color: '#2D9D9C', fontSize: '0.9rem', fontStyle: 'italic', margin: 0 }}>
              No previous health assessments recorded. Completed assessments will automatically link here.
            </p>
          )}
        </Card>
      </section>

      {/* MODAL: ADD / EDIT EMERGENCY CONTACT */}
      <Popup
        isOpen={isContactModalOpen}
        onClose={closeContactModal}
        title={contactDraft.id ? 'Edit Emergency Contact' : 'Add Emergency Contact'}
        maxWidth="500px"
      >
        <form onSubmit={handleSaveContact} style={{ display: 'flex', flexDirection: 'column', gap: '16px', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
          {contactError && (
            <div
              role="alert"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 14px',
                background: 'rgba(220, 38, 38, 0.08)',
                border: '1px solid rgba(220, 38, 38, 0.25)',
                borderRadius: '10px',
                color: 'var(--color-semantic-emergency)',
                fontSize: '0.88rem',
              }}
            >
              <AlertCircle size={18} style={{ flexShrink: 0 }} />
              <span>{contactError}</span>
            </div>
          )}

          <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#102B2D' }}>
              Contact Name <span style={{ color: 'var(--color-semantic-emergency)' }}>*</span>
            </span>
            <Input
              type="text"
              required
              value={contactDraft.name}
              onChange={(e) => setContactDraft({ ...contactDraft, name: e.target.value })}
              placeholder="e.g. Sarah Jenkins"
              style={{ borderRadius: '10px', borderColor: '#9FFBFF' }}
            />
          </label>

          <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#102B2D' }}>
              Relationship <span style={{ color: 'var(--color-semantic-emergency)' }}>*</span>
            </span>
            <Input
              type="text"
              required
              value={contactDraft.relationship}
              onChange={(e) => setContactDraft({ ...contactDraft, relationship: e.target.value })}
              placeholder="e.g. Spouse, Parent, Sibling, Friend"
              style={{ borderRadius: '10px', borderColor: '#9FFBFF' }}
            />
          </label>

          <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#102B2D' }}>
              Phone Number <span style={{ color: 'var(--color-semantic-emergency)' }}>*</span>
            </span>
            <Input
              type="tel"
              required
              value={contactDraft.phone}
              onChange={(e) => setContactDraft({ ...contactDraft, phone: e.target.value })}
              placeholder="e.g. +91 98765 43210"
              style={{ borderRadius: '10px', borderColor: '#9FFBFF' }}
            />
          </label>

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '8px' }}>
            <Button
              type="button"
              variant="outline"
              onClick={closeContactModal}
              disabled={isSavingContact}
              style={{ borderRadius: '10px' }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isSavingContact}
              style={{ borderRadius: '10px', background: '#00C4CC', borderColor: '#00C4CC', color: '#FFF', fontWeight: 700 }}
            >
              {isSavingContact ? 'Saving…' : (contactDraft.id ? 'Save Contact' : 'Add Contact')}
            </Button>
          </div>
        </form>
      </Popup>

      {/* MODAL: DELETE CONTACT CONFIRMATION */}
      <Popup
        isOpen={Boolean(contactToDelete)}
        onClose={() => setContactToDelete(null)}
        title="Delete Emergency Contact"
        maxWidth="440px"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
          {deleteError && (
            <div
              role="alert"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 14px',
                background: 'rgba(220, 38, 38, 0.08)',
                border: '1px solid rgba(220, 38, 38, 0.25)',
                borderRadius: '10px',
                color: 'var(--color-semantic-emergency)',
                fontSize: '0.88rem',
              }}
            >
              <AlertCircle size={18} style={{ flexShrink: 0 }} />
              <span>{deleteError}</span>
            </div>
          )}

          <p style={{ margin: 0, fontSize: '0.95rem', color: '#102B2D', lineHeight: 1.5 }}>
            Are you sure you want to remove <strong>{contactToDelete?.name}</strong> ({contactToDelete?.relationship}) from your emergency contacts?
          </p>

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '8px' }}>
            <Button
              type="button"
              variant="outline"
              onClick={() => setContactToDelete(null)}
              disabled={isDeletingContact}
              style={{ borderRadius: '10px' }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="danger"
              onClick={confirmDeleteContact}
              disabled={isDeletingContact}
              style={{ borderRadius: '10px', fontWeight: 700 }}
            >
              {isDeletingContact ? 'Removing…' : 'Remove Contact'}
            </Button>
          </div>
        </div>
      </Popup>

    </div>
  );
};
