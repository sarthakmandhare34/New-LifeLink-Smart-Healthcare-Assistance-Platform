import { randomBytes, timingSafeEqual } from "node:crypto";                             // Cryptographic tools for generating CSRF state tokens and timing-safe checks
import { parse as parseCookieHeader } from "cookie";                                       // Cookie parser for reading OAuth state cookies
import type { Express, Request, Response } from "express";                                  // Express types for route handlers
import { createRemoteJWKSet, jwtVerify } from "jose";                                      // Fetches Google's public cryptographic keys to verify ID tokens
import { COOKIE_NAME, ONE_YEAR_MS } from "../../shared/const";                              // Standard patient session cookie name and duration
import { ProviderAccountConflictError, ProviderRegistrationRequiredError, resolveProviderPatient } from "../db"; // Patient account resolution in MySQL
import { getSessionCookieOptions } from "../_core/cookies";                                // Secure cookie options generator
import { ENV } from "../_core/env";                                                        // Central environment configuration
import { authSession } from "./authUtil";                                                  // JWT session token generator

const PROVIDER_STATE_COOKIE = "lifelink_google_oauth_state";                                // Temporary cookie storing CSRF anti-tampering state
const STATE_MAX_AGE_MS = 10 * 60 * 1000;                                                   // 10-minute state lifetime before expiration
const GOOGLE_JWKS = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs")); // Google public keys endpoint for signature verification

type ProviderIntent = "sign-in" | "register";                                              // Distinguishes logging into an existing account vs creating a new one
type StoredState = { state: string; nonce: string; expiresAt: number; intent: ProviderIntent }; // Data structure preserved across OAuth redirects
type ProviderConfig = Pick<typeof ENV, "authPublicBaseUrl" | "googleOAuthClientId" | "googleOAuthClientSecret">; // Config subset needed for OAuth

// Helper to determine the sanitized, protocol-correct public URL for OAuth redirect callbacks
function getPublicBaseUrl() {
  try {
    const parsed = new URL(ENV.authPublicBaseUrl);                                         // Parse configured public origin
    const isLocalhost = parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1"; // Identify local development environments
    return (parsed.protocol === "https:" || isLocalhost) ? parsed.origin.replace(/\/$/, "") : ""; // Require HTTPS unless local
  } catch {
    return "";                                                                             // Invalid or unconfigured URL
  }
}

// Determines if Google OAuth is fully configured and ready for user logins
export function googleAvailabilityFromConfig(config: { authPublicBaseUrl: string; googleOAuthClientId: string; googleOAuthClientSecret: string }) {
  let hasValidBase = false;
  try {
    const url = new URL(config.authPublicBaseUrl);                                         // Check base URL validity
    const isLocalDev = (url.hostname === "localhost" || url.hostname === "127.0.0.1") && url.port !== "3000";
    hasValidBase = url.protocol === "https:" || isLocalDev;                                // Verify HTTPS or local dev port
  } catch { /* An empty or invalid public origin must keep Google unavailable. */ }
  return hasValidBase && Boolean(config.googleOAuthClientId && config.googleOAuthClientSecret); // True only if client ID & secret are set
}

// Generates the initial authorization URL to initiate the Google OAuth flow
export function googleAuthorizationStartUrlFromConfig(config: ProviderConfig, intent: ProviderIntent = "sign-in") {
  if (!googleAvailabilityFromConfig(config)) return null;                                  // Abort if credentials or base URL missing
  const startUrl = new URL("/api/auth/google", new URL(config.authPublicBaseUrl).origin);  // Mount on API route
  if (intent === "register") startUrl.searchParams.set("intent", "register");              // Append registration intent parameter
  return startUrl.toString();                                                              // Return full URL string
}

// Returns a status object indicating whether Google authentication is active
export function getProviderAvailability() {
  return {
    google: googleAvailabilityFromConfig(ENV),                                             // Boolean status flag
    googleAuthorizationStartUrl: googleAuthorizationStartUrlFromConfig(ENV),               // Sign-in URL
    googleRegistrationStartUrl: googleAuthorizationStartUrlFromConfig(ENV, "register"),     // Registration URL
  };
}

// Returns the full callback URL where Google will redirect after user approves login
function callbackUrl() {
  return `${getPublicBaseUrl()}/api/auth/google/callback`;                                 // Full redirect endpoint path
}

// Stores CSRF state and cryptographic replay nonce in an HTTP-only temporary cookie
function storeState(req: Request, res: Response, intent: ProviderIntent) {
  const stored: StoredState = {
    state: randomBytes(32).toString("base64url"),                                          // 32-byte random CSRF mitigation token
    nonce: randomBytes(32).toString("base64url"),                                          // 32-byte random anti-replay token
    expiresAt: Date.now() + STATE_MAX_AGE_MS,                                              // Absolute timestamp of expiry
    intent,                                                                                // 'sign-in' or 'register'
  };
  res.cookie(PROVIDER_STATE_COOKIE, Buffer.from(JSON.stringify(stored)).toString("base64url"), { // Serialize state as base64url JSON
    ...getSessionCookieOptions(req),                                                       // Apply secure cookie settings
    maxAge: STATE_MAX_AGE_MS,                                                              // Expire in 10 minutes
  });
  return stored;                                                                           // Return state for URL query parameters
}

// Clears the temporary CSRF state cookie from the user's browser
function clearState(req: Request, res: Response) {
  res.clearCookie(PROVIDER_STATE_COOKIE, getSessionCookieOptions(req));                    // Instruct client to drop cookie
}

// Validates the returned OAuth state against the stored cookie to prevent CSRF attacks
function getState(req: Request, receivedState: string | undefined) {
  if (!receivedState) return null;                                                         // State query parameter missing
  const raw = parseCookieHeader(req.headers.cookie ?? "")[PROVIDER_STATE_COOKIE];          // Read state cookie from request header
  if (!raw) return null;                                                                   // Cookie missing
  try {
    const stored = JSON.parse(Buffer.from(raw, "base64url").toString("utf8")) as StoredState; // Decode stored state
    if (stored.expiresAt < Date.now()) return null;                                        // Check if state has expired
    const expected = Buffer.from(stored.state);                                            // Cookie state buffer
    const actual = Buffer.from(receivedState);                                             // Query state buffer
    return expected.length === actual.length && timingSafeEqual(expected, actual) ? stored : null; // Timing-safe check
  } catch {
    return null;                                                                           // Parsing error
  }
}

// Redirects user back to the login page with a descriptive error query parameter
function redirectWithError(res: Response, code: string) {
  res.redirect(302, `/login?authError=${encodeURIComponent(code)}`);                       // 302 Found redirect
}

// Exchanges the authorization code received from Google for a signed Google ID token
async function exchangeGoogleCode(code: string, nonce: string) {
  const response = await fetch("https://oauth2.googleapis.com/token", {                    // Direct server-to-server POST to Google
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,                                                                                // Temporary authorization code from redirect
      client_id: ENV.googleOAuthClientId,                                                  // Google client ID
      client_secret: ENV.googleOAuthClientSecret,                                          // Google client secret
      redirect_uri: callbackUrl(),                                                         // Registered callback URI
      grant_type: "authorization_code",                                                    // OAuth 2.0 authorization code grant
    }),
  });
  const data = await response.json().catch(() => null) as { id_token?: string } | null;   // Parse JSON response
  if (!response.ok || !data?.id_token) throw new Error("Google token exchange failed");   // Check for valid response
  const { payload } = await jwtVerify(data.id_token, GOOGLE_JWKS, {                        // Cryptographically verify ID token against Google JWKS
    issuer: ["https://accounts.google.com", "accounts.google.com"],                        // Verified Google issuers
    audience: ENV.googleOAuthClientId,                                                     // Restrict audience to our application ID
  });
  const email = typeof payload.email === "string" ? payload.email : "";                    // Extract verified email
  if (!payload.sub || !email || payload.email_verified !== true || payload.nonce !== nonce) { // Anti-replay nonce check
    throw new Error("Google identity could not be verified");
  }
  return { provider: "google" as const, subject: payload.sub, email, name: typeof payload.name === "string" ? payload.name : null };
}

// Associates the Google profile with a LifeLink patient record and sets session cookie
async function establishGoogleSession(req: Request, res: Response, profile: Awaited<ReturnType<typeof exchangeGoogleCode>>, intent: ProviderIntent) {
  const user = await resolveProviderPatient(profile, { allowNewProviderAccount: intent === "register" }); // Find or create patient
  const token = await authSession.createSessionToken(user.openId, { name: user.name || "LifeLink Patient", expiresInMs: ONE_YEAR_MS }); // Sign JWT
  res.cookie(COOKIE_NAME, token, { ...getSessionCookieOptions(req), maxAge: ONE_YEAR_MS }); // Store patient session cookie
  res.redirect(302, "/patient/dashboard");                                                 // Redirect to patient dashboard
}

// Handles initial GET /api/auth/google: sets CSRF cookie and redirects to Google OAuth
function startGoogle(req: Request, res: Response) {
  if (!getProviderAvailability().google) {                                                 // Validate Google OAuth is ready
    res.status(503).json({ error: "Google sign-in is not configured yet." });
    return;
  }
  const intent: ProviderIntent = req.query.intent === "register" ? "register" : "sign-in"; // Read intended user action
  const stored = storeState(req, res, intent);                                             // Save CSRF state cookie
  const authorizeUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");            // Google OAuth dialog URL
  authorizeUrl.search = new URLSearchParams({
    client_id: ENV.googleOAuthClientId,                                                    // Application client ID
    redirect_uri: callbackUrl(),                                                           // Callback URL
    response_type: "code",                                                                 // Expect authorization code
    scope: "openid email profile",                                                         // Request basic identity scopes
    state: stored.state,                                                                   // Anti-CSRF token
    nonce: stored.nonce,                                                                   // Anti-replay token
    prompt: "select_account",                                                              // Prompt user to pick Google account
  }).toString();
  res.redirect(302, authorizeUrl.toString());                                              // Redirect browser to Google
}

// Handles GET /api/auth/google/callback: processes Google redirect, verifies token, sets cookie
async function finishGoogle(req: Request, res: Response) {
  const receivedState = typeof req.query.state === "string" ? req.query.state : undefined; // Extract state from redirect query
  const state = getState(req, receivedState);                                              // Verify against stored cookie
  clearState(req, res);                                                                    // Wipe state cookie immediately
  if (!state) return redirectWithError(res, "invalid_provider_state");                     // Reject if state mismatched or missing
  const providerError = typeof req.query.error === "string" ? req.query.error : undefined; // Check if user denied permissions
  const code = typeof req.query.code === "string" ? req.query.code : undefined;             // Extract authorization code
  if (providerError || !code) return redirectWithError(res, "provider_sign_in_cancelled"); // User cancelled auth
  try {
    await establishGoogleSession(req, res, await exchangeGoogleCode(code, state.nonce), state.intent); // Exchange code & login
  } catch (error) {
    console.warn("[ProviderAuth] Google callback failed", error instanceof Error ? error.name : "unknown");
    redirectWithError(res, error instanceof ProviderRegistrationRequiredError ? "registration_required" : error instanceof ProviderAccountConflictError ? "account_exists" : "provider_sign_in_failed");
  }
}

// Registers Google and placeholder OAuth endpoints directly onto the Express application
export function registerProviderAuthRoutes(app: Express) {
  app.get("/api/auth/google", startGoogle);                                                // Initiation route
  app.get("/api/auth/google/callback", (req, res) => { void finishGoogle(req, res); });    // OAuth redirect callback handler
  app.all(["/api/auth/apple", "/api/auth/apple/*"], (_req, res) => {                      // Apple Sign-In placeholder endpoint
    res.status(404).json({ error: "Apple sign-in is not enabled for this project." });
  });
}
