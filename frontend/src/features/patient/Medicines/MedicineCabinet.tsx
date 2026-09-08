import React, { useState } from 'react';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Badge } from '../../../components/ui/Badge';
import { Popup } from '../../../components/ui/Popup';
import { Pill, Plus, Edit2, Trash2 } from 'lucide-react';
import { trpc } from '../../../lib/trpc';

type MedicineForm = {
  name: string;
  dosage: string;
  frequency: string;
  schedule: string;
  startDate?: string;
  endDate?: string;
  quantity?: number;
  expiry?: string;
};

export const MedicineCabinet = () => {
  const trpcUtils = trpc.useUtils();
  const medicinesQuery = trpc.patientMedicine.list.useQuery();
  const createMedicine = trpc.patientMedicine.create.useMutation();
  const updateMedicine = trpc.patientMedicine.update.useMutation();
  const removeMedicine = trpc.patientMedicine.remove.useMutation();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<MedicineForm>({ name: '', dosage: '', frequency: '', schedule: '' });
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [medicineToRemove, setMedicineToRemove] = useState<number | null>(null);
  const [mutationError, setMutationError] = useState('');

  if (medicinesQuery.isLoading) return <div className="flex items-center justify-center h-full"><p className="caption">Loading medicines…</p></div>;
  const activeMedicines = medicinesQuery.data ?? [];

  const handleOpenAdd = () => {
    setMutationError('');
    setFormData({ name: '', dosage: '', frequency: '', schedule: '' });
    setEditingId(null);
    setShowForm(true);
  };

  const handleOpenEdit = (med: (typeof activeMedicines)[number]) => {
    setMutationError('');
    setFormData({
      name: med.name,
      dosage: med.dosage,
      frequency: med.frequency,
      schedule: med.schedule,
      startDate: med.startDate ?? undefined,
      endDate: med.endDate ?? undefined,
      quantity: med.quantity ?? undefined,
      expiry: med.expiry ?? undefined,
    });
    setEditingId(med.id);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    setMutationError('');
    try {
      if (editingId) {
        await updateMedicine.mutateAsync({ id: editingId, values: formData });
      } else {
        await createMedicine.mutateAsync(formData);
      }
      await trpcUtils.patientMedicine.list.invalidate();
      await trpcUtils.patientDashboard.summary.invalidate();
      setShowForm(false);
    } catch (error: unknown) {
      setMutationError(error instanceof Error ? error.message : 'Unable to save this medicine. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const requestRemove = (id: number) => {
    setMedicineToRemove(id);
  };

  const confirmRemove = async () => {
    if (medicineToRemove === null) return;
    const id = medicineToRemove;
    setMedicineToRemove(null);
    setProcessingId(id);
    setMutationError('');
    try {
      await removeMedicine.mutateAsync({ id });
      await trpcUtils.patientMedicine.list.invalidate();
      await trpcUtils.patientDashboard.summary.invalidate();
    } catch (error: unknown) {
      setMutationError(error instanceof Error ? error.message : 'Unable to remove this medicine. Please try again.');
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="container" style={{ padding: 0 }}>
      <header className="mb-4 flex flex-wrap justify-between items-start gap-3">
        <div className="flex items-center gap-3">
          <div style={{ width: 44, height: 44, borderRadius: '14px', background: 'rgba(0,27,48,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Pill size={24} color="var(--color-primary)" />
          </div>
          <div>
            <h1 style={{ margin: 0 }}>Smart Medicine Cabinet</h1>
            <p className="caption">Manage active medications, schedules, and stock alerts.</p>
          </div>
        </div>
        {!showForm && (
          <Button variant="primary" onClick={handleOpenAdd}>
            <Plus size={16} /> Add Medication
          </Button>
        )}
      </header>

      {mutationError && <div className="alert-panel mb-4"><span className="caption">{mutationError}</span></div>}

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
              key={med.id}
              variant="solid" 
              style={{ 
                height: '100%', 
                borderLeft: '4px solid var(--color-success)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                opacity: processingId === med.id ? 0.5 : 1
              }}
            >
              <div>
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <Pill color="var(--color-primary)" size={20} />
                    <h3 style={{ margin: 0 }}>{med.name}</h3>
                  </div>
                  <Badge status="success">Active</Badge>
                </div>

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

              <div className="flex gap-2 mt-4 pt-2" style={{ borderTop: '1px solid var(--color-border)' }}>
                <Button variant="secondary" size="sm" onClick={() => handleOpenEdit(med)} disabled={processingId === med.id}>
                  <Edit2 size={14} /> Edit
                </Button>
                <Button variant="outline" size="sm" onClick={() => requestRemove(med.id)} disabled={processingId === med.id}>
                  <Trash2 size={14} /> {processingId === med.id ? 'Removing...' : 'Remove'}
                </Button>
              </div>
            </Card>

        ))}

        {activeMedicines.length === 0 && (
          <Card variant="glass" style={{ textAlign: 'center', padding: 'var(--spacing-6)' }}>
            <p className="text-muted" style={{ margin: 0 }}>No active medications in cabinet.</p>
          </Card>
        )}
      </div>

      <Popup isOpen={medicineToRemove !== null} onClose={() => setMedicineToRemove(null)} title="Remove Medicine" maxWidth="400px">
        <div className="flex-col gap-4">
          <p>Are you sure you want to remove this medication from your cabinet?</p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '16px' }}>
            <Button variant="outline" onClick={() => setMedicineToRemove(null)}>Cancel</Button>
            <Button variant="danger" onClick={confirmRemove}>Remove</Button>
          </div>
        </div>
      </Popup>
    </div>
  );
};
