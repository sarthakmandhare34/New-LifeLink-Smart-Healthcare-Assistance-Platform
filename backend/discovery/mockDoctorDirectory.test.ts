import { describe, expect, it } from "vitest";
import { filterMockDoctorDirectory, getMockDoctorDirectoryFacets, mockDoctorDirectory } from "./mockDoctorDirectory";
import { MUMBAI_RAIL_LINES, getMumbaiRailStation } from "@shared/mumbaiRailNetwork";
import { MUMBAI_STATION_COORDINATES } from "@shared/mumbaiStationCoordinates";

describe("controlled Mumbai specialist directory", () => {
  it("keeps a compact, explicitly controlled 12-specialty catalog", () => {
    expect(mockDoctorDirectory).toHaveLength(12);
    expect(new Set(mockDoctorDirectory.map((entry) => entry.specialty))).toHaveLength(12);
    mockDoctorDirectory.forEach((entry) => {
      expect(entry.isMock).toBe(true);
      expect(entry.hospital).toBe("LifeLink controlled specialist directory");
      expect(entry.latitude).toBe(MUMBAI_STATION_COORDINATES[entry.station].latitude);
      expect(entry.longitude).toBe(MUMBAI_STATION_COORDINATES[entry.station].longitude);
    });
  });

  it("spreads controlled specialties across distinct Mumbai locations while retaining three-corridor coverage", () => {
    expect(new Set(mockDoctorDirectory.map((entry) => entry.station))).toEqual(new Set(["CSMT", "Ghatkopar", "Bhandup", "Thane", "Churchgate", "Andheri", "Goregaon", "Borivali", "Sewri", "Chembur", "Vashi", "Panvel"]));
    MUMBAI_RAIL_LINES.forEach((railLine) => {
      const primaryEntries = mockDoctorDirectory.filter((entry) => entry.railLine === railLine);
      const specialties = new Set(filterMockDoctorDirectory({ railLine }).map((entry) => entry.specialty));
      expect(primaryEntries).toHaveLength(4);
      expect(specialties.size).toBeGreaterThanOrEqual(3);
    });
  });

  it("preserves supplied shared-station associations without multiplying the catalog", () => {
    expect(filterMockDoctorDirectory({ station: "CSMT", railLine: "Central" })).toHaveLength(1);
    expect(filterMockDoctorDirectory({ station: "CSMT", railLine: "Harbour" })).toHaveLength(1);
    expect(filterMockDoctorDirectory({ station: "Andheri", railLine: "Western" })).toHaveLength(1);
    expect(filterMockDoctorDirectory({ station: "Andheri", railLine: "Harbour" })).toHaveLength(1);
    expect(getMumbaiRailStation("CSMT")?.lines).toEqual(["Central", "Harbour"]);
    expect(getMumbaiRailStation("Panvel")?.lines).toEqual(["Harbour"]);
  });

  it("publishes only supported station facets and specialty-only free-text matching", () => {
    const facets = getMockDoctorDirectoryFacets();
    expect(facets.stations).toHaveLength(12);
    expect(facets).toMatchObject({
      city: "Mumbai",
      specialties: expect.arrayContaining(["Cardiology", "Dermatology", "General Practice", "Pediatrics"]),
      railLines: ["Central", "Harbour", "Western"],
    });
    expect(filterMockDoctorDirectory({ query: "cardio" })).toSatisfy((entries) => entries.length > 0 && entries.every((entry) => entry.specialty === "Cardiology"));
    expect(filterMockDoctorDirectory({ query: "western" })).toEqual([]);
  });
});
