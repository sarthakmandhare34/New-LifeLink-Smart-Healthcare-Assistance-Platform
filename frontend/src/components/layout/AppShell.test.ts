import { describe, expect, it } from 'vitest';
import { LIFELINK_FULL_LOGO_PRESENTATION_CLASS, LIFELINK_OFFICIAL_LOGO_SYMBOL_URL, LIFELINK_OFFICIAL_LOGO_URL } from '../brand/LifeLinkLogo';
import { PATIENT_SIDEBAR_BRAND_LABEL } from './AppShell';

describe('patient sidebar branding', () => {
  it('provides an accessible home label for the LifeLink upper-left brand control', () => {
    expect(PATIENT_SIDEBAR_BRAND_LABEL).toBe('LifeLink patient home');
  });

  it('uses the owner-supplied official LifeLink artwork instead of a synthetic mark', () => {
    expect(LIFELINK_OFFICIAL_LOGO_URL).toBe('/assets/branding/lifelink-logo-lockup.png');
    expect(LIFELINK_OFFICIAL_LOGO_SYMBOL_URL).toBe('/assets/branding/lifelink-logo-symbol.png');
  });

  it('applies the dedicated full-wordmark presentation to preserve the visible tagline', () => {
    expect(LIFELINK_FULL_LOGO_PRESENTATION_CLASS).toBe('lifelink-logo-full');
  });
});
