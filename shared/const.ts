// --- Cluster: Session & Cookie Identifiers ---
export const COOKIE_NAME = "app_session_id";                     // Name of the secure HTTP cookie storing patient login sessions
export const DOCTOR_COOKIE_NAME = "doctor_session_id";           // Name of the secure HTTP cookie storing clinician workstation sessions
export const ONE_YEAR_MS = 1000 * 60 * 60 * 24 * 365;           // One full year in milliseconds (used for persistent session duration)
export const AXIOS_TIMEOUT_MS = 30_000;                          // Maximum 30-second network timeout for external API requests
export const UNAUTHED_ERR_MSG = 'Please login (10001)';          // Error message displayed when an unauthenticated user calls a protected route
export const NOT_ADMIN_ERR_MSG = 'You do not have required permission (10002)'; // Error message displayed when a non-admin calls admin endpoints

// --- Cluster: OAuth State & CSRF Protection ---
// The `__Host-` prefix forces the cookie to be host-only (Secure, Path=/, no Domain),
// preventing malicious subdomain cookie hijacking attacks during Google login.
export const OAUTH_STATE_COOKIE = "__Host-oauth_state";          // Name of the anti-CSRF state tracking cookie for OAuth

// Carries the redirect destination plus a random CSRF nonce between Google and LifeLink
export type OAuthState = { redirectUri: string; nonce?: string }; // Structure of the OAuth state payload

// Encodes the redirect URI and CSRF nonce into a URL-safe Base64 string
export const encodeOAuthState = (state: OAuthState): string =>
  btoa(JSON.stringify(state));                                   // Converts state object to Base64 string for URL transport

// Decodes and validates the OAuth state string returned by Google callback
export const decodeOAuthState = (state: string): OAuthState => {
  let decoded: string;                                           // Temporary storage for raw decoded text
  try {
    decoded = atob(state);                                       // Decode Base64 string into plain JSON text
  } catch {
    // If attacker provides malformed Base64, return empty redirect to trigger clean 403 rejection
    return { redirectUri: "" };                                  // Reject invalid Base64 safely without throwing
  }
  try {
    const parsed = JSON.parse(decoded);                          // Parse decoded JSON payload
    if (parsed && typeof parsed.redirectUri === "string") return parsed; // Return structured OAuth state
  } catch {
    // Gracefully handle legacy plain string redirect URIs
  }
  return { redirectUri: decoded };                               // Fallback returning plain redirect URI
};

// --- Cluster: The 12 In-System Doctor Specialties ---
// This is LifeLink's single source of truth for clinical departments.
// Every doctor in our directory and every AI triage recommendation belongs to one of these 12 fields.
export const SYSTEM_DOCTOR_SPECIALTIES = [
  "Cardiology",                                                  // Heart & cardiovascular conditions
  "Dermatology",                                                 // Skin, hair, nail, and rash conditions
  "Endocrinology",                                               // Diabetes, thyroid, and male/female hormone disorders
  "Gastroenterology",                                            // Stomach, digestion, liver, and acid reflux conditions
  "General Practice",                                            // Family medicine, colds/flu, and unlisted fields (ENT/Urology)
  "Gynecology",                                                  // Female reproductive health for adult females (18+)
  "Neurology",                                                   // Brain, headaches, nerves, and neurological conditions
  "Ophthalmology",                                               // Vision, eye health, and ophthalmic conditions
  "Orthopedics",                                                 // Bones, joints, spine, and musculoskeletal injuries
  "Pediatrics",                                                  // Comprehensive medical care for all patients under 18
  "Pulmonology",                                                 // Lungs, asthma, chronic cough, and respiratory care
  "Psychiatry",                                                  // Mental health, anxiety, depression, and emotional wellness
] as const;

export type SystemDoctorSpecialty = (typeof SYSTEM_DOCTOR_SPECIALTIES)[number]; // Strict TypeScript union type of the 12 specialties

