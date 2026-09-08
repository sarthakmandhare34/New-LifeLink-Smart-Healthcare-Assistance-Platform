import { randomBytes, timingSafeEqual } from "node:crypto";
import { parse as parseCookieHeader } from "cookie";
import type { Express, Request, Response } from "express";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { COOKIE_NAME, ONE_YEAR_MS } from "../../shared/const";
import { ProviderAccountConflictError, ProviderRegistrationRequiredError, resolveProviderPatient } from "../db";
import { getSessionCookieOptions } from "../_core/cookies";
import { ENV } from "../_core/env";
import { authSession } from "./authUtil";

const PROVIDER_STATE_COOKIE = "lifelink_google_oauth_state";
const STATE_MAX_AGE_MS = 10 * 60 * 1000;
const GOOGLE_JWKS = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));

type ProviderIntent = "sign-in" | "register";
type StoredState = { state: string; nonce: string; expiresAt: number; intent: ProviderIntent };
type ProviderConfig = Pick<typeof ENV, "authPublicBaseUrl" | "googleOAuthClientId" | "googleOAuthClientSecret">;

function getPublicBaseUrl() {
  try {
    const parsed = new URL(ENV.authPublicBaseUrl);
    const isLocalhost = parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";
    return (parsed.protocol === "https:" || isLocalhost) ? parsed.origin.replace(/\/$/, "") : "";
  } catch {
    return "";
  }
}

export function googleAvailabilityFromConfig(config: { authPublicBaseUrl: string; googleOAuthClientId: string; googleOAuthClientSecret: string }) {
  let hasValidBase = false;
  try {
    const url = new URL(config.authPublicBaseUrl);
    const isLocalDev = (url.hostname === "localhost" || url.hostname === "127.0.0.1") && url.port !== "3000";
    hasValidBase = url.protocol === "https:" || isLocalDev;
  } catch { /* An empty or invalid public origin must keep Google unavailable. */ }
  return hasValidBase && Boolean(config.googleOAuthClientId && config.googleOAuthClientSecret);
}

export function googleAuthorizationStartUrlFromConfig(config: ProviderConfig, intent: ProviderIntent = "sign-in") {
  if (!googleAvailabilityFromConfig(config)) return null;
  const startUrl = new URL("/api/auth/google", new URL(config.authPublicBaseUrl).origin);
  if (intent === "register") startUrl.searchParams.set("intent", "register");
  return startUrl.toString();
}

export function getProviderAvailability() {
  return {
    google: googleAvailabilityFromConfig(ENV),
    googleAuthorizationStartUrl: googleAuthorizationStartUrlFromConfig(ENV),
    googleRegistrationStartUrl: googleAuthorizationStartUrlFromConfig(ENV, "register"),
  };
}

function callbackUrl() {
  return `${getPublicBaseUrl()}/api/auth/google/callback`;
}

function storeState(req: Request, res: Response, intent: ProviderIntent) {
  const stored: StoredState = {
    state: randomBytes(32).toString("base64url"),
    nonce: randomBytes(32).toString("base64url"),
    expiresAt: Date.now() + STATE_MAX_AGE_MS,
    intent,
  };
  res.cookie(PROVIDER_STATE_COOKIE, Buffer.from(JSON.stringify(stored)).toString("base64url"), {
    ...getSessionCookieOptions(req),
    maxAge: STATE_MAX_AGE_MS,
  });
  return stored;
}

function clearState(req: Request, res: Response) {
  res.clearCookie(PROVIDER_STATE_COOKIE, getSessionCookieOptions(req));
}

function getState(req: Request, receivedState: string | undefined) {
  if (!receivedState) return null;
  const raw = parseCookieHeader(req.headers.cookie ?? "")[PROVIDER_STATE_COOKIE];
  if (!raw) return null;
  try {
    const stored = JSON.parse(Buffer.from(raw, "base64url").toString("utf8")) as StoredState;
    if (stored.expiresAt < Date.now()) return null;
    const expected = Buffer.from(stored.state);
    const actual = Buffer.from(receivedState);
    return expected.length === actual.length && timingSafeEqual(expected, actual) ? stored : null;
  } catch {
    return null;
  }
}

function redirectWithError(res: Response, code: string) {
  res.redirect(302, `/login?authError=${encodeURIComponent(code)}`);
}

async function exchangeGoogleCode(code: string, nonce: string) {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: ENV.googleOAuthClientId,
      client_secret: ENV.googleOAuthClientSecret,
      redirect_uri: callbackUrl(),
      grant_type: "authorization_code",
    }),
  });
  const data = await response.json().catch(() => null) as { id_token?: string } | null;
  if (!response.ok || !data?.id_token) throw new Error("Google token exchange failed");
  const { payload } = await jwtVerify(data.id_token, GOOGLE_JWKS, {
    issuer: ["https://accounts.google.com", "accounts.google.com"],
    audience: ENV.googleOAuthClientId,
  });
  const email = typeof payload.email === "string" ? payload.email : "";
  if (!payload.sub || !email || payload.email_verified !== true || payload.nonce !== nonce) throw new Error("Google identity could not be verified");
  return { provider: "google" as const, subject: payload.sub, email, name: typeof payload.name === "string" ? payload.name : null };
}

async function establishGoogleSession(req: Request, res: Response, profile: Awaited<ReturnType<typeof exchangeGoogleCode>>, intent: ProviderIntent) {
  const user = await resolveProviderPatient(profile, { allowNewProviderAccount: intent === "register" });
  const token = await authSession.createSessionToken(user.openId, { name: user.name || "LifeLink Patient", expiresInMs: ONE_YEAR_MS });
  res.cookie(COOKIE_NAME, token, { ...getSessionCookieOptions(req), maxAge: ONE_YEAR_MS });
  res.redirect(302, "/patient/dashboard");
}

function startGoogle(req: Request, res: Response) {
  if (!getProviderAvailability().google) {
    res.status(503).json({ error: "Google sign-in is not configured yet." });
    return;
  }
  const intent: ProviderIntent = req.query.intent === "register" ? "register" : "sign-in";
  const stored = storeState(req, res, intent);
  const authorizeUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authorizeUrl.search = new URLSearchParams({
    client_id: ENV.googleOAuthClientId,
    redirect_uri: callbackUrl(),
    response_type: "code",
    scope: "openid email profile",
    state: stored.state,
    nonce: stored.nonce,
    prompt: "select_account",
  }).toString();
  res.redirect(302, authorizeUrl.toString());
}

async function finishGoogle(req: Request, res: Response) {
  const receivedState = typeof req.query.state === "string" ? req.query.state : undefined;
  const state = getState(req, receivedState);
  clearState(req, res);
  if (!state) return redirectWithError(res, "invalid_provider_state");
  const providerError = typeof req.query.error === "string" ? req.query.error : undefined;
  const code = typeof req.query.code === "string" ? req.query.code : undefined;
  if (providerError || !code) return redirectWithError(res, "provider_sign_in_cancelled");
  try {
    await establishGoogleSession(req, res, await exchangeGoogleCode(code, state.nonce), state.intent);
  } catch (error) {
    console.warn("[ProviderAuth] Google callback failed", error instanceof Error ? error.name : "unknown");
    redirectWithError(res, error instanceof ProviderRegistrationRequiredError ? "registration_required" : error instanceof ProviderAccountConflictError ? "account_exists" : "provider_sign_in_failed");
  }
}

export function registerProviderAuthRoutes(app: Express) {
  app.get("/api/auth/google", startGoogle);
  app.get("/api/auth/google/callback", (req, res) => { void finishGoogle(req, res); });
  app.all(["/api/auth/apple", "/api/auth/apple/*"], (_req, res) => {
    res.status(404).json({ error: "Apple sign-in is not enabled for this project." });
  });
}
