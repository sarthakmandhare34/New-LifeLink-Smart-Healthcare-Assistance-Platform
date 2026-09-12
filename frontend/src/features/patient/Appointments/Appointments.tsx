import React, { useState } from 'react';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { Popup } from '../../../components/ui/Popup';
import { BentoGrid, BentoItem } from '../../../components/layout/Bento';
import { CheckCircle2, Clock, XCircle, Calendar as CalendarIcon, User } from 'lucide-react';
import { trpc } from '../../../lib/trpc';

// Patient appointments management page displaying upcoming visits and cancellation workflow
export const Appointments = () => {
  const trpcUtils = trpc.useUtils();                                                       // Cache invalidation client
  const appointmentsQuery = trpc.patientAppointment.list.useQuery();                       // Query all appointments for signed-in patient
  const cancelMutation = trpc.patientAppointment.cancel.useMutation();                     // Mutation procedure to cancel an appointment
  const [cancellingId, setCancellingId] = useState<number | null>(null);                   // ID of appointment actively being cancelled
  const [appointmentToCancel, setAppointmentToCancel] = useState<number | null>(null);     // ID of appointment selected for confirmation dialog
  const [mutationError, setMutationError] = useState('');                                  // Error message string for UI alert

  if (appointmentsQuery.isLoading) {                                                       // Loading state view
    return <div className="flex items-center justify-center h-full"><p className="caption">Loading appointments…</p></div>;
  }

  const appointments = appointmentsQuery.data ?? [];                                       // List of patient appointments
  const upcoming = appointments.filter((appointment) => ['Requested', 'Pending', 'Confirmed'].includes(appointment.status)); // Future active visits
  const past = appointments.filter((appointment) => ['Completed', 'Cancelled'].includes(appointment.status)); // History of past consultations

  // Returns icon component matching appointment status
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Completed': return <CheckCircle2 size={14} />;                                 // Completed checkmark
      case 'Confirmed': return <CheckCircle2 size={14} />;                                 // Confirmed checkmark
      case 'Requested':
      case 'Pending': return <Clock size={14} />;                                          // Pending clock
      case 'Cancelled': return <XCircle size={14} />;                                      // Cancelled cross
      default: return null;
    }
  };

  // Maps appointment status to badge color variant
  const getStatusVariant = (status: string) => {
    if (status === 'Confirmed' || status === 'Completed') return 'success';                // Green for confirmed / completed
    if (status === 'Cancelled') return 'danger';                                           // Red for cancelled
    return 'neutral';                                                                      // Amber / neutral for pending
  };

  // Opens confirmation dialog before cancelling
  const requestCancel = (id: number) => {
    setAppointmentToCancel(id);                                                            // Prompt confirmation modal
  };

  // Submits cancellation request to backend and invalidates caches
  const confirmCancel = async () => {
    if (appointmentToCancel === null) return;
    const id = appointmentToCancel;                                                        // Target ID
    setAppointmentToCancel(null);                                                          // Close modal
    setCancellingId(id);                                                                   // Set cancelling spinner
    setMutationError('');                                                                  // Clear error
    try {
      await cancelMutation.mutateAsync({ id });                                            // Execute cancellation mutation
      await trpcUtils.patientAppointment.list.invalidate();                                // Refresh appointment list
      await trpcUtils.patientDashboard.summary.invalidate();                               // Refresh dashboard counters
    } catch (error: unknown) {
      setMutationError(error instanceof Error ? error.message : 'Unable to cancel this appointment. Please try again.');
    } finally {
      setCancellingId(null);                                                               // Reset loading state
    }
  };

  return (
    <div className="container" style={{ padding: 0 }}>
      <header className="mb-4 flex items-center gap-3">
        <div style={{ width: 44, height: 44, borderRadius: '14px', background: 'rgba(0,27,48,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <CalendarIcon size={24} color="var(--color-primary)" />
        </div>
        <div>
          <h1 style={{ margin: 0 }}>Appointments</h1>
          <p className="caption">Manage your scheduled clinical consultations and history.</p>
        </div>
      </header>

      {mutationError && <div className="alert-panel mb-4"><span className="caption">{mutationError}</span></div>}

      <div className="mb-6">
        <h2 className="mb-3" style={{ fontSize: 'var(--text-h2)' }}>Upcoming Consultations</h2>
        <BentoGrid>
          {upcoming.map((appointment) => {
            const doctor = appointment.doctor;
            return (
              <BentoItem key={appointment.id} colSpan={2}>
                <Card variant="glass" className="h-full flex-col justify-between" style={{ opacity: cancellingId === appointment.id ? 0.5 : 1 }}>
                  <div>
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-3">
                        <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--color-primary)', color: 'var(--color-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                          {doctor?.name.charAt(0) || <User size={20} />}
                        </div>
                        <div>
                          <h3 style={{ margin: 0 }}>{doctor?.name || 'Controlled directory specialist'}</h3>
                          <span className="caption">{doctor?.specialty || 'Specialty not recorded'} • {doctor?.hospital || 'Controlled directory'}</span>
                        </div>
                      </div>
                      <Badge variant={getStatusVariant(appointment.status) as any}>
                        {getStatusIcon(appointment.status)} {appointment.status}
                      </Badge>
                    </div>

                    <div style={{ padding: 'var(--spacing-3)', background: 'rgba(255,255,255,0.6)', borderRadius: 'var(--border-radius-md)', border: '1px solid var(--color-border)' }}>
                      <div className="flex justify-between items-center">
                        <span className="caption">Date & Time</span>
                        <strong style={{ color: 'var(--color-primary)' }}>
                          {new Date(appointment.scheduledAt).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })} at {new Date(appointment.scheduledAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                        </strong>
                      </div>
                    </div>
                  </div>

                  <div style={{ marginTop: 'var(--spacing-4)', textAlign: 'right' }}>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => requestCancel(appointment.id)}
                      disabled={cancellingId === appointment.id}
                      aria-label={`Cancel appointment with ${doctor?.name || 'specialist'} on ${new Date(appointment.scheduledAt).toLocaleDateString()}`}
                    >
                      {cancellingId === appointment.id ? 'Cancelling...' : 'Cancel Appointment'}
                    </Button>
                  </div>
                </Card>
              </BentoItem>
            );
          })}

          {upcoming.length === 0 && (
            <BentoItem colSpan={4}>
              <Card variant="glass" style={{ textAlign: 'center', padding: 'var(--spacing-6)' }}>
                <p className="text-muted" style={{ margin: 0 }}>No upcoming appointments scheduled.</p>
              </Card>
            </BentoItem>
          )}
        </BentoGrid>
      </div>

      <div>
        <h2 className="mb-3" style={{ fontSize: 'var(--text-h2)' }}>Consultation History</h2>
        <div className="flex-col gap-3">
          {past.map((appointment) => {
            const doctor = appointment.doctor;
            return (
              <Card key={appointment.id} variant="solid" className="flex flex-col sm:flex-row justify-between sm:items-center gap-3" style={{ opacity: 0.95 }}>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 style={{ margin: 0, fontSize: 'var(--text-h3)' }}>{doctor?.name || 'Controlled directory specialist'}</h3>
                    <Badge variant={getStatusVariant(appointment.status) as any}>
                      {getStatusIcon(appointment.status)} {appointment.status}
                    </Badge>
                  </div>
                  <span className="caption">
                    {doctor?.specialty || 'Specialty not recorded'} • {new Date(appointment.scheduledAt).toLocaleDateString()} at {new Date(appointment.scheduledAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                  </span>
                  {appointment.reason && (
                    <p className="caption" style={{ margin: '4px 0 0', color: 'var(--color-text-muted)' }}>
                      Reason: {appointment.reason}
                    </p>
                  )}
                  {appointment.status === 'Completed' && (
                    <p className="caption" style={{ margin: '4px 0 0', color: 'var(--color-success, #10b981)', fontWeight: 600 }}>
                      ✓ Consultation completed with your specialist.
                    </p>
                  )}
                </div>
              </Card>
            );
          })}
          {past.length === 0 && <p className="text-muted caption">No past appointments recorded.</p>}
        </div>
      </div>

      <Popup isOpen={appointmentToCancel !== null} onClose={() => setAppointmentToCancel(null)} title="Cancel Appointment" maxWidth="400px">
        <div className="flex-col gap-4">
          <p>Are you sure you want to cancel this appointment request?</p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '16px', flexWrap: 'wrap' }}>
            <Button variant="outline" onClick={() => setAppointmentToCancel(null)}>Keep Appointment</Button>
            <Button variant="danger" onClick={confirmCancel}>Cancel Appointment</Button>
          </div>
        </div>
      </Popup>
    </div>
  );
};
