// Inactivity threshold duration: 5 minutes (in milliseconds)
export const PATIENT_INACTIVITY_LIMIT_MS = 5 * 60 * 1000;                                        // 5 minutes of idle time before automatic session termination

// DOM user interaction events monitored to refresh the idle countdown
export const PATIENT_ACTIVITY_EVENTS = [
  'mousemove',                                                                                  // Cursor motion
  'keydown',                                                                                    // Keyboard input
  'mousedown',                                                                                  // Mouse click press
  'touchstart',                                                                                 // Mobile touch interaction
  'scroll',                                                                                     // Viewport scrolling
] as const;

// Minimal EventTarget interface shape for attachment
type ActivityTarget = Pick<EventTarget, 'addEventListener' | 'removeEventListener'>;

// =========================================================================================
// PATIENT INACTIVITY TIMER & SESSION PROTECTOR
// Guarantees healthcare data privacy by monitoring user presence.
// If a patient walks away from their computer, after 5 minutes of inactivity the session
// automatically times out and cleans up event listeners to prevent memory leaks.
// =========================================================================================
export function registerPatientInactivityTimer(
  target: ActivityTarget,                                                                       // Browser window or document target
  onTimeout: () => void,                                                                        // Callback invoked on expiration (logout)
  limitMs = PATIENT_INACTIVITY_LIMIT_MS,                                                        // Configurable countdown limit
) {
  let timer: ReturnType<typeof setTimeout> | undefined;                                         // Active JavaScript timer reference
  let stopped = false;                                                                          // Termination lifecycle flag

  // Clears timer and detaches all event listeners from the DOM
  const cleanup = () => {
    if (timer !== undefined) clearTimeout(timer);                                               // Clear timeout handle
    PATIENT_ACTIVITY_EVENTS.forEach((event) => target.removeEventListener(event, resetTimer, true)); // Detach event listeners
  };

  // Called when timer reaches zero
  const expire = () => {
    if (stopped) return;                                                                        // Guard against redundant runs
    stopped = true;
    cleanup();                                                                                  // Detach listeners
    onTimeout();                                                                                // Execute sign-out handler
  };

  // Resets timer back to full limitMs countdown whenever patient interacts with page
  const resetTimer = () => {
    if (stopped) return;
    if (timer !== undefined) clearTimeout(timer);                                               // Cancel previous countdown
    timer = setTimeout(expire, limitMs);                                                        // Start fresh countdown
  };

  // Attach passive activity listeners using capture phase
  PATIENT_ACTIVITY_EVENTS.forEach((event) => target.addEventListener(event, resetTimer, true));
  resetTimer();                                                                                 // Prime the initial timer

  // Return teardown function for React useEffect unmount
  return () => {
    if (stopped) return;
    stopped = true;
    cleanup();
  };
}
