import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const documentSource = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const globalStyles = readFileSync(new URL('./index.css', import.meta.url), 'utf8');

describe('LifeLink typography', () => {
  it('loads Oxanium and applies it to the global body and heading hierarchy', () => {
    expect(documentSource).toContain('family=Oxanium');
    expect(globalStyles).toContain("font-family: 'Oxanium'");
    expect(globalStyles).toContain(".app-mobile-brand { display: none; align-items: center; gap: 7px; min-width: 0; color: var(--color-text); font-family: 'Oxanium'");
  });
});
