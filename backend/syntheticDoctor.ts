import { getMockDoctorById, type MockDoctorDirectoryEntry } from "./discovery/mockDoctorDirectory";

const SYNTHETIC_DOCTOR_OPEN_ID_PREFIX = "synthetic-doctor:";

export function getSyntheticDoctor(doctorId: string): MockDoctorDirectoryEntry | null {
  return getMockDoctorById(doctorId);
}

export function syntheticDoctorOpenId(doctorId: string) {
  return `${SYNTHETIC_DOCTOR_OPEN_ID_PREFIX}${doctorId}`;
}

export function doctorIdFromSyntheticOpenId(openId: string) {
  if (!openId.startsWith(SYNTHETIC_DOCTOR_OPEN_ID_PREFIX)) return null;
  const doctorId = openId.slice(SYNTHETIC_DOCTOR_OPEN_ID_PREFIX.length);
  return getSyntheticDoctor(doctorId)?.id ?? null;
}

export function doctorDisplayName(doctor: MockDoctorDirectoryEntry) {
  return `Controlled ${doctor.specialty} Specialist — ${doctor.station}`;
}
