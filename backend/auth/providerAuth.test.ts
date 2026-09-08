import type { Express } from "express";
import { describe, expect, it, vi } from "vitest";
import { googleAuthorizationStartUrlFromConfig, googleAvailabilityFromConfig, registerProviderAuthRoutes } from "./providerAuth";

const completeConfig = {
  authPublicBaseUrl: "https://lifelink.example",
  googleOAuthClientId: "google-client",
  googleOAuthClientSecret: "google-secret",
};

describe("Google provider availability", () => {
  it("requires an HTTPS public callback origin and both Google credentials", () => {
    expect(googleAvailabilityFromConfig({ ...completeConfig, authPublicBaseUrl: "http://localhost:3000" })).toBe(false);
    expect(googleAvailabilityFromConfig({ ...completeConfig, googleOAuthClientSecret: "" })).toBe(false);
    expect(googleAvailabilityFromConfig(completeConfig)).toBe(true);
  });

  it("starts authorization at the permanent public origin so its state cookie returns to the same host", () => {
    expect(googleAuthorizationStartUrlFromConfig(completeConfig)).toBe("https://lifelink.example/api/auth/google");
    expect(googleAuthorizationStartUrlFromConfig(completeConfig, "register")).toBe("https://lifelink.example/api/auth/google?intent=register");
    expect(googleAuthorizationStartUrlFromConfig({ ...completeConfig, authPublicBaseUrl: "http://localhost:3000" })).toBeNull();
  });

  it.skipIf(process.env.RUN_PROVIDER_AUTH_TESTS !== "true")("accepts the configured server-only Google client credentials", async () => {
    const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
    const publicBaseUrl = process.env.AUTH_PUBLIC_BASE_URL;
    expect(clientId).toBeTruthy();
    expect(clientSecret).toBeTruthy();
    expect(publicBaseUrl).toMatch(/^https:\/\//);

    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId ?? "",
        client_secret: clientSecret ?? "",
        redirect_uri: `${publicBaseUrl}/api/auth/google/callback`,
        code: "lifelink-credential-validation-no-user-data",
        grant_type: "authorization_code",
      }),
    });
    const payload = await response.json() as { error?: string };
    expect(payload.error).not.toBe("invalid_client");
    expect(payload.error).toBe("invalid_grant");
  }, 20_000);

  it("registers the Google callback route and safely rejects a callback without a bound state", () => {
    const getHandlers = new Map<string, (req: any, res: any) => void>();
    const app = {
      get: vi.fn((path: string, handler: (req: any, res: any) => void) => getHandlers.set(path, handler)),
      all: vi.fn(),
    } as unknown as Express;

    registerProviderAuthRoutes(app);

    expect(getHandlers.has("/api/auth/google")).toBe(true);
    const callback = getHandlers.get("/api/auth/google/callback");
    expect(callback).toBeTypeOf("function");

    const response = { clearCookie: vi.fn(), redirect: vi.fn() };
    callback?.({ headers: {}, query: {}, protocol: "https" }, response);

    expect(response.clearCookie).toHaveBeenCalled();
    expect(response.redirect).toHaveBeenCalledWith(302, "/login?authError=invalid_provider_state");
  });
});
