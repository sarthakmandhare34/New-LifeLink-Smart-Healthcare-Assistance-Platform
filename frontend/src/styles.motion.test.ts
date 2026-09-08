import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const styles = readFileSync(new URL('./index.css', import.meta.url), 'utf8');

describe('LifeLink motion system', () => {
  it('adds deliberate entrance and interaction motion behind an opt-in reduced-motion guard', () => {
    expect(styles).toContain('@keyframes lifelink-auth-card-in');
    expect(styles).toContain('@keyframes lifelink-field-rise');
    expect(styles).toContain('@media (prefers-reduced-motion: no-preference)');
    expect(styles).toContain('animation-delay: 120ms');
    expect(styles).toContain('560ms cubic-bezier');
    expect(styles).toContain('lifelink-orb-drift 22s');
    expect(styles).toContain('scale(.98)');
  });

  it('removes non-essential animations and transforms when reduced motion is requested', () => {
    expect(styles).toContain('@media (prefers-reduced-motion: reduce)');
    expect(styles).toContain('animation: none !important');
    expect(styles).toContain('transform: none !important');
  });
});
