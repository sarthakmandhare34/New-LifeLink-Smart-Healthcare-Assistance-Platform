import { afterEach, describe, expect, it, vi } from 'vitest';
import { PATIENT_ACTIVITY_EVENTS, registerPatientInactivityTimer } from './patientInactivity';

describe('patient inactivity timer', () => {
  afterEach(() => vi.useRealTimers());

  it('expires once after the configured period without patient activity', () => {
    vi.useFakeTimers();
    const onTimeout = vi.fn();
    const target = new EventTarget();

    registerPatientInactivityTimer(target, onTimeout, 1_000);
    vi.advanceTimersByTime(1_000);

    expect(onTimeout).toHaveBeenCalledTimes(1);
  });

  it('resets on supported activity and cleans up all event listeners', () => {
    vi.useFakeTimers();
    const onTimeout = vi.fn();
    const target = new EventTarget();
    const stop = registerPatientInactivityTimer(target, onTimeout, 1_000);

    vi.advanceTimersByTime(750);
    target.dispatchEvent(new Event('keydown'));
    vi.advanceTimersByTime(750);
    expect(onTimeout).not.toHaveBeenCalled();

    stop();
    PATIENT_ACTIVITY_EVENTS.forEach((event) => target.dispatchEvent(new Event(event)));
    vi.advanceTimersByTime(1_500);
    expect(onTimeout).not.toHaveBeenCalled();
  });
});
