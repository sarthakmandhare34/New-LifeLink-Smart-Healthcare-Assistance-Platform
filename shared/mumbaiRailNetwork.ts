/**
 * Owner-supplied Mumbai suburban railway reference. Stations are derived as
 * single entities from corridor sequences so interchanges do not become
 * duplicate station records.
 */
export const MUMBAI_RAIL_LINES = ["Central", "Harbour", "Western"] as const;
export type MumbaiRailLine = typeof MUMBAI_RAIL_LINES[number];

export type MumbaiRailCorridor = {
  id: string;
  line: MumbaiRailLine;
  label: string;
  stations: readonly string[];
};

export type MumbaiRailStation = {
  id: string;
  name: string;
  lines: readonly MumbaiRailLine[];
};

const stationId = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

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

export const MUMBAI_RAIL_STATIONS: readonly MumbaiRailStation[] = (() => {
  const stations = new Map<string, { id: string; name: string; lines: MumbaiRailLine[] }>();
  MUMBAI_RAIL_CORRIDORS.forEach((corridor) => {
    corridor.stations.forEach((name) => {
      const existing = stations.get(name);
      if (existing) {
        if (!existing.lines.includes(corridor.line)) existing.lines.push(corridor.line);
        return;
      }
      stations.set(name, { id: stationId(name), name, lines: [corridor.line] });
    });
  });
  return Array.from(stations.values());
})();

export function getMumbaiRailStation(name: string) {
  return MUMBAI_RAIL_STATIONS.find((station) => station.name === name) ?? null;
}

export function getMumbaiRailCorridors(line?: MumbaiRailLine) {
  return line ? MUMBAI_RAIL_CORRIDORS.filter((corridor) => corridor.line === line) : MUMBAI_RAIL_CORRIDORS;
}
