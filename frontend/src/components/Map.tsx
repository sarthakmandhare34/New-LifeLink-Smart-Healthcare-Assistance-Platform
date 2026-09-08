import "leaflet/dist/leaflet.css";
import { MapContainer, TileLayer } from "react-leaflet";
import type { MapOptions } from "leaflet";
import { cn } from "@/lib/utils";
import React from "react";
import L from "leaflet";
import icon from "leaflet/dist/images/marker-icon.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";

// Fix for default marker icons in React Leaflet
const DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  tooltipAnchor: [16, -28],
});
L.Marker.prototype.options.icon = DefaultIcon;

export interface MapViewProps extends MapOptions {
  className?: string;
  initialCenter?: { lat: number; lng: number };
  initialZoom?: number;
  children?: React.ReactNode;
}

export function MapView({
  className,
  initialCenter = { lat: 19.076, lng: 72.8777 },
  initialZoom = 11,
  children,
  ...mapOptions
}: MapViewProps) {
  return (
    <div className={cn("w-full h-[500px] overflow-hidden rounded-xl border", className)}>
      <MapContainer
        center={[initialCenter.lat, initialCenter.lng]}
        zoom={initialZoom}
        className="w-full h-full z-0"
        {...mapOptions}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {children}
      </MapContainer>
    </div>
  );
}
