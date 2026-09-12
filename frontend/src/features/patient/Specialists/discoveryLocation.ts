// Geolocation coordinate structure for patient device position
export type BrowserLocation = {
  latitude: number;                                                                             // WGS84 GPS latitude in decimal degrees
  longitude: number;                                                                            // WGS84 GPS longitude in decimal degrees
};

// Generic interface representing any geographic entity with coordinates
type MappableDirectoryEntry = {
  latitude: number;                                                                             // Specialist clinic latitude
  longitude: number;                                                                            // Specialist clinic longitude
};

// Converts angle in degrees to radians for trigonometric planar calculations
function toRadians(value: number) {
  return (value * Math.PI) / 180;                                                               // Radians conversion formula
}

// =========================================================================================
// HAVERSINE PLANAR APPROXIMATION DISTANCE SORTER
// Orders already-visible controlled specialist entries by approximate physical distance.
// Privacy guarantee: Browser coordinates never leave client RAM and are never transmitted to server.
// =========================================================================================
export function sortByBrowserLocation<T extends MappableDirectoryEntry>(entries: readonly T[], location: BrowserLocation) {
  // Computes squared distance using flat-earth equirectangular projection (accurate for city scale)
  const distanceSquared = (entry: T) => {
    const latitude = toRadians(entry.latitude - location.latitude);                             // Delta latitude in radians
    const longitude = toRadians(entry.longitude - location.longitude) * Math.cos(toRadians(location.latitude)); // Longitudinal adjustment for latitude
    return latitude ** 2 + longitude ** 2;                                                      // Pythagorean Euclidean metric
  };

  // Sort clone of entries array in ascending order of proximity
  return [...entries].sort((left, right) => distanceSquared(left) - distanceSquared(right));
}
