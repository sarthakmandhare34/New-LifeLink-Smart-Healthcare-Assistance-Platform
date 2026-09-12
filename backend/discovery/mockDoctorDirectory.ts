/**
 * Controlled directory. These entries are not verified practitioner identities,
 * live availability, ratings, reviews, or medical recommendations.
 */
import { MUMBAI_RAIL_LINES, MUMBAI_RAIL_STATIONS, type MumbaiRailLine } from "@shared/mumbaiRailNetwork";       // Railway lines and stations across Mumbai
import { MUMBAI_STATION_COORDINATES } from "@shared/mumbaiStationCoordinates";                                     // Exact GPS coordinates for map pin placement

// Data model representing a doctor entry in our simulated healthcare directory
export type MockDoctorDirectoryEntry = {
  id: string;                                                                                                      // Unique specialist ID (e.g. mock-central-cardiology-csmt)
  name: string;                                                                                                    // Display name of specialist
  specialty: string;                                                                                               // Medical department / specialty
  hospital: string;                                                                                                // Affiliated healthcare facility
  locality: string;                                                                                                // Station neighborhood
  city: "Mumbai";                                                                                                  // City boundary restriction
  railLine: MumbaiRailLine;                                                                                        // Primary railway corridor
  railLines: readonly MumbaiRailLine[];                                                                            // All intersecting railway corridors
  station: string;                                                                                                 // Closest railway station
  latitude: number;                                                                                                // Map coordinate latitude
  longitude: number;                                                                                               // Map coordinate longitude
  isMock: true;                                                                                                    // Flag marking record as simulated
};

// Filter options accepted by the search and discovery engine
export type MockDoctorDirectoryFilters = {
  city?: "Mumbai";                                                                                                 // Filter by city
  specialty?: string;                                                                                              // Filter by clinical specialty
  railLine?: MumbaiRailLine;                                                                                       // Filter by transit corridor
  station?: string;                                                                                                // Filter by transit station
  locality?: string;                                                                                               // Filter by locality
  query?: string;                                                                                                  // Free-text search query
};

// Internal specification defining each simulated clinician location
type ControlledDirectoryDefinition = {
  id: string;                                                                                                      // Unique identifier
  specialty: string;                                                                                               // Medical discipline
  station: string;                                                                                                 // Station anchor
  railLine: MumbaiRailLine;                                                                                        // Rail corridor
};

/**
 * Distributed controlled catalog spanning distinct valid stations across the
 * Central, Harbour, and Western references. The records remain controlled
 * examples, not live availability or verified practitioner identities.
 */
const CONTROLLED_DIRECTORY_DEFINITIONS: readonly ControlledDirectoryDefinition[] = [
  { id: "mock-central-cardiology-csmt", specialty: "Cardiology", station: "CSMT", railLine: "Central" },
  { id: "mock-central-dermatology-ghatkopar", specialty: "Dermatology", station: "Ghatkopar", railLine: "Central" },
  { id: "mock-central-orthopedics-bhandup", specialty: "Orthopedics", station: "Bhandup", railLine: "Central" },
  { id: "mock-central-neurology-thane", specialty: "Neurology", station: "Thane", railLine: "Central" },
  { id: "mock-western-general-practice-churchgate", specialty: "General Practice", station: "Churchgate", railLine: "Western" },
  { id: "mock-western-pediatrics-andheri", specialty: "Pediatrics", station: "Andheri", railLine: "Western" },
  { id: "mock-western-ophthalmology-goregaon", specialty: "Ophthalmology", station: "Goregaon", railLine: "Western" },
  { id: "mock-western-gastroenterology-borivali", specialty: "Gastroenterology", station: "Borivali", railLine: "Western" },
  { id: "mock-harbour-psychiatry-sewri", specialty: "Psychiatry", station: "Sewri", railLine: "Harbour" },
  { id: "mock-harbour-endocrinology-chembur", specialty: "Endocrinology", station: "Chembur", railLine: "Harbour" },
  { id: "mock-harbour-pulmonology-vashi", specialty: "Pulmonology", station: "Vashi", railLine: "Harbour" },
  { id: "mock-harbour-gynecology-panvel", specialty: "Gynecology", station: "Panvel", railLine: "Harbour" },
];

// Assembles the live doctor directory by joining definitions with railway stations and GPS coordinates
export const mockDoctorDirectory: MockDoctorDirectoryEntry[] = CONTROLLED_DIRECTORY_DEFINITIONS.map((definition) => {
  const station = MUMBAI_RAIL_STATIONS.find((candidate) => candidate.name === definition.station);                  // Find transit station metadata
  const coordinate = MUMBAI_STATION_COORDINATES[definition.station];                                                // Retrieve exact GPS coordinates
  if (!station || !coordinate) throw new Error(`Missing controlled directory reference data for ${definition.station}`); // Ensure valid configuration

  return {
    id: definition.id,                                                                                             // Unique specialist ID
    name: `Controlled ${definition.specialty} Specialist — ${definition.station}`,                                 // Formatted doctor title
    specialty: definition.specialty,                                                                               // Specialty domain
    hospital: "LifeLink controlled specialist directory",                                                           // Facility affiliation
    locality: definition.station,                                                                                  // Station neighborhood
    city: "Mumbai",                                                                                                // Geographical city
    railLine: definition.railLine,                                                                                 // Transit line
    railLines: station.lines,                                                                                      // All intersecting lines
    station: station.name,                                                                                         // Station name
    latitude: coordinate.latitude,                                                                                 // GPS latitude
    longitude: coordinate.longitude,                                                                               // GPS longitude
    isMock: true,                                                                                                  // Controlled account marker
  };
});

// Helper to sanitize search input strings for case-insensitive matching
function normalized(value?: string) {
  return value?.trim().toLowerCase() ?? "";                                                                        // Clean and lowercase
}

/** Filters only the controlled specialist directory; no external provider data is queried. */
export function filterMockDoctorDirectory(filters: MockDoctorDirectoryFilters = {}) {
  const specialty = normalized(filters.specialty);                                                                 // Target specialty filter
  const locality = normalized(filters.locality);                                                                   // Target locality filter
  const station = normalized(filters.station);                                                                     // Target station filter
  const query = normalized(filters.query);                                                                         // Free-text query

  return mockDoctorDirectory.filter((doctor) => {
    if (filters.city && doctor.city !== filters.city) return false;                                                // Restrict to specified city
    if (filters.railLine && !doctor.railLines.includes(filters.railLine)) return false;                            // Restrict to rail lines
    if (station && doctor.station.toLowerCase() !== station) return false;                                         // Match station name
    if (specialty && doctor.specialty.toLowerCase() !== specialty) return false;                                   // Match clinical specialty
    if (locality && doctor.locality.toLowerCase() !== locality) return false;                                     // Match geographic locality
    if (query && !doctor.specialty.toLowerCase().includes(query)) return false;                                    // Match search query string
    return true;                                                                                                   // Passes all active filters
  });
}

// Computes unique filter options and dropdown categories available across the directory
export function getMockDoctorDirectoryFacets() {
  const supportedStations = MUMBAI_RAIL_STATIONS.filter((station) => mockDoctorDirectory.some((doctor) => doctor.station === station.name));
  return {
    city: "Mumbai" as const,                                                                                       // City boundary
    specialties: Array.from(new Set(mockDoctorDirectory.map((doctor) => doctor.specialty))).sort(),                // Sorted unique specialties
    localities: Array.from(new Set(mockDoctorDirectory.map((doctor) => doctor.locality))).sort(),                  // Sorted unique localities
    railLines: MUMBAI_RAIL_LINES,                                                                                  // Supported transit lines
    stations: supportedStations,                                                                                   // Supported railway stations
  };
}

// Retrieves a single doctor entry from the directory by ID, or null if not found
export function getMockDoctorById(id: string) {
  return mockDoctorDirectory.find((doctor) => doctor.id === id) ?? null;                                           // Lookup doctor by id
}
