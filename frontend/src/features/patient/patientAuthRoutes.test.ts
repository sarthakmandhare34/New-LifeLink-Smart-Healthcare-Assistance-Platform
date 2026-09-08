import { describe, expect, it } from 'vitest';
import { PATIENT_DASHBOARD_PATH } from './patientAuthRoutes';

describe('patient authentication destination', () => {
  it('uses the protected patient dashboard after successful native authentication', () => {
    expect(PATIENT_DASHBOARD_PATH).toBe('/patient/dashboard');
  });
});
