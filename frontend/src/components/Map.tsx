import "leaflet/dist/leaflet.css";                                                             // Leaflet core stylesheet
import { MapContainer, TileLayer } from "react-leaflet";                                        // React Leaflet canvas and tile wrappers
import type { MapOptions } from "leaflet";                                                     // Leaflet options interface
import { cn } from "@/lib/utils";                                                              // Style utility
import React from "react";                                                                      // React core
import L from "leaflet";                                                                        // Leaflet library instance
import icon from "leaflet/dist/images/marker-icon.png";                                         // Bundled marker pin graphic
import iconShadow from "leaflet/dist/images/marker-shadow.png";                                 // Bundled marker shadow graphic

// Workaround for missing default marker icon assets when bundling with Vite/Webpack
const DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  tooltipAnchor: [16, -28],
});
L.Marker.prototype.options.icon = DefaultIcon;                                                  // Assign globally to all markers

export interface MapViewProps extends MapOptions {
  className?: string;                                                                           // Additional CSS classes
  initialCenter?: { lat: number; lng: number };                                                 // Center coordinates
  initialZoom?: number;                                                                         // Starting zoom level
  children?: React.ReactNode;                                                                   // Child markers or overlays
}

// =========================================================================================
// LEAFLET / OPENSTREETMAP BASE WRAPPER (MapView)
// Provides a self-contained, responsive map container powered by OpenStreetMap tiles.
// Defaults center to Mumbai coordinates (19.076° N, 72.8777° E).
// =========================================================================================
export function MapView({
  className,
  initialCenter = { lat: 19.076, lng: 72.8777 },                                               // Default to Mumbai geographic center
  initialZoom = 11,                                                                             // Zoom level covering Greater Mumbai
  children,
  ...mapOptions
}: MapViewProps) {
  return (
    <div className={cn("w-full h-[500px] overflow-hidden rounded-xl border", className)}>
      <MapContainer
        center={[initialCenter.lat, initialCenter.lng]}                                         // Focus map center
        zoom={initialZoom}                                                                      // Set zoom
        className="w-full h-full z-0"
        {...mapOptions}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' // Mandatory attribution
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"                              // Free OpenStreetMap public tile server
        />
        {children}                                                                              {/* Markers and popups */}
      </MapContainer>
    </div>
  );
}
