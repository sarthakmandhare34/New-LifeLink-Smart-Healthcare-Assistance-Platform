import { describe, expect, it, vi } from 'vitest';

vi.mock('react-leaflet', () => ({
  MapContainer: () => null,
  TileLayer: () => null,
  Marker: () => null,
  Popup: () => null,
  useMap: () => ({ flyTo: vi.fn() })
}));
vi.mock('leaflet', () => ({
  default: {
    icon: vi.fn(),
    Marker: { prototype: { options: {} } }
  }
}));
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { BROWSER_LOCATION_PRIVACY, BROWSER_LOCATION_TITLE, RESIDENCE_CORRIDOR_LABEL, RESIDENCE_STATION_LABEL, SPECIALTY_SEARCH_GUIDANCE, SPECIALIST_LOAD_ERROR_MESSAGE, SPECIALIST_LOAD_ERROR_TITLE } from './SpecialistFinder';

const finderSource = readFileSync(resolve(process.cwd(), 'frontend/src/features/patient/Specialists/SpecialistFinder.tsx'), 'utf8');
const finderStyles = readFileSync(resolve(process.cwd(), 'frontend/src/features/patient/Specialists/specialistFinder.css'), 'utf8');

describe('specialist finder residence prompts', () => {
  it('uses patient-centred wording for the Mumbai corridor and station choices', () => {
    expect(RESIDENCE_CORRIDOR_LABEL).toBe('Which part of Mumbai do you live in?');
    expect(RESIDENCE_STATION_LABEL).toBe('Which station is closest to where you live?');
  });

  it('states the optional browser-only location boundary without implying storage or external directory data', () => {
    expect(BROWSER_LOCATION_TITLE).toBe('Optional browser location');
    expect(BROWSER_LOCATION_PRIVACY).toContain('not stored or sent to LifeLink');
  });

  it('explains that free-text search is specialty-only while residence choices remain dedicated filters', () => {
    expect(SPECIALTY_SEARCH_GUIDANCE).toContain('specialties only');
    expect(SPECIALTY_SEARCH_GUIDANCE).toContain('station filters');
  });

  it('provides recoverable, non-technical data-load messaging', () => {
    expect(SPECIALIST_LOAD_ERROR_TITLE).toBe('We couldn’t load the specialist directory');
    expect(SPECIALIST_LOAD_ERROR_MESSAGE).toContain('check your connection');
    expect(SPECIALIST_LOAD_ERROR_MESSAGE).not.toContain('TRPC');
  });

  it('uses structured request fields and explicit dark-mode form contrast rules', () => {
    expect(finderSource).toContain('className="discovery-request-grid"');
    expect(finderSource).toContain('id="requested-visit-at"');
    expect(finderStyles).toContain(':root[data-theme="dark"] .discovery-refinement-card');
    expect(finderStyles).toContain(':root[data-theme="dark"] .discovery-request-field textarea');
    expect(finderStyles).toContain('.discovery-request-grid {');
  });
});
