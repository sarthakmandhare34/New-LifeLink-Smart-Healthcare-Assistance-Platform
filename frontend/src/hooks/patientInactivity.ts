export const PATIENT_INACTIVITY_LIMIT_MS = 5 * 60 * 1000;

export const PATIENT_ACTIVITY_EVENTS = [
  'mousemove',
  'keydown',
  'mousedown',
  'touchstart',
  'scroll',
] as const;

type ActivityTarget = Pick<EventTarget, 'addEventListener' | 'removeEventListener'>;

/** Starts one resettable inactivity timer and returns the cleanup required on sign-out or shell unmount. */
export function registerPatientInactivityTimer(
  target: ActivityTarget,
  onTimeout: () => void,
  limitMs = PATIENT_INACTIVITY_LIMIT_MS,
) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let stopped = false;

  const cleanup = () => {
    if (timer !== undefined) clearTimeout(timer);
    PATIENT_ACTIVITY_EVENTS.forEach((event) => target.removeEventListener(event, resetTimer, true));
  };

  const expire = () => {
    if (stopped) return;
    stopped = true;
    cleanup();
    onTimeout();
  };

  const resetTimer = () => {
    if (stopped) return;
    if (timer !== undefined) clearTimeout(timer);
    timer = setTimeout(expire, limitMs);
  };

  PATIENT_ACTIVITY_EVENTS.forEach((event) => target.addEventListener(event, resetTimer, true));
  resetTimer();

  return () => {
    if (stopped) return;
    stopped = true;
    cleanup();
  };
}
