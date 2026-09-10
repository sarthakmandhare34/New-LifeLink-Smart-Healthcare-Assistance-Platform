import "dotenv/config";

export const ENV = {
  get appId() { return process.env.VITE_APP_ID ?? ""; },
  get cookieSecret() { return process.env.JWT_SECRET ?? ""; },
  get databaseUrl() { return process.env.DATABASE_URL ?? ""; },
  get oAuthServerUrl() { return process.env.OAUTH_SERVER_URL ?? ""; },
  get ownerOpenId() { return process.env.OWNER_OPEN_ID ?? ""; },
  get isProduction() { return process.env.NODE_ENV === "production"; },
  get forgeApiUrl() { return process.env.BUILT_IN_FORGE_API_URL ?? ""; },
  get forgeApiKey() { return process.env.BUILT_IN_FORGE_API_KEY ?? ""; },
  get geminiApiKey() { return process.env.GEMINI_API_KEY ?? ""; },
  get authPublicBaseUrl() { return process.env.AUTH_PUBLIC_BASE_URL ?? ""; },
  get googleOAuthClientId() { return process.env.GOOGLE_OAUTH_CLIENT_ID ?? ""; },
  get googleOAuthClientSecret() { return process.env.GOOGLE_OAUTH_CLIENT_SECRET ?? ""; },
  get demoDoctorAccessCode() { return process.env.LIFELINK_DEMO_DOCTOR_ACCESS_CODE || "lifelink-controlled-clinician-secret-key-2026"; },
};

