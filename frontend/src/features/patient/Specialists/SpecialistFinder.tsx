import { useCallback, useEffect, useMemo, useState } from 'react';
import { Card } from '../../../components/ui/Card';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { Popup } from '../../../components/ui/Popup';
import { UserCheck, Search, MapPin, Building, Map as MapIcon, Route, TrainFront, LocateFixed, X, AlertCircle, RefreshCw, RotateCcw, CheckCircle } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { trpc } from '../../../lib/trpc';
import { MumbaiDoctorMap } from '../../../components/MumbaiDoctorMap';
import type { MumbaiRailLine } from '@shared/mumbaiRailNetwork';
import { sortByBrowserLocation, type BrowserLocation } from './discoveryLocation';
import './specialistFinder.css';

const ALL_FILTER = 'all';
export const RESIDENCE_CORRIDOR_LABEL = 'Which part of Mumbai do you live in?';
export const RESIDENCE_STATION_LABEL = 'Which station is closest to where you live?';
export const BROWSER_LOCATION_TITLE = 'Optional browser location';
export const BROWSER_LOCATION_PRIVACY = 'Optional: use your browser location to order only the visible controlled specialist entries. Your location is not stored or sent to LifeLink.';
export const SPECIALTY_SEARCH_GUIDANCE = 'Free-text search matches specialties only. Use the Mumbai area and station filters below for where you live.';
export const SPECIALIST_LOAD_ERROR_TITLE = 'We couldn’t load the specialist directory';
export const SPECIALIST_LOAD_ERROR_MESSAGE = 'Please check your connection and try again. Your filters will stay unchanged.';

export const SpecialistFinder = () => {
  const trpcUtils = trpc.useUtils();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialSpecialty = searchParams.get('specialty') || ALL_FILTER;
  const [specialty, setSpecialty] = useState(initialSpecialty);
  const [searchTerm, setSearchTerm] = useState('');
  const discoveryFilters = useMemo(() => ({
    city: 'Mumbai' as const,
    specialty: specialty === ALL_FILTER ? undefined : specialty,
    query: searchTerm.trim() || undefined,
  }), [searchTerm, specialty]);
  const directoryQuery = trpc.patientDiscovery.list.useQuery(discoveryFilters);
  const facetsQuery = trpc.patientDiscovery.facets.useQuery();
  const requestMutation = trpc.patientAppointment.request.useMutation();
  const navigate = useNavigate();
  const [requestedAt, setRequestedAt] = useState('');
  const [appointmentReason, setAppointmentReason] = useState('');
  const [requestedDocId, setRequestedDocId] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [requestError, setRequestError] = useState('');
  const [browserLocation, setBrowserLocation] = useState<BrowserLocation | null>(null);
  const [locationStatus, setLocationStatus] = useState(BROWSER_LOCATION_PRIVACY);
  const [isLocating, setIsLocating] = useState(false);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);

  useEffect(() => {
    const requestedSpecialty = searchParams.get('specialty') || ALL_FILTER;
    if (requestedSpecialty !== specialty) setSpecialty(requestedSpecialty);
  }, [searchParams, specialty]);

  useEffect(() => {
    if (selectedDocId && !directoryQuery.data?.some((doctor) => doctor.id === selectedDocId)) setSelectedDocId(null);
  }, [directoryQuery.data, selectedDocId]);

  const updateSpecialty = (nextSpecialty: string) => {
    setSpecialty(nextSpecialty);
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      if (nextSpecialty === ALL_FILTER) next.delete('specialty');
      else next.set('specialty', nextSpecialty);
      return next;
    }, { replace: true });
  };


  const selectDoctor = useCallback((doctorId: string) => {
    setSelectedDocId(doctorId);
    setRequestError('');
  }, []);

  const requestBrowserLocation = () => {
    if (!navigator.geolocation) {
      setLocationStatus('This browser does not support location. You can still choose the Mumbai area closest to where you live.');
      return;
    }

    setIsLocating(true);
    setLocationStatus('Requesting your browser location…');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setBrowserLocation({ latitude: position.coords.latitude, longitude: position.coords.longitude });
        setLocationStatus('Location is active for this page only. Controlled specialist entries are ordered approximately from your browser location; no coordinates are stored or sent to LifeLink.');
        setIsLocating(false);
      },
      () => {
        setLocationStatus('Location was not shared. You can continue using the Mumbai area and station filters; no location was stored.');
        setIsLocating(false);
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 300_000 },
    );
  };

  const clearBrowserLocation = () => {
    setBrowserLocation(null);
    setLocationStatus('Browser location cleared. Directory results return to their standard controlled order; no location was stored.');
  };

  const clearFilters = () => {
    updateSpecialty(ALL_FILTER);
    setSearchTerm('');
    setRequestError('');
  };

  const retryDirectory = () => {
    void directoryQuery.refetch();
    void facetsQuery.refetch();
  };

  const handleRequest = async (doctorId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    if (!requestedAt) {
      setRequestError('Choose a requested visit date and time before sending an appointment request.');
      return;
    }
    if (appointmentReason.trim().length < 3) {
      setRequestError('Briefly tell the assigned specialist why you are requesting this appointment.');
      return;
    }

    setProcessingId(doctorId);
    setRequestError('');
    try {
      await requestMutation.mutateAsync({ doctorId, scheduledAt: new Date(requestedAt), reason: appointmentReason.trim() });
      await trpcUtils.patientAppointment.list.invalidate();
      await trpcUtils.patientDashboard.summary.invalidate();
      setRequestedDocId(doctorId);
      setShowSuccessPopup(true);
    } catch (error: unknown) {
      setRequestError(error instanceof Error ? error.message : 'Unable to submit the appointment request.');
    } finally {
      setProcessingId(null);
    }
  };

  const filteredDoctors = directoryQuery.data ?? [];
  const displayedDoctors = useMemo(() => browserLocation ? sortByBrowserLocation(filteredDoctors, browserLocation) : filteredDoctors, [browserLocation, filteredDoctors]);
  const activeFilterCount = [specialty !== ALL_FILTER, Boolean(searchTerm.trim())].filter(Boolean).length;

  if (directoryQuery.isLoading || facetsQuery.isLoading) return <div className="discovery-state" role="status" aria-live="polite"><RefreshCw size={20} className="discovery-state-icon" aria-hidden="true" /><p className="caption">Loading the controlled Mumbai specialist directory…</p></div>;

  if (directoryQuery.isError || facetsQuery.isError) return (
    <div className="container" style={{ padding: 0 }}>
      <div role="alert"><Card variant="glass" className="discovery-load-error">
        <div className="discovery-load-error-icon"><AlertCircle size={24} aria-hidden="true" /></div>
        <div>
          <h1>{SPECIALIST_LOAD_ERROR_TITLE}</h1>
          <p className="caption">{SPECIALIST_LOAD_ERROR_MESSAGE}</p>
          <Button type="button" variant="primary" onClick={retryDirectory} disabled={directoryQuery.isFetching || facetsQuery.isFetching}>
            <RefreshCw size={16} aria-hidden="true" /> {directoryQuery.isFetching || facetsQuery.isFetching ? 'Trying again…' : 'Try again'}
          </Button>
        </div>
      </Card></div>
    </div>
  );

  const facets = facetsQuery.data;

  return (
    <div className="container" style={{ padding: 0, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <header className="mb-4 flex items-center gap-3">
        <div style={{ width: 44, height: 44, borderRadius: '14px', background: 'rgba(0, 196, 204, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <UserCheck size={24} color="#00C4CC" />
        </div>
        <div>
          <h1 style={{ margin: 0, fontFamily: "'Outfit', sans-serif", color: '#102B2D', fontSize: '2rem' }}>Specialist Finder</h1>
          <p className="caption" style={{ color: '#2D9D9C' }}>Browse controlled Mumbai specialist entries by specialty and the Mumbai area closest to where you live, then send a patient-owned appointment request.</p>
        </div>
      </header>

      <Card variant="glass" className="discovery-refinement-card mb-4">
        <div className="discovery-refinement-content">
          <div className="mock-directory-notice" role="note">
            <MapIcon size={18} aria-hidden="true" />
            <span><strong>Controlled directory only.</strong> These are controlled specialist entries, not verified clinicians, live availability, ratings, or medical recommendations.</span>
          </div>
          <div className="discovery-search-field">
            <Search size={20} color="var(--color-primary)" style={{ flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <Input aria-label="Search specialists by specialty" placeholder="Search by specialty…" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} />
              <p className="caption discovery-search-guidance">{SPECIALTY_SEARCH_GUIDANCE}</p>
            </div>
          </div>
          <div className="discovery-location-control">
            <div>
              <p className="discovery-location-title">{BROWSER_LOCATION_TITLE}</p>
              <p className="caption discovery-location-copy" aria-live="polite">{locationStatus}</p>
            </div>
            <div className="discovery-location-actions">
              <Button type="button" variant="outline" size="sm" onClick={requestBrowserLocation} disabled={isLocating}>
                <LocateFixed size={15} /> {isLocating ? 'Getting location…' : browserLocation ? 'Refresh my location' : 'Use my location'}
              </Button>
              {browserLocation && <Button type="button" variant="secondary" size="sm" onClick={clearBrowserLocation}><X size={15} /> Clear</Button>}
            </div>
          </div>
          <div className="discovery-filter-grid" style={{ gridTemplateColumns: '1fr' }}>
            <div>
              <label className="discovery-filter-label" htmlFor="specialty-filter">Specialty</label>
              <select id="specialty-filter" className="discovery-filter-select" value={specialty} onChange={(event) => updateSpecialty(event.target.value)}>
                <option value={ALL_FILTER}>All specialties</option>
                {facets?.specialties.map((value) => <option key={value} value={value}>{value}</option>)}
              </select>
            </div>
          </div>
          <div className="discovery-request-grid">
            <div className="discovery-request-field">
              <label className="discovery-filter-label" htmlFor="requested-visit-at">Requested visit date and time</label>
              <Input id="requested-visit-at" type="datetime-local" value={requestedAt} onChange={(event) => setRequestedAt(event.target.value)} />
              <p className="caption">Choose a preferred time; availability is confirmed later.</p>
            </div>
            <div className="discovery-request-field discovery-appointment-reason">
              <label className="discovery-filter-label" htmlFor="appointment-reason">Reason for this appointment</label>
              <textarea id="appointment-reason" value={appointmentReason} onChange={(event) => setAppointmentReason(event.target.value)} maxLength={1000} rows={4} placeholder="Briefly describe what you would like the specialist to review." />
              <p className="caption">This reason is visible only to you and the assigned clinician workspace.</p>
            </div>
          </div>
          {requestError && <div className="alert-panel"><span className="caption">{requestError}</span></div>}
        </div>
      </Card>

      <div className="discovery-workspace">
        <section>
          <div className="discovery-results-heading">
            <div>
              <h2 style={{ fontSize: '1.4rem', margin: 0, fontFamily: "'Outfit', sans-serif", color: '#102B2D' }}>Mumbai Specialist Directory</h2>
              <p className="caption" style={{ color: '#2D9D9C' }}>{displayedDoctors.length} controlled {displayedDoctors.length === 1 ? 'entry' : 'entries'} match the current filters.{browserLocation ? ' They are ordered approximately from your browser location.' : ''}</p>
            </div>
            <Badge status="neutral">Mumbai only</Badge>
          </div>
          <div className="responsive-list-grid">
            {displayedDoctors.map((doctor) => {
              const isSelected = selectedDocId === doctor.id;
              return (
                  <Card key={doctor.id} variant="glass" interactive selected={isSelected} className="h-full flex-col justify-between" onClick={() => selectDoctor(doctor.id)}>
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 style={{ margin: 0, color: '#102B2D', fontFamily: "'Outfit', sans-serif", fontSize: '1.1rem' }}>{doctor.name}</h3>
                          <p style={{ color: '#00C4CC', fontWeight: 700, margin: '2px 0 0 0', fontSize: '0.9rem' }}>{doctor.specialty}</p>
                        </div>
                        <Badge status="neutral">Controlled directory</Badge>
                      </div>
                      <div className="flex-col gap-1 mt-2">
                        <div className="caption flex items-center gap-1" style={{ color: '#2D9D9C' }}><Building size={14} /> {doctor.hospital}</div>
                        <div className="caption flex items-center gap-1" style={{ color: '#2D9D9C' }}><MapPin size={14} /> {doctor.locality}, {doctor.city} • {doctor.station} station</div>
                        <div className="caption flex items-center gap-1" style={{ color: '#2D9D9C' }}><TrainFront size={14} /> {doctor.railLines.join(" + ")} connectivity</div>
                      </div>
                    </div>
                    <div style={{ marginTop: 'var(--spacing-4)', paddingTop: 'var(--spacing-3)', borderTop: '1px solid #9FFBFF' }}>
                      {requestedDocId === doctor.id ? (
                        <Button variant="secondary" className="w-full" disabled>Requested!</Button>
                      ) : (
                        <Button
                          variant="primary"
                          className="w-full"
                          onClick={(event) => handleRequest(doctor.id, event)}
                          disabled={processingId === doctor.id}
                          aria-label={`Request appointment with ${doctor.name}`}
                        >
                          {processingId === doctor.id ? 'Requesting Appointment…' : 'Request Appointment'}
                        </Button>
                      )}
                    </div>
                  </Card>
              );
            })}
            {displayedDoctors.length === 0 && (
                <Card variant="glass" className="discovery-empty-state" style={{ textAlign: 'center', padding: 'var(--spacing-6)' }}><p className="text-muted" style={{ margin: 0 }}>No controlled directory entries match the selected filters. Clear a filter to view the available development entries.</p>{activeFilterCount > 0 && <Button type="button" variant="outline" size="sm" onClick={clearFilters}><RotateCcw size={15} aria-hidden="true" /> Reset filters</Button>}</Card>
            )}
          </div>
        </section>

        <aside className="discovery-map-pane">
          <Card variant="glass" className="directory-map-card">
            <div className="flex items-center gap-2 mb-3">
              <Route size={20} color="#00C4CC" />
              <div><h2 style={{ margin: 0, fontSize: '1.2rem', fontFamily: "'Outfit', sans-serif", color: '#102B2D' }}>Interactive OpenStreetMap</h2><p className="caption" style={{ color: '#2D9D9C' }}>OpenStreetMap base map and controlled directory markers stay in sync.</p></div>
            </div>
            <MumbaiDoctorMap doctors={displayedDoctors} selectedDoctorId={selectedDocId} onSelectDoctor={selectDoctor} browserLocation={browserLocation} />
          </Card>
        </aside>
      </div>

      <Popup isOpen={showSuccessPopup} onClose={() => navigate('/patient/appointments')} title="Appointment Requested" maxWidth="400px">
        <div style={{ textAlign: 'center', padding: '16px 0', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          <CheckCircle size={48} color="#00C4CC" style={{ margin: '0 auto 16px' }} />
          <h3 style={{ margin: '0 0 8px', color: '#102B2D', fontFamily: "'Outfit', sans-serif", fontSize: '1.2rem' }}>Request Sent</h3>
          <p style={{ color: '#2D9D9C', fontSize: '0.9rem', marginBottom: '24px' }}>
            Your appointment request has been submitted to the assigned specialist workspace successfully.
          </p>
          <Button variant="primary" className="w-full" onClick={() => navigate('/patient/appointments')} style={{ background: '#00C4CC', borderColor: '#00C4CC', color: 'white', fontWeight: 700 }}>
            View My Appointments
          </Button>
        </div>
      </Popup>
    </div>
  );
};
