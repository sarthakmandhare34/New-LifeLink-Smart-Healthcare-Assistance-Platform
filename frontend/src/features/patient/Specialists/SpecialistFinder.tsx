import { useCallback, useEffect, useMemo, useState } from 'react';                          // Core React state, memoization, and callback hooks
import { Card } from '../../../components/ui/Card';                                            // Reusable glass/solid container
import { Input } from '../../../components/ui/Input';                                          // Styled input field component
import { Button } from '../../../components/ui/Button';                                        // Styled button component
import { Badge } from '../../../components/ui/Badge';                                          // Small indicator badge
import { Popup } from '../../../components/ui/Popup';                                          // Modal confirmation dialog
import { UserCheck, Search, MapPin, Building, Map as MapIcon, Route, TrainFront, LocateFixed, X, AlertCircle, RefreshCw, RotateCcw, CheckCircle } from 'lucide-react'; // Specialist directory and transit icons
import { useNavigate, useSearchParams } from 'react-router-dom';                                 // Navigation and query parameter synchronization hooks
import { trpc } from '../../../lib/trpc';                                                       // Type-safe tRPC client bridge
import { MumbaiDoctorMap } from '../../../components/MumbaiDoctorMap';                          // Interactive OpenStreetMap visualization component
import type { MumbaiRailLine } from '@shared/mumbaiRailNetwork';                                // Transit network type definitions
import { sortByBrowserLocation, type BrowserLocation } from './discoveryLocation';              // Haversine distance client-side sorting utility
import './specialistFinder.css';                                                                // Bespoke responsive styles for discovery grid

// Constant label strings and disclaimers for accessibility and transparent UI copy
const ALL_FILTER = 'all';                                                                       // Sentinel value denoting no specialty filter
export const RESIDENCE_CORRIDOR_LABEL = 'Which part of Mumbai do you live in?';                 // Label for geographic corridor selection
export const RESIDENCE_STATION_LABEL = 'Which station is closest to where you live?';           // Label for local rail station selection
export const BROWSER_LOCATION_TITLE = 'Optional browser location';                              // Section title for device geolocation
export const BROWSER_LOCATION_PRIVACY = 'Optional: use your browser location to order only the visible controlled specialist entries. Your location is not stored or sent to LifeLink.'; // Privacy guarantee
export const SPECIALTY_SEARCH_GUIDANCE = 'Free-text search matches specialties only. Use the Mumbai area and station filters below for where you live.'; // User search hint
export const SPECIALIST_LOAD_ERROR_TITLE = 'We couldn’t load the specialist directory';          // Error title
export const SPECIALIST_LOAD_ERROR_MESSAGE = 'Please check your connection and try again. Your filters will stay unchanged.'; // Error guidance

// =========================================================================================
// SPECIALIST FINDER & TRANSIT DISCOVERY COMPONENT
// Enables patients to browse 12 in-system clinical specialties across Mumbai's transit corridors,
// view clinic locations on an interactive Leaflet/OpenStreetMap canvas, and request appointments.
// =========================================================================================
export const SpecialistFinder = () => {
  const trpcUtils = trpc.useUtils();                                                            // Client cache invalidator
  const [searchParams, setSearchParams] = useSearchParams();                                    // URL search params reader and writer
  const initialSpecialty = searchParams.get('specialty') || ALL_FILTER;                          // Initialize specialty from URL query if present
  const [specialty, setSpecialty] = useState(initialSpecialty);                                  // Active specialty filter state
  const [searchTerm, setSearchTerm] = useState('');                                             // Text search term
  
  // Memoize filter object passed to tRPC query to avoid redundant network refetches
  const discoveryFilters = useMemo(() => ({
    city: 'Mumbai' as const,                                                                    // Locked to Mumbai clinical operational radius
    specialty: specialty === ALL_FILTER ? undefined : specialty,                                // Filter by selected specialty
    query: searchTerm.trim() || undefined,                                                      // Filter by free-text search term
  }), [searchTerm, specialty]);

  const directoryQuery = trpc.patientDiscovery.list.useQuery(discoveryFilters);                 // Query to fetch doctors matching filters
  const facetsQuery = trpc.patientDiscovery.facets.useQuery();                                  // Query to fetch available specialties and localities
  const requestMutation = trpc.patientAppointment.request.useMutation();                       // Mutation to submit appointment booking request
  const navigate = useNavigate();                                                               // Page navigation controller

  // Local booking form and interactive map state
  const [requestedAt, setRequestedAt] = useState('');                                           // Appointment timestamp chosen by patient
  const [appointmentReason, setAppointmentReason] = useState('');                               // Chief complaint or medical reason
  const [requestedDocId, setRequestedDocId] = useState<string | null>(null);                    // Tracks doctor successfully booked
  const [processingId, setProcessingId] = useState<string | null>(null);                        // Disables request button while booking is in flight
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);                      // Highlights selected doctor marker on map
  const [requestError, setRequestError] = useState('');                                         // Inline error message for appointment validation
  const [browserLocation, setBrowserLocation] = useState<BrowserLocation | null>(null);        // Optional client latitude/longitude
  const [locationStatus, setLocationStatus] = useState(BROWSER_LOCATION_PRIVACY);               // Informative privacy string
  const [isLocating, setIsLocating] = useState(false);                                          // Spinner state while acquiring GPS coordinates
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);                              // Modal confirmation popup visibility

  // Synchronize URL specialty parameter with component state
  useEffect(() => {
    const requestedSpecialty = searchParams.get('specialty') || ALL_FILTER;
    if (requestedSpecialty !== specialty) setSpecialty(requestedSpecialty);
  }, [searchParams, specialty]);

  // Deselect doctor if filtered list no longer contains the currently selected doctor
  useEffect(() => {
    if (selectedDocId && !directoryQuery.data?.some((doctor) => doctor.id === selectedDocId)) setSelectedDocId(null);
  }, [directoryQuery.data, selectedDocId]);

  // Update specialty filter in both React state and URL query string
  const updateSpecialty = (nextSpecialty: string) => {
    setSpecialty(nextSpecialty);
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      if (nextSpecialty === ALL_FILTER) next.delete('specialty');
      else next.set('specialty', nextSpecialty);
      return next;
    }, { replace: true });
  };

  // Select a doctor on both list and map
  const selectDoctor = useCallback((doctorId: string) => {
    setSelectedDocId(doctorId);
    setRequestError('');
  }, []);

  // Request browser geolocation with privacy-first client-only ordering
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

  // Reset geolocation
  const clearBrowserLocation = () => {
    setBrowserLocation(null);
    setLocationStatus('Browser location cleared. Directory results return to their standard controlled order; no location was stored.');
  };

  // Clear all filters
  const clearFilters = () => {
    updateSpecialty(ALL_FILTER);
    setSearchTerm('');
    setRequestError('');
  };

  // Refetch directory queries on error retry
  const retryDirectory = () => {
    void directoryQuery.refetch();
    void facetsQuery.refetch();
  };

  // Submit appointment booking request
  const handleRequest = async (doctorId: string, event: React.MouseEvent) => {
    event.stopPropagation();                                                                    // Prevent triggering doctor selection click
    if (!requestedAt) {
      setRequestError('Choose a requested visit date and time before sending an appointment request.');
      return;
    }
    if (appointmentReason.trim().length < 3) {
      setRequestError('Briefly tell the assigned specialist why you are requesting this appointment.');
      return;
    }

    setProcessingId(doctorId);                                                                  // Engage in-flight button spinner
    setRequestError('');
    try {
      await requestMutation.mutateAsync({ doctorId, scheduledAt: new Date(requestedAt), reason: appointmentReason.trim() }); // Dispatch booking
      await trpcUtils.patientAppointment.list.invalidate();                                     // Refresh patient appointments list
      await trpcUtils.patientDashboard.summary.invalidate();                                     // Refresh summary cards
      setRequestedDocId(doctorId);                                                              // Mark as requested
      setShowSuccessPopup(true);                                                                // Open confirmation modal
    } catch (error: unknown) {
      setRequestError(error instanceof Error ? error.message : 'Unable to submit the appointment request.');
    } finally {
      setProcessingId(null);
    }
  };

  // Compute displayed doctors, optionally sorted by distance to patient
  const filteredDoctors = directoryQuery.data ?? [];
  const displayedDoctors = useMemo(() => browserLocation ? sortByBrowserLocation(filteredDoctors, browserLocation) : filteredDoctors, [browserLocation, filteredDoctors]);
  const activeFilterCount = [specialty !== ALL_FILTER, Boolean(searchTerm.trim())].filter(Boolean).length;

  // Loading skeleton state
  if (directoryQuery.isLoading || facetsQuery.isLoading) return <div className="discovery-state" role="status" aria-live="polite"><RefreshCw size={20} className="discovery-state-icon" aria-hidden="true" /><p className="caption">Loading the controlled Mumbai specialist directory…</p></div>;

  // Error boundary state
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
      {/* Page header */}
      <header className="mb-4 flex items-center gap-3">
        <div style={{ width: 44, height: 44, borderRadius: '14px', background: 'rgba(0, 196, 204, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <UserCheck size={24} color="#00C4CC" />                                               {/* Specialist finder icon */}
        </div>
        <div>
          <h1 style={{ margin: 0, fontFamily: "'Outfit', sans-serif", color: '#102B2D', fontSize: '2rem' }}>Specialist Finder</h1>
          <p className="caption" style={{ color: '#2D9D9C' }}>Browse controlled Mumbai specialist entries by specialty and the Mumbai area closest to where you live, then send a patient-owned appointment request.</p>
        </div>
      </header>

      {/* Filter and appointment parameters card */}
      <Card variant="glass" className="discovery-refinement-card mb-4">
        <div className="discovery-refinement-content">
          <div className="mock-directory-notice" role="note">
            <MapIcon size={18} aria-hidden="true" />
            <span><strong>Controlled directory only.</strong> These are controlled specialist entries, not verified clinicians, live availability, ratings, or medical recommendations.</span>
          </div>

          {/* Search field */}
          <div className="discovery-search-field">
            <Search size={20} color="var(--color-primary)" style={{ flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <Input aria-label="Search specialists by specialty" placeholder="Search by specialty…" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} />
              <p className="caption discovery-search-guidance">{SPECIALTY_SEARCH_GUIDANCE}</p>
            </div>
          </div>

          {/* Optional browser location privacy control */}
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

          {/* Specialty dropdown filter */}
          <div className="discovery-filter-grid" style={{ gridTemplateColumns: '1fr' }}>
            <div>
              <label className="discovery-filter-label" htmlFor="specialty-filter">Specialty</label>
              <select id="specialty-filter" className="discovery-filter-select" value={specialty} onChange={(event) => updateSpecialty(event.target.value)}>
                <option value={ALL_FILTER}>All specialties</option>
                {facets?.specialties.map((value) => <option key={value} value={value}>{value}</option>)}
              </select>
            </div>
          </div>

          {/* Appointment date and complaint reason input fields */}
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

      {/* Main split workspace: directory list + interactive map */}
      <div className="discovery-workspace">
        <section>
          <div className="discovery-results-heading">
            <div>
              <h2 style={{ fontSize: '1.4rem', margin: 0, fontFamily: "'Outfit', sans-serif", color: '#102B2D' }}>Mumbai Specialist Directory</h2>
              <p className="caption" style={{ color: '#2D9D9C' }}>{displayedDoctors.length} controlled {displayedDoctors.length === 1 ? 'entry' : 'entries'} match the current filters.{browserLocation ? ' They are ordered approximately from your browser location.' : ''}</p>
            </div>
            <Badge status="neutral">Mumbai only</Badge>
          </div>

          {/* Directory results grid */}
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

            {/* Empty state when 0 doctors match filter */}
            {displayedDoctors.length === 0 && (
                <Card variant="glass" className="discovery-empty-state" style={{ textAlign: 'center', padding: 'var(--spacing-6)' }}><p className="text-muted" style={{ margin: 0 }}>No controlled directory entries match the selected filters. Clear a filter to view the available development entries.</p>{activeFilterCount > 0 && <Button type="button" variant="outline" size="sm" onClick={clearFilters}><RotateCcw size={15} aria-hidden="true" /> Reset filters</Button>}</Card>
            )}
          </div>
        </section>

        {/* Interactive OpenStreetMap pane */}
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

      {/* Booking confirmation popup dialog */}
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
