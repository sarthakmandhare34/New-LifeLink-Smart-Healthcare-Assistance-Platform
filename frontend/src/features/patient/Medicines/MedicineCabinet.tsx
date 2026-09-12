import React, { useState } from 'react';                                                  // Core React hooks for local component state
import { Card } from '../../../components/ui/Card';                                            // Standard glass/solid card visual container
import { Button } from '../../../components/ui/Button';                                        // Styled touch/click button component
import { Input } from '../../../components/ui/Input';                                          // Styled HTML input field component
import { Badge } from '../../../components/ui/Badge';                                          // Pill badge for medicine status indication
import { Popup } from '../../../components/ui/Popup';                                          // Accessible modal dialog for user confirmations
import { Pill, Plus, Edit2, Trash2 } from 'lucide-react';                                      // Medication and editing icon set
import { trpc } from '../../../lib/trpc';                                                       // Type-safe tRPC client bridge

// Type definition matching medication form data fields entered by the patient
type MedicineForm = {
  name: string;                                                                                 // Commercial or generic medication name
  dosage: string;                                                                               // Prescribed dose strength (e.g., 500mg, 10ml)
  frequency: string;                                                                            // Administration cadence (e.g., Twice daily)
  schedule: string;                                                                             // Specific timing (e.g., After breakfast)
  startDate?: string;                                                                           // Optional therapy commencement date
  endDate?: string;                                                                             // Optional course completion date
  quantity?: number;                                                                            // Remaining pill or liquid container count
  expiry?: string;                                                                              // Packaging expiration date
};

// =========================================================================================
// SMART MEDICINE CABINET COMPONENT
// Manages patient home medication inventory, daily schedules, dosages, and reminders.
// Provides complete CRUD operations (Create, Read, Update, Delete) synchronized via tRPC.
// =========================================================================================
export const MedicineCabinet = () => {
  const trpcUtils = trpc.useUtils();                                                            // Client cache manager to trigger automatic UI refetches
  const medicinesQuery = trpc.patientMedicine.list.useQuery();                                  // Fetches user's current active medication list
  const createMedicine = trpc.patientMedicine.create.useMutation();                             // API mutation to persist a new medication
  const updateMedicine = trpc.patientMedicine.update.useMutation();                             // API mutation to update an existing medication record
  const removeMedicine = trpc.patientMedicine.remove.useMutation();                             // API mutation to delete a medication from the cabinet

  // Local state for modals, forms, and network flight indicators
  const [showForm, setShowForm] = useState(false);                                              // Controls visibility of add/edit medication drawer
  const [editingId, setEditingId] = useState<number | null>(null);                              // Tracks whether form is in 'Edit' mode (ID set) or 'Add' mode (null)
  const [formData, setFormData] = useState<MedicineForm>({ name: '', dosage: '', frequency: '', schedule: '' }); // Active form input state
  const [isProcessing, setIsProcessing] = useState(false);                                      // Disables form submit button while mutation is running
  const [processingId, setProcessingId] = useState<number | null>(null);                        // Highlights individual card currently being removed
  const [medicineToRemove, setMedicineToRemove] = useState<number | null>(null);                // Target ID for confirmation popup before deletion
  const [mutationError, setMutationError] = useState('');                                       // Displays friendly inline error banner on network failures

  // Render loading skeleton/message while fetching initial medication list
  if (medicinesQuery.isLoading) return <div className="flex items-center justify-center h-full"><p className="caption">Loading medicines…</p></div>;
  const activeMedicines = medicinesQuery.data ?? [];                                            // Fallback to empty array if no medicines returned

  // Open blank form for adding a new medication
  const handleOpenAdd = () => {
    setMutationError('');                                                                       // Clear previous error messages
    setFormData({ name: '', dosage: '', frequency: '', schedule: '' });                         // Reset form inputs to blank defaults
    setEditingId(null);                                                                         // Signal create mode
    setShowForm(true);                                                                          // Reveal the form container
  };

  // Populate form with existing medicine data for editing
  const handleOpenEdit = (med: (typeof activeMedicines)[number]) => {
    setMutationError('');                                                                       // Clear error state
    setFormData({
      name: med.name,                                                                           // Pre-fill name
      dosage: med.dosage,                                                                       // Pre-fill dosage
      frequency: med.frequency,                                                                 // Pre-fill frequency
      schedule: med.schedule,                                                                   // Pre-fill schedule
      startDate: med.startDate ?? undefined,                                                    // Optional start date
      endDate: med.endDate ?? undefined,                                                        // Optional end date
      quantity: med.quantity ?? undefined,                                                      // Optional quantity
      expiry: med.expiry ?? undefined,                                                          // Optional expiry
    });
    setEditingId(med.id);                                                                       // Set active target medication ID
    setShowForm(true);                                                                          // Display the edit form
  };

  // Submit handler for both Create and Update operations
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();                                                                         // Prevent native browser page reload
    setIsProcessing(true);                                                                      // Set in-flight processing state
    setMutationError('');                                                                       // Reset error container
    try {
      if (editingId) {
        await updateMedicine.mutateAsync({ id: editingId, values: formData });                  // Execute update mutation on backend
      } else {
        await createMedicine.mutateAsync(formData);                                             // Execute create mutation on backend
      }
      await trpcUtils.patientMedicine.list.invalidate();                                        // Refresh medicine list cache
      await trpcUtils.patientDashboard.summary.invalidate();                                     // Refresh patient dashboard stats cache
      setShowForm(false);                                                                       // Close form drawer upon success
    } catch (error: unknown) {
      setMutationError(error instanceof Error ? error.message : 'Unable to save this medicine. Please try again.'); // Display server error message
    } finally {
      setIsProcessing(false);                                                                   // Re-enable form interactions
    }
  };

  // Trigger modal confirmation popup before deleting a medicine
  const requestRemove = (id: number) => {
    setMedicineToRemove(id);                                                                    // Open confirmation modal for this medicine ID
  };

  // Confirm and execute medication deletion
  const confirmRemove = async () => {
    if (medicineToRemove === null) return;                                                      // Guard against invalid null ID
    const id = medicineToRemove;                                                                // Snapshot target ID
    setMedicineToRemove(null);                                                                  // Close confirmation dialog
    setProcessingId(id);                                                                        // Mark card as deleting (dimmed)
    setMutationError('');                                                                       // Reset error state
    try {
      await removeMedicine.mutateAsync({ id });                                                 // Send delete request to backend
      await trpcUtils.patientMedicine.list.invalidate();                                        // Invalidate list cache to trigger re-render
      await trpcUtils.patientDashboard.summary.invalidate();                                     // Invalidate dashboard summary counters
    } catch (error: unknown) {
      setMutationError(error instanceof Error ? error.message : 'Unable to remove this medicine. Please try again.'); // Capture error
    } finally {
      setProcessingId(null);                                                                    // Reset processing spinner
    }
  };

  return (
    <div className="container" style={{ padding: 0 }}>
      {/* Header section with icon, title, and action button */}
      <header className="mb-4 flex flex-wrap justify-between items-start gap-3">
        <div className="flex items-center gap-3">
          <div style={{ width: 44, height: 44, borderRadius: '14px', background: 'rgba(0,27,48,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Pill size={24} color="var(--color-primary)" />                                     {/* Medication pill icon */}
          </div>
          <div>
            <h1 style={{ margin: 0 }}>Smart Medicine Cabinet</h1>                               {/* Page main title */}
            <p className="caption">Manage active medications, schedules, and stock alerts.</p>  {/* Subtitle description */}
          </div>
        </div>
        {!showForm && (
          <Button variant="primary" onClick={handleOpenAdd}>
            <Plus size={16} /> Add Medication                                                   {/* Open new medication form */}
          </Button>
        )}
      </header>

      {/* Network or validation error display banner */}
      {mutationError && <div className="alert-panel mb-4"><span className="caption">{mutationError}</span></div>}

      {/* Inline medication entry / edit form */}
      {showForm && (
        <Card variant="glass" className="mb-4">
          <form onSubmit={handleSubmit} className="flex-col gap-3">
            <h3 style={{ margin: 0 }}>{editingId ? 'Edit Medication Record' : 'Add New Medication'}</h3>
            <div>
              <label htmlFor="medicine-name" style={{ display: 'block', marginBottom: '4px', fontWeight: 600, fontSize: 'var(--text-caption)' }}>Medicine Name</label>
              <Input id="medicine-name" type="text" value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} required placeholder="E.g., Lisinopril, Amoxicillin..." />
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <div style={{ flex: 1 }}>
                <label htmlFor="medicine-dosage" style={{ display: 'block', marginBottom: '4px', fontWeight: 600, fontSize: 'var(--text-caption)' }}>Dosage</label>
                <Input id="medicine-dosage" type="text" value={formData.dosage || ''} onChange={e => setFormData({...formData, dosage: e.target.value})} placeholder="e.g. 10mg" required />
              </div>
              <div style={{ flex: 1 }}>
                <label htmlFor="medicine-schedule" style={{ display: 'block', marginBottom: '4px', fontWeight: 600, fontSize: 'var(--text-caption)' }}>Schedule</label>
                <Input id="medicine-schedule" type="text" value={formData.schedule || ''} onChange={e => setFormData({...formData, schedule: e.target.value})} placeholder="e.g. Morning, Daily" required />
              </div>
            </div>
            <div>
              <label htmlFor="medicine-frequency" style={{ display: 'block', marginBottom: '4px', fontWeight: 600, fontSize: 'var(--text-caption)' }}>Frequency</label>
              <Input id="medicine-frequency" type="text" value={formData.frequency || ''} onChange={e => setFormData({...formData, frequency: e.target.value})} placeholder="e.g. Once daily" required />
            </div>
            {/* Form action buttons */}
            <div className="flex gap-2 mt-2">
              <Button type="button" variant="outline" onClick={() => setShowForm(false)} disabled={isProcessing}>Cancel</Button>
              <Button type="submit" variant="primary" disabled={isProcessing}>
                {isProcessing ? 'Processing...' : 'Save Medication'}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Responsive Grid layout for Medicine Cards */}
      <div className="responsive-list-grid">
        {activeMedicines.map((med) => (
            <Card 
              key={med.id}                                                                      // Unique medication record ID
              variant="solid" 
              style={{ 
                height: '100%', 
                borderLeft: '4px solid var(--color-success)',                                   // Visual green indicator for active regimen
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                opacity: processingId === med.id ? 0.5 : 1                                      // Dimmed when being removed
              }}
            >
              <div>
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <Pill color="var(--color-primary)" size={20} />
                    <h3 style={{ margin: 0 }}>{med.name}</h3>
                  </div>
                  <Badge status="success">Active</Badge>                                        {/* Status badge */}
                </div>

                {/* Dosage and scheduling details badge group */}
                <div className="flex flex-wrap gap-4 mt-3" style={{ background: 'var(--color-background)', padding: 'var(--spacing-2) var(--spacing-3)', borderRadius: 'var(--border-radius-sm)' }}>
                  <div>
                    <span className="caption">Dosage</span>
                    <div style={{ fontWeight: 600 }}>{med.dosage}</div>
                  </div>
                  <div>
                    <span className="caption">Schedule</span>
                    <div style={{ fontWeight: 600 }}>{med.schedule}</div>
                  </div>
                  <div>
                    <span className="caption">Frequency</span>
                    <div style={{ fontWeight: 600 }}>{med.frequency}</div>
                  </div>
                </div>
              </div>

              {/* Action buttons: Edit and Remove */}
              <div className="flex gap-2 mt-4 pt-2" style={{ borderTop: '1px solid var(--color-border)', flexWrap: 'wrap' }}>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleOpenEdit(med)}                                           // Open edit drawer
                  disabled={processingId === med.id}
                  aria-label={`Edit ${med.name}`}
                >
                  <Edit2 size={14} /> Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => requestRemove(med.id)}                                         // Request deletion confirmation
                  disabled={processingId === med.id}
                  aria-label={`Remove ${med.name} from cabinet`}
                >
                  <Trash2 size={14} /> {processingId === med.id ? 'Removing...' : 'Remove'}
                </Button>
              </div>
            </Card>
        ))}

        {/* Empty state message when cabinet has 0 items */}
        {activeMedicines.length === 0 && (
          <Card variant="glass" style={{ textAlign: 'center', padding: 'var(--spacing-6)' }}>
            <p className="text-muted" style={{ margin: 0 }}>No active medications in cabinet.</p>
          </Card>
        )}
      </div>

      {/* Deletion confirmation popup dialog */}
      <Popup isOpen={medicineToRemove !== null} onClose={() => setMedicineToRemove(null)} title="Remove Medicine" maxWidth="400px">
        <div className="flex-col gap-4">
          <p>Are you sure you want to remove this medication from your cabinet?</p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '16px', flexWrap: 'wrap' }}>
            <Button variant="outline" onClick={() => setMedicineToRemove(null)}>Cancel</Button>
            <Button variant="danger" onClick={confirmRemove}>Remove</Button>
          </div>
        </div>
      </Popup>
    </div>
  );
};
