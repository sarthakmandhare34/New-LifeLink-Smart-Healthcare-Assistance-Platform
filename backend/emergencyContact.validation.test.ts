import { describe, expect, it } from 'vitest';
import { emergencyContactInput } from './routers/patient';

describe('emergency contact phone validation', () => {
  it('accepts a patient-entered local or international contact number', () => {
    expect(emergencyContactInput.parse({
      name: 'Family contact',
      relationship: 'Sibling',
      phone: '+91 98765 43210',
    })).toMatchObject({ phone: '+91 98765 43210' });
  });

  it('rejects an empty, too-short, or non-phone emergency contact number', () => {
    expect(() => emergencyContactInput.parse({ name: 'Family contact', relationship: 'Sibling', phone: '' })).toThrow();
    expect(() => emergencyContactInput.parse({ name: 'Family contact', relationship: 'Sibling', phone: '1234' })).toThrow();
    expect(() => emergencyContactInput.parse({ name: 'Family contact', relationship: 'Sibling', phone: 'call-me' })).toThrow();
  });
});
