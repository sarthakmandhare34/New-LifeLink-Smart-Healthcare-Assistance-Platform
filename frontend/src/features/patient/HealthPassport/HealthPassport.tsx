import React, { useEffect, useState } from 'react';                                        // Core React hooks for component state & side effects
import { Card } from '../../../components/ui/Card';                                            // Reusable glassmorphic UI card container
import { Badge } from '../../../components/ui/Badge';                                          // Small indicator badge component
import { Button } from '../../../components/ui/Button';                                        // Interactive styled button component
import { Input } from '../../../components/ui/Input';                                          // Styled text input field
import { Popup } from '../../../components/ui/Popup';                                          // Accessible modal dialog popup
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
} from 'lucide-react';                                                                          // Comprehensive healthcare and navigation icons
import { trpc } from '../../../lib/trpc';                                                       // Type-safe client RPC gateway

// Clinically permissible blood group enumerations recognized by the emergency triage engine
const VALID_BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] as const;        // Standard ABO/Rh blood groups

// Data shape for drafting a new or updated emergency contact
type EmergencyContactDraft = {
  id?: string;                                                                                  // Optional identifier present only during updates
  name: string;                                                                                 // Full legal name of the emergency contact
  relationship: string;                                                                         // Familial or personal bond (e.g. Spouse, Parent)
  phone: string;                                                                                // Verified telephone number with country prefix
};

// Data shape for an emergency contact returned by the backend database
type EmergencyContactItem = {
  id: string;                                                                                  // Database unique primary key
  name: string;                                                                                 // Contact's name
  relationship: string;                                                                         // Relationship string
  phone: string;                                                                                // Contact telephone string
};

// Helper returning dynamic CSS color styles based on clinical triage urgency level
function urgencyBadgeStyle(urgency: string) {
  if (urgency === 'EMERGENCY') {                                                                // Immediate high-priority emergency
    return { bg: 'rgba(220, 38, 38, 0.12)', color: 'var(--color-semantic-emergency)', border: '1px solid rgba(220, 38, 38, 0.2)' };
  }
  if (urgency === 'MODERATE') {                                                                 // Moderate urgency requiring prompt care
    return { bg: 'rgba(217, 119, 6, 0.12)', color: 'var(--color-semantic-warning)', border: '1px solid rgba(217, 119, 6, 0.2)' };
  }
  if (urgency === 'ERROR') {                                                                    // Assessment parsing or routing error
    return { bg: 'rgba(225, 29, 72, 0.12)', color: '#e11d48', border: '1px solid rgba(225, 29, 72, 0.2)' };
  }
  return { bg: 'rgba(13, 148, 136, 0.12)', color: 'var(--color-semantic-success)', border: '1px solid rgba(13, 148, 136, 0.2)' }; // Routine standard care
}

// =========================================================================================
// DIGITAL HEALTH PASSPORT COMPONENT
// Acts as the patient's personal, portable electronic health record (EHR).
// Displays vital baseline facts (blood group, known allergies, pre-existing conditions),
// emergency contact roster, and past AI diagnostic assessments.
// =========================================================================================
export const HealthPassport = () => {
  const trpcUtils = trpc.useUtils();                                                            // Client query cache invalidation utility
  const profileQuery = trpc.patientProfile.get.useQuery();                                      // Retrieves patient profile, medical info & contacts
  const assessmentsQuery = trpc.assessment.list.useQuery();                                     // Retrieves historical symptom assessments

  // Server-side mutation hooks for updating records
  const updateMutation = trpc.patientProfile.update.useMutation();                             // Updates blood group, allergies, conditions
  const createEmergencyContactMutation = trpc.patientProfile.emergencyContacts.create.useMutation(); // Adds new contact to DB
  const updateEmergencyContactMutation = trpc.patientProfile.emergencyContacts.update.useMutation(); // Edits existing contact in DB
  const removeEmergencyContactMutation = trpc.patientProfile.emergencyContacts.remove.useMutation(); // Deletes contact from DB

  // Health Passport Clinical Baseline Edit state
  const [isEditing, setIsEditing] = useState(false);                                            // Controls edit mode toggle for baseline data
  const [isSaving, setIsSaving] = useState(false);                                              // Loading spinner state while saving changes
  const [passportError, setPassportError] = useState('');                                       // Error message banner for passport modifications
  const [bloodGroup, setBloodGroup] = useState('');                                             // Controlled input state for selected blood group
  const [allergies, setAllergies] = useState('');                                               // Comma-separated allergies input string
  const [conditions, setConditions] = useState('');                                             // Comma-separated pre-existing conditions input string

  // Emergency Contact Modal state
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);                          // Modal visibility toggle
  const [contactDraft, setContactDraft] = useState<EmergencyContactDraft>({ name: '', relationship: '', phone: '' }); // Form draft state
  const [contactError, setContactError] = useState('');                                         // Modal validation error text
  const [isSavingContact, setIsSavingContact] = useState(false);                                // Spinner state while creating/editing contact

  // Delete Contact confirmation state
  const [contactToDelete, setContactToDelete] = useState<EmergencyContactItem | null>(null);   // Contact currently targeted for deletion
  const [isDeletingContact, setIsDeletingContact] = useState(false);                            // Deletion in-flight status flag
  const [deleteError, setDeleteError] = useState('');                                           // Error banner for failed contact deletion

  // Synchronize local form inputs whenever backend profile query refreshes
  useEffect(() => {
    if (!profileQuery.data) return;                                                             // Wait until profile query resolves
    setBloodGroup(profileQuery.data.bloodGroup || '');                                          // Set current blood group
    setAllergies(profileQuery.data.allergies.join(', '));                                       // Format allergies array into readable string
    setConditions(profileQuery.data.conditions.join(', '));                                     // Format conditions array into readable string
  }, [profileQuery.data]);

  // Loading skeleton state
  if (profileQuery.isLoading) {                                                                 // Show spinner while fetching profile
    return (
      <div className="flex items-center justify-center" style={{ minHeight: '50vh' }}>
        <p className="caption" style={{ color: '#2D9D9C' }}>Loading Health Passport…</p>         {/* Friendly loading message */}
      </div>
    );
  }

  // Error boundary state if profile cannot be retrieved
  if (!profileQuery.data) {                                                                     // Handle unauthorized or missing profile
    return (
      <div className="flex items-center justify-center" style={{ minHeight: '50vh' }}>
        <p className="caption" style={{ color: 'var(--color-semantic-emergency)' }}>
          Health Passport could not be loaded. Please refresh your browser.
        </p>
      </div>
    );
  }

  const patient = profileQuery.data;                                                            // Active patient data record

  // Passport Edit Handlers: open form
  const handleEditClick = () => {
    setPassportError('');                                                                       // Clear past error alerts
    setBloodGroup(patient.bloodGroup || '');                                                    // Seed blood group
    setAllergies(patient.allergies.join(', '));                                                 // Seed allergies
    setConditions(patient.conditions.join(', '));                                               // Seed conditions
    setIsEditing(true);                                                                         // Turn on edit mode
  };

  // Passport Edit Handlers: cancel changes and revert to original values
  const handleCancelPassportEdit = () => {
    setPassportError('');                                                                       // Reset error
    setBloodGroup(patient.bloodGroup || '');                                                    // Restore blood group
    setAllergies(patient.allergies.join(', '));                                                 // Restore allergies
    setConditions(patient.conditions.join(', '));                                               // Restore conditions
    setIsEditing(false);                                                                        // Turn off edit mode
  };

  // Passport Edit Handlers: commit changes to server
  const handleSavePassport = async () => {
    setIsSaving(true);                                                                          // Engage button spinner
    setPassportError('');                                                                       // Clear errors
    try {
      await updateMutation.mutateAsync({
        bloodGroup: bloodGroup.trim() || undefined,                                             // Send cleaned blood group
        allergies: allergies.split(',').map(s => s.trim()).filter(Boolean),                     // Split string by commas into array of trimmed strings
        conditions: conditions.split(',').map(s => s.trim()).filter(Boolean),                   // Split conditions into array of trimmed strings
      });
      await trpcUtils.patientProfile.get.invalidate();                                          // Force refresh of profile queries
      await trpcUtils.patientDashboard.summary.invalidate();                                     // Force refresh of dashboard health counters
      setIsEditing(false);                                                                      // Exit edit mode on success
    } catch (e: any) {
      setPassportError(e?.message || 'Failed to update Health Passport. Please try again.');     // Display user-friendly error message
    } finally {
      setIsSaving(false);                                                                       // Release saving indicator
    }
  };

  // Contact Modal Handlers: open blank modal
  const openAddContact = () => {
    setContactError('');                                                                        // Clear errors
    setContactDraft({ name: '', relationship: '', phone: '' });                                 // Reset modal form
    setIsContactModalOpen(true);                                                                // Display modal
  };

  // Contact Modal Handlers: open modal with existing contact details
  const openEditContact = (contact: EmergencyContactItem) => {
    setContactError('');                                                                        // Clear errors
    setContactDraft({
      id: contact.id,                                                                           // Track editing contact's DB id
      name: contact.name,                                                                       // Populate name
      relationship: contact.relationship,                                                       // Populate relationship
      phone: contact.phone,                                                                     // Populate telephone
    });
    setIsContactModalOpen(true);                                                                // Open modal
  };

  // Contact Modal Handlers: close modal
  const closeContactModal = () => {
    setIsContactModalOpen(false);                                                               // Hide modal
    setContactDraft({ name: '', relationship: '', phone: '' });                                 // Wipe draft fields
    setContactError('');                                                                        // Clear errors
  };

  // Contact Modal Handlers: save contact to backend
  const handleSaveContact = async (e: React.FormEvent) => {
    e.preventDefault();                                                                         // Prevent form submission refresh
    const name = contactDraft.name.trim();                                                      // Clean name
    const relationship = contactDraft.relationship.trim();                                      // Clean relationship
    const phone = contactDraft.phone.trim();                                                    // Clean phone number

    if (!name || !relationship || !phone) {                                                     // Validate required inputs
      setContactError('Please fill out the contact name, relationship, and phone number.');
      return;
    }

    setIsSavingContact(true);                                                                   // Turn on saving state
    setContactError('');                                                                        // Clear errors
    try {
      if (contactDraft.id) {
        await updateEmergencyContactMutation.mutateAsync({
          id: Number(contactDraft.id),                                                          // Target existing contact ID
          values: { name, relationship, phone },                                                // New contact details
        });
      } else {
        await createEmergencyContactMutation.mutateAsync({ name, relationship, phone });        // Create new contact record
      }
      await trpcUtils.patientProfile.get.invalidate();                                          // Re-fetch patient contacts
      await trpcUtils.patientDashboard.summary.invalidate();                                     // Re-fetch dashboard overview
      closeContactModal();                                                                      // Close dialog on success
    } catch (error: any) {
      setContactError(error?.message || 'The emergency contact could not be saved. Please check the contact number and try again.');
    } finally {
      setIsSavingContact(false);                                                                // Release saving state
    }
  };

  // Contact Delete Handlers: confirm and delete from database
  const confirmDeleteContact = async () => {
    if (!contactToDelete) return;                                                               // Guard against empty state
    setIsDeletingContact(true);                                                                 // Turn on deleting flag
    setDeleteError('');                                                                         // Clear errors
    try {
      await removeEmergencyContactMutation.mutateAsync({ id: Number(contactToDelete.id) });      // Send deletion request to backend
      await trpcUtils.patientProfile.get.invalidate();                                          // Update local cache
      await trpcUtils.patientDashboard.summary.invalidate();                                     // Refresh summary cards
      setContactToDelete(null);                                                                 // Dismiss confirmation modal
    } catch (err: any) {
      setDeleteError(err?.message || 'Failed to remove contact. Please try again.');             // Display error
    } finally {
      setIsDeletingContact(false);                                                              // Clear deleting flag
    }
  };

  // Uniform glassmorphic card styling configuration
  const cardStyle = {
    background: '#E6F9FC',                                                                      // Soft medical cyan background
    padding: '24px',                                                                            // Generous comfortable padding
    borderRadius: '16px',                                                                       // Smooth curved corners
    border: '1px solid #9FFBFF',                                                                // Cyan accent border
    boxShadow: '0 4px 16px rgba(16, 43, 45, 0.04)',                                            // Subtle depth shadow
    display: 'flex',
    flexDirection: 'column' as const,
  };

  // Icon container badge styling configuration
  const iconCircleStyle = {
    width: '40px',                                                                              // Fixed square dimensions
    height: '40px',
    borderRadius: '12px',                                                                       // Rounded square shape
    background: 'rgba(0, 196, 204, 0.15)',                                                      // Translucent brand cyan fill
    display: 'grid',
    placeItems: 'center',                                                                       // Perfectly center the icon
    color: '#00C4CC',                                                                           // Brand vibrant cyan color
    flexShrink: 0,
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
      
      {/* Header with Title and Edit Toggle */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'rgba(0, 196, 204, 0.15)', display: 'grid', placeItems: 'center', color: '#00C4CC', flexShrink: 0 }}>
            <FileHeart size={26} />                                                             {/* Medical passport icon */}
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

        {/* Action button toggling edit or save modes */}
        {!isEditing ? (
          <Button
            variant="outline"                                                                   // Outline button
            onClick={handleEditClick}                                                           // Switch into edit mode
            style={{ display: 'flex', gap: '8px', alignItems: 'center', borderRadius: '12px', borderColor: '#00C4CC', color: '#00C4CC', fontWeight: 600 }}
          >
            <Edit2 size={16} /> Edit Passport                                                   {/* Edit button */}
          </Button>
        ) : (
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <Button
              variant="outline"
              onClick={handleCancelPassportEdit}                                                // Revert unsaved edits
              disabled={isSaving}
              style={{ display: 'flex', gap: '6px', alignItems: 'center', borderRadius: '12px' }}
            >
              <X size={16} /> Cancel                                                            {/* Cancel button */}
            </Button>
            <Button
              variant="primary"
              onClick={handleSavePassport}                                                      // Commit changes
              disabled={isSaving}
              style={{ display: 'flex', gap: '6px', alignItems: 'center', borderRadius: '12px', background: '#00C4CC', borderColor: '#00C4CC', color: '#FFF', fontWeight: 700 }}
            >
              <Save size={16} /> {isSaving ? 'Saving…' : 'Save Changes'}                        {/* Save button */}
            </Button>
          </div>
        )}
      </header>

      {/* Error alert banner */}
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

      {/* =====================================================================================
          TOP ROW: Blood Group, Allergies, Existing Conditions Cards
          ===================================================================================== */}
      <section
        style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: '20px' }}
        aria-label="Core clinical information"
      >
        {/* Blood Group Card */}
        <Card style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={iconCircleStyle}><Droplets size={20} /></div>                         {/* Blood droplet icon */}
              <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#102B2D', fontFamily: 'Outfit, sans-serif' }}>
                Blood Group
              </h2>
            </div>
            {isEditing && <span style={{ fontSize: '0.78rem', color: '#2D9D9C', fontWeight: 600 }}>Editing</span>}
          </div>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', minHeight: '90px' }}>
            {isEditing ? (
              <label htmlFor="health-passport-blood-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <span style={{ fontSize: '0.82rem', color: '#2D9D9C', fontWeight: 600 }}>Select Blood Group</span>
                <select
                  id="health-passport-blood-group"
                  aria-label="Select Blood Group"
                  value={bloodGroup}
                  onChange={(e) => setBloodGroup(e.target.value)}                               // Update selected blood type
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
                    <option key={bg} value={bg}>{bg}</option>                                   // Standard blood group dropdown choices
                  ))}
                </select>
              </label>
            ) : (
              <div>
                {patient.bloodGroup ? (
                  <strong style={{ fontSize: '2.6rem', color: '#102B2D', lineHeight: 1, fontFamily: 'Outfit, sans-serif', fontWeight: 800 }}>
                    {patient.bloodGroup}                                                        {/* Bold high-contrast blood group display */}
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

        {/* Allergies Card */}
        <Card style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={iconCircleStyle}><ShieldAlert size={20} /></div>                      {/* Warning shield icon */}
              <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#102B2D', fontFamily: 'Outfit, sans-serif' }}>
                Allergies
              </h2>
            </div>
            {isEditing && <span style={{ fontSize: '0.78rem', color: '#2D9D9C', fontWeight: 600 }}>Editing</span>}
          </div>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            {isEditing ? (
              <label htmlFor="health-passport-allergies" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <span style={{ fontSize: '0.82rem', color: '#2D9D9C', fontWeight: 600 }}>Allergies (comma-separated)</span>
                <Input
                  id="health-passport-allergies"
                  type="text"
                  value={allergies}
                  onChange={(e) => setAllergies(e.target.value)}                                // Input string of allergies
                  placeholder="e.g. Penicillin, Peanuts, Latex"
                  style={{ background: '#FFFFFF', borderColor: '#9FFBFF', color: '#102B2D', borderRadius: '12px' }}
                />
              </label>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {patient.allergies && patient.allergies.length > 0 ? (
                  patient.allergies.map((allergy) => (                                          // Render each allergy as a pill badge
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

        {/* Existing Conditions Card */}
        <Card style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={iconCircleStyle}><Activity size={20} /></div>                         {/* Activity/pulse icon */}
              <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#102B2D', fontFamily: 'Outfit, sans-serif' }}>
                Existing Conditions
              </h2>
            </div>
            {isEditing && <span style={{ fontSize: '0.78rem', color: '#2D9D9C', fontWeight: 600 }}>Editing</span>}
          </div>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            {isEditing ? (
              <label htmlFor="health-passport-conditions" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <span style={{ fontSize: '0.82rem', color: '#2D9D9C', fontWeight: 600 }}>Conditions (comma-separated)</span>
                <Input
                  id="health-passport-conditions"
                  type="text"
                  value={conditions}
                  onChange={(e) => setConditions(e.target.value)}                              // Input string of chronic diseases
                  placeholder="e.g. Asthma, Hypertension"
                  style={{ background: '#FFFFFF', borderColor: '#9FFBFF', color: '#102B2D', borderRadius: '12px' }}
                />
              </label>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {patient.conditions && patient.conditions.length > 0 ? (
                  patient.conditions.map((condition) => (                                       // Render each chronic disease as a pill badge
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

      {/* =====================================================================================
          EMERGENCY CONTACTS SECTION
          ===================================================================================== */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: '16px' }} aria-labelledby="emergency-contacts-title">
        <Card style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={iconCircleStyle}><Users size={20} /></div>                            {/* Users icon */}
              <div>
                <h2 id="emergency-contacts-title" style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: '#102B2D', fontFamily: 'Outfit, sans-serif' }}>
                  Emergency Contacts
                </h2>
                <p style={{ margin: '2px 0 0', color: '#2D9D9C', fontSize: '0.85rem' }}>
                  Trusted individuals who can be contacted during an emergency.
                </p>
              </div>
            </div>

            {/* Add contact action button */}
            <Button
              variant="primary"
              onClick={openAddContact}                                                          // Opens create contact dialog
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

          {/* Emergency contacts tabular roster */}
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
                        {contact.name}                                                          {/* Contact full name */}
                      </td>
                      <td style={{ padding: '14px 12px', color: '#2D9D9C', fontSize: '0.9rem', fontWeight: 500 }}>
                        {contact.relationship}                                                  {/* Relationship label */}
                      </td>
                      <td style={{ padding: '14px 12px', color: '#102B2D', fontSize: '0.9rem', fontWeight: 600 }}>
                        {contact.phone}                                                         {/* Telephone number */}
                      </td>
                      <td style={{ padding: '14px 12px', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '8px', justifyContent: 'flex-end' }}>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEditContact(contact)}                            // Opens edit modal for this contact
                            aria-label={`Edit contact ${contact.name}`}
                            style={{ padding: '6px 10px', borderRadius: '8px', borderColor: '#2D9D9C', color: '#2D9D9C' }}
                          >
                            <Edit2 size={14} />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setContactToDelete(contact)}                         // Opens delete confirmation modal
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

      {/* =====================================================================================
          PREVIOUS HEALTH ASSESSMENTS / HISTORY
          ===================================================================================== */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: '16px' }} aria-labelledby="assessment-history-title">
        <Card style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <div style={iconCircleStyle}><Clock size={20} /></div>                              {/* Clock / history icon */}
            <div>
              <h2 id="assessment-history-title" style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: '#102B2D', fontFamily: 'Outfit, sans-serif' }}>
                Health History & Previous Assessments
              </h2>
              <p style={{ margin: '2px 0 0', color: '#2D9D9C', fontSize: '0.85rem' }}>
                Persisted clinical triage records linked to your health passport.
              </p>
            </div>
          </div>

          {/* Past assessments grid */}
          {assessmentsQuery.isLoading ? (
            <p style={{ color: '#2D9D9C', fontSize: '0.9rem', fontStyle: 'italic' }}>Loading health history…</p>
          ) : assessmentsQuery.data && assessmentsQuery.data.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 260px), 1fr))', gap: '14px' }}>
              {assessmentsQuery.data.map((item: any) => {
                const badge = urgencyBadgeStyle(item.urgency);                                  // Calculate styling based on urgency tier
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
                        {item.urgency}                                                          {/* Urgency indicator tag */}
                      </span>
                    </div>
                    <strong style={{ fontSize: '0.92rem', color: '#102B2D', fontWeight: 700 }}>
                      {item.specialty}                                                          {/* Recommended triage specialty */}
                    </strong>
                    <p style={{ margin: 0, fontSize: '0.82rem', color: '#102B2D', opacity: 0.8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.symptoms}                                                           {/* Patient symptoms description summary */}
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

      {/* =====================================================================================
          MODAL: ADD / EDIT EMERGENCY CONTACT
          ===================================================================================== */}
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

          {/* Contact Full Legal Name */}
          <label htmlFor="emergency-contact-name" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#102B2D' }}>
              Contact Name <span style={{ color: 'var(--color-semantic-emergency)' }}>*</span>
            </span>
            <Input
              id="emergency-contact-name"
              type="text"
              required
              value={contactDraft.name}
              onChange={(e) => setContactDraft({ ...contactDraft, name: e.target.value })}
              placeholder="e.g. Sarah Jenkins"
              style={{ borderRadius: '10px', borderColor: '#9FFBFF' }}
            />
          </label>

          {/* Contact Relationship to Patient */}
          <label htmlFor="emergency-contact-relationship" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#102B2D' }}>
              Relationship <span style={{ color: 'var(--color-semantic-emergency)' }}>*</span>
            </span>
            <Input
              id="emergency-contact-relationship"
              type="text"
              required
              value={contactDraft.relationship}
              onChange={(e) => setContactDraft({ ...contactDraft, relationship: e.target.value })}
              placeholder="e.g. Spouse, Parent, Sibling, Friend"
              style={{ borderRadius: '10px', borderColor: '#9FFBFF' }}
            />
          </label>

          {/* Contact Verified Telephone */}
          <label htmlFor="emergency-contact-phone" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#102B2D' }}>
              Phone Number <span style={{ color: 'var(--color-semantic-emergency)' }}>*</span>
            </span>
            <Input
              id="emergency-contact-phone"
              type="tel"
              required
              value={contactDraft.phone}
              onChange={(e) => setContactDraft({ ...contactDraft, phone: e.target.value })}
              placeholder="e.g. +91 98765 43210"
              style={{ borderRadius: '10px', borderColor: '#9FFBFF' }}
            />
          </label>

          {/* Form action triggers */}
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '8px', flexWrap: 'wrap' }}>
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

      {/* =====================================================================================
          MODAL: DELETE CONTACT CONFIRMATION
          ===================================================================================== */}
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

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '8px', flexWrap: 'wrap' }}>
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
