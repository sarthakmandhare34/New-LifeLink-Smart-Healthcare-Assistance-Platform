import { useState, useEffect } from "react";
import type { MumbaiRailLine } from "@shared/mumbaiRailNetwork";
import { MapView } from "./Map";
import { Marker, Popup, useMap } from "react-leaflet";
import type { LatLngBoundsExpression } from "leaflet";

export type BrowserMapLocation = {
  latitude: number;
  longitude: number;
};

export type DirectoryMapDoctor = {
  id: string;
  name: string;
  specialty: string;
  locality: string;
  railLine: MumbaiRailLine;
  railLines: readonly MumbaiRailLine[];
  station: string;
  latitude: number;
  longitude: number;
};

type MumbaiDoctorMapProps = {
  doctors: DirectoryMapDoctor[];
  selectedDoctorId: string | null;
  onSelectDoctor: (doctorId: string) => void;
  browserLocation?: BrowserMapLocation | null;
};

const MUMBAI_CENTER = { lat: 19.076, lng: 72.8777 };
const MUMBAI_MAX_BOUNDS: LatLngBoundsExpression = [
  [18.80, 72.70], // South West
  [19.35, 73.05], // North East
];

function MapController({
  doctors,
  selectedDoctorId,
  browserLocation,
}: {
  doctors: DirectoryMapDoctor[];
  selectedDoctorId: string | null;
  browserLocation: BrowserMapLocation | null;
}) {
  const map = useMap();

  useEffect(() => {
    if (selectedDoctorId) {
      const selectedDoctor = doctors.find((d) => d.id === selectedDoctorId);
      if (selectedDoctor) {
        map.flyTo([selectedDoctor.latitude, selectedDoctor.longitude], 14, { duration: 1.0 });
      }
    } else if (browserLocation) {
      map.flyTo([browserLocation.latitude, browserLocation.longitude], 13, { duration: 1.0 });
    } else if (doctors.length === 1) {
      map.flyTo([doctors[0].latitude, doctors[0].longitude], 13, { duration: 1.0 });
    } else {
      map.flyTo([MUMBAI_CENTER.lat, MUMBAI_CENTER.lng], 11, { duration: 1.0 });
    }
  }, [doctors, selectedDoctorId, browserLocation, map]);

  return null;
}

export function MumbaiDoctorMap({
  doctors,
  selectedDoctorId,
  onSelectDoctor,
  browserLocation = null,
}: MumbaiDoctorMapProps) {
  const [mapFailed] = useState(false);

  return (
    <div className="mumbai-directory-map-wrap">
      <MapView
        className="mumbai-directory-map"
        initialCenter={MUMBAI_CENTER}
        initialZoom={11}
        maxBounds={MUMBAI_MAX_BOUNDS}
        maxBoundsViscosity={1.0}
        minZoom={10}
      >
        <MapController
          doctors={doctors}
          selectedDoctorId={selectedDoctorId}
          browserLocation={browserLocation}
        />

        {doctors.map((doctor) => (
          <Marker
            key={doctor.id}
            position={[doctor.latitude, doctor.longitude]}
            eventHandlers={{ click: () => onSelectDoctor(doctor.id) }}
          >
            <Popup>
              <strong>{doctor.name}</strong>
              <br />
              {doctor.specialty} in {doctor.locality}
            </Popup>
          </Marker>
        ))}

        {browserLocation && (
          <Marker position={[browserLocation.latitude, browserLocation.longitude]}>
            <Popup>Your browser location</Popup>
          </Marker>
        )}
      </MapView>

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
