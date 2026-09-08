import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const globalStyles = readFileSync(new URL('./index.css', import.meta.url), 'utf8');
const discoveryStyles = readFileSync(new URL('./features/patient/Specialists/specialistFinder.css', import.meta.url), 'utf8');

describe('multi-display responsive layout system', () => {
  it('defines wide desktop, laptop/tablet, mobile, and compact touch-screen layout rules', () => {
    expect(globalStyles).toContain('@media (min-width: 1280px)');
    expect(globalStyles).toContain('@media (min-width: 769px) and (max-width: 1024px)');
    expect(globalStyles).toContain('@media (max-width: 768px)');
    expect(globalStyles).toContain('@media (max-width: 480px)');
    expect(globalStyles).toContain('min-height: 44px');
  });

  it('keeps the Specialist Finder map and filters responsive from tablet to compact mobile', () => {
    expect(discoveryStyles).toContain('grid-template-columns: repeat(2, minmax(0, 1fr))');
    expect(discoveryStyles).toContain('grid-template-columns: 1fr;');
    expect(discoveryStyles).toContain('height: clamp(280px, 62vw, 360px)');
    expect(discoveryStyles).toContain('@media (max-width: 640px)');
    expect(discoveryStyles).toContain('min-height: 52px');
    expect(discoveryStyles).toContain('touch-action: manipulation');
    expect(discoveryStyles).toContain('outline: 3px solid');
  });

  it('keeps the mobile drawer compact with its official brand first and every navigation label readable', () => {
    expect(globalStyles).toContain('width: min(276px, calc(100vw - 72px))');
    expect(globalStyles).toContain('flex-direction: column;');
    expect(globalStyles).toContain('.app-sidebar-header .lifelink-logo-sidebar');
    expect(globalStyles).toContain('overflow-x: hidden');
    expect(globalStyles).toContain('display: inline !important');
    expect(globalStyles).toContain('overflow-wrap: anywhere');
  });

  it('defines aligned care shortcuts and a responsive circular profile-photo control', () => {
    expect(globalStyles).toContain('.dashboard-quick-action');
    expect(globalStyles).toContain('grid-template-columns: minmax(0, 1fr) auto');
    expect(globalStyles).toContain('.patient-profile-avatar');
    expect(globalStyles).toContain('object-fit: cover');
  });
});
