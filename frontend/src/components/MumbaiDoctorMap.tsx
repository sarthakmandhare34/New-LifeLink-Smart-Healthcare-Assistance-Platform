import { useState, useEffect } from "react";                                                 // React hooks
import type { MumbaiRailLine } from "@shared/mumbaiRailNetwork";                                // Transit corridor types
import { MapView } from "./Map";                                                                // Base Leaflet map component
import { Marker, Popup, useMap } from "react-leaflet";                                          // Leaflet marker and popup primitives
import type { LatLngBoundsExpression } from "leaflet";                                          // Leaflet boundary expression

// Browser GPS location coordinate pair
export type BrowserMapLocation = {
  latitude: number;                                                                             // Latitude
  longitude: number;                                                                            // Longitude
};

// Specialist entry format required by map pins
export type DirectoryMapDoctor = {
  id: string;                                                                                  // Unique doctor ID
  name: string;                                                                                 // Doctor name
  specialty: string;                                                                            // Specialty
  locality: string;                                                                             // Suburb/Locality
  railLine: MumbaiRailLine;                                                                     // Primary railway corridor
  railLines: readonly MumbaiRailLine[];                                                         // All accessible rail corridors
  station: string;                                                                              // Nearest railway station
  latitude: number;                                                                             // Latitude coordinate
  longitude: number;                                                                            // Longitude coordinate
};

type MumbaiDoctorMapProps = {
  doctors: DirectoryMapDoctor[];                                                                // Doctors to render on map
  selectedDoctorId: string | null;                                                              // Active doctor selection
  onSelectDoctor: (doctorId: string) => void;                                                   // Marker click callback
  browserLocation?: BrowserMapLocation | null;                                                  // Optional user GPS coordinates
};

// Mumbai geographic bounds constants
const MUMBAI_CENTER = { lat: 19.076, lng: 72.8777 };                                            // Mumbai geographic center
const MUMBAI_MAX_BOUNDS: LatLngBoundsExpression = [
  [18.80, 72.70],                                                                               // South West corner (Colaba / Arabian Sea)
  [19.35, 73.05],                                                                               // North East corner (Thane / Kalyan)
];

// Inner controller that flies the map viewport smoothly to selected doctor or user location
function MapController({
  doctors,
  selectedDoctorId,
  browserLocation,
}: {
  doctors: DirectoryMapDoctor[];
  selectedDoctorId: string | null;
  browserLocation: BrowserMapLocation | null;
}) {
  const map = useMap();                                                                         // Leaflet map instance

  useEffect(() => {
    if (selectedDoctorId) {
      const selectedDoctor = doctors.find((d) => d.id === selectedDoctorId);
      if (selectedDoctor) {
        map.flyTo([selectedDoctor.latitude, selectedDoctor.longitude], 14, { duration: 1.0 });   // Zoom smoothly to selected doctor
      }
    } else if (browserLocation) {
      map.flyTo([browserLocation.latitude, browserLocation.longitude], 13, { duration: 1.0 }); // Zoom to patient location
    } else if (doctors.length === 1) {
      map.flyTo([doctors[0].latitude, doctors[0].longitude], 13, { duration: 1.0 });           // Single search result focus
    } else {
      map.flyTo([MUMBAI_CENTER.lat, MUMBAI_CENTER.lng], 11, { duration: 1.0 });                // Reset to overview
    }
  }, [doctors, selectedDoctorId, browserLocation, map]);

  return null;
}

// =========================================================================================
// MUMBAI SPECIALIST CLINIC INTERACTIVE MAP
// Renders clinical specialist locations across Mumbai's Western, Central, and Harbour lines.
// Interactive pin clicks synchronize with directory lists, and viewports pan automatically.
// =========================================================================================
export function MumbaiDoctorMap({
  doctors,
  selectedDoctorId,
  onSelectDoctor,
  browserLocation = null,
}: MumbaiDoctorMapProps) {
  const [mapFailed] = useState(false);                                                          // Fallback state

  return (
    <div className="mumbai-directory-map-wrap">
      <MapView
        className="mumbai-directory-map"
        initialCenter={MUMBAI_CENTER}
        initialZoom={11}
        maxBounds={MUMBAI_MAX_BOUNDS}                                                           // Clamp viewport to Mumbai metropolitan area
        maxBoundsViscosity={1.0}                                                                // Prevent panning outside Mumbai region
        minZoom={10}
      >
        {/* Animated viewport transition controller */}
        <MapController
          doctors={doctors}
          selectedDoctorId={selectedDoctorId}
          browserLocation={browserLocation}
        />

        {/* Doctor clinic location markers */}
        {doctors.map((doctor) => (
          <Marker
            key={doctor.id}
            position={[doctor.latitude, doctor.longitude]}
            eventHandlers={{ click: () => onSelectDoctor(doctor.id) }}                          // Clicking pin selects doctor
          >
            <Popup>
              <strong>{doctor.name}</strong>                                                    {/* Doctor name */}
              <br />
              {doctor.specialty} in {doctor.locality}                                           {/* Specialty & Locality */}
            </Popup>
          </Marker>
        ))}

        {/* Optional browser location marker */}
        {browserLocation && (
          <Marker position={[browserLocation.latitude, browserLocation.longitude]}>
            <Popup>Your browser location</Popup>
          </Marker>
        )}
      </MapView>

      {/* Fallback error notice */}
      {mapFailed && (
        <div className="mumbai-map-error" role="status">
          <p>
            The interactive map is unavailable in this session. Directory filters and appointment
            requests remain available; no location or distance is inferred.
          </p>
        </div>
      )}
    </div>
  );
}
