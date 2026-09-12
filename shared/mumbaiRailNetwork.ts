// =========================================================================================
// MUMBAI SUBURBAN RAILWAY TRANSIT NETWORK REFERENCE
// Models the three primary suburban rail lines (Western, Central, Harbour) and their corridors.
// Used by the Specialist Finder to map specialist clinics and compute transit access for patients.
// =========================================================================================

export const MUMBAI_RAIL_LINES = ["Central", "Harbour", "Western"] as const;                     // The three major Mumbai suburban railway networks
export type MumbaiRailLine = typeof MUMBAI_RAIL_LINES[number];                                   // Rail line union type

// Corridor sequence representation
export type MumbaiRailCorridor = {
  id: string;                                                                                   // Unique slug identifier
  line: MumbaiRailLine;                                                                         // Network division
  label: string;                                                                                // Route label
  stations: readonly string[];                                                                  // Ordered list of station names
};

// Station representation with multi-line interchange tracking
export type MumbaiRailStation = {
  id: string;                                                                                   // Station slug
  name: string;                                                                                 // Official station name
  lines: readonly MumbaiRailLine[];                                                             // All lines serving this station (e.g. Dadar serves Central & Western)
};

// Generates a kebab-cased slug from a station name
const stationId = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

// Complete list of rail corridors spanning Greater Mumbai
export const MUMBAI_RAIL_CORRIDORS: readonly MumbaiRailCorridor[] = [
  {
    id: "western-churchgate-virar",
    line: "Western",
    label: "Churchgate → Virar",
    stations: ["Churchgate", "Marine Lines", "Charni Road", "Grant Road", "Mumbai Central", "Mahalaxmi", "Lower Parel", "Prabhadevi", "Dadar", "Matunga Road", "Mahim Junction", "Bandra", "Khar Road", "Santacruz", "Vile Parle", "Andheri", "Jogeshwari", "Ram Mandir", "Goregaon", "Malad", "Kandivali", "Borivali", "Dahisar", "Mira Road", "Bhayandar", "Naigaon", "Vasai Road", "Nala Sopara", "Virar"],
  },
  {
    id: "central-csmt-kalyan",
    line: "Central",
    label: "CSMT → Kalyan",
    stations: ["CSMT", "Masjid", "Sandhurst Road", "Byculla", "Chinchpokli", "Currey Road", "Parel", "Dadar", "Matunga", "Sion", "Kurla", "Vidyavihar", "Ghatkopar", "Vikhroli", "Kanjur Marg", "Bhandup", "Nahur", "Mulund", "Thane", "Kalwa", "Mumbra", "Diva Junction", "Kopar", "Dombivli", "Thakurli", "Kalyan Junction"],
  },
  {
    id: "central-kalyan-kasara",
    line: "Central",
    label: "Kalyan → Kasara",
    stations: ["Kalyan Junction", "Shahad", "Ambivli", "Titwala", "Khadavli", "Vasind", "Asangaon", "Atgaon", "Thansit", "Khardi", "Kasara"],
  },
  {
    id: "central-kalyan-karjat",
    line: "Central",
    label: "Kalyan → Karjat",
    stations: ["Kalyan Junction", "Vithalwadi", "Ulhasnagar", "Ambernath", "Badlapur", "Vangani", "Shelu", "Neral", "Bhivpuri Road", "Karjat"],
  },
  {
    id: "central-karjat-khopoli",
    line: "Central",
    label: "Karjat → Khopoli",
    stations: ["Karjat", "Palasdari", "Kelavli", "Dolavli", "Lowjee", "Khopoli"],
  },
  {
    id: "harbour-csmt-wadala-road",
    line: "Harbour",
    label: "CSMT → Wadala Road",
    stations: ["CSMT", "Masjid", "Sandhurst Road", "Dockyard Road", "Reay Road", "Cotton Green", "Sewri", "Wadala Road"],
  },
  {
    id: "harbour-wadala-road-panvel",
    line: "Harbour",
    label: "Wadala Road → Panvel",
    stations: ["Wadala Road", "GTB Nagar", "Chunabhatti", "Kurla", "Tilak Nagar", "Chembur", "Govandi", "Mankhurd", "Vashi", "Sanpada", "Juinagar", "Nerul", "Seawoods-Darave", "CBD Belapur", "Kharghar", "Mansarovar", "Khandeshwar", "Panvel"],
  },
  {
    id: "harbour-wadala-road-goregaon",
    line: "Harbour",
    label: "Wadala Road → Goregaon",
    stations: ["Wadala Road", "Kings Circle", "Mahim Junction", "Bandra", "Khar Road", "Santacruz", "Vile Parle", "Andheri", "Jogeshwari", "Ram Mandir", "Goregaon"],
  },
];

// Deduplicates stations across corridors into distinct station entities with merged lines
export const MUMBAI_RAIL_STATIONS: readonly MumbaiRailStation[] = (() => {
  const stations = new Map<string, { id: string; name: string; lines: MumbaiRailLine[] }>();
  MUMBAI_RAIL_CORRIDORS.forEach((corridor) => {
    corridor.stations.forEach((name) => {
      const existing = stations.get(name);
      if (existing) {
        if (!existing.lines.includes(corridor.line)) existing.lines.push(corridor.line);          // Merge line
        return;
      }
      stations.set(name, { id: stationId(name), name, lines: [corridor.line] });                 // Add new station
    });
  });
  return Array.from(stations.values());                                                         // Convert map to array
})();

// Lookup a station by name
export function getMumbaiRailStation(name: string) {
  return MUMBAI_RAIL_STATIONS.find((station) => station.name === name) ?? null;
}

// Lookup corridors for a specific rail line
export function getMumbaiRailCorridors(line?: MumbaiRailLine) {
  return line ? MUMBAI_RAIL_CORRIDORS.filter((corridor) => corridor.line === line) : MUMBAI_RAIL_CORRIDORS;
}
