import "dotenv/config";                                                                  // Loads local .env file variables into process.env at boot

// Centralized access dictionary for all system environment variables
export const ENV = {
  get appId() { return process.env.VITE_APP_ID ?? ""; },                                 // Frontend client application ID (if OAuth used)
  get cookieSecret() { return process.env.JWT_SECRET ?? ""; },                             // Secret key used to sign and verify patient & doctor JWT cookies
  get databaseUrl() { return process.env.DATABASE_URL ?? ""; },                            // MySQL connection string (mysql://user:pass@host:port/dbname)
  get oAuthServerUrl() { return process.env.OAUTH_SERVER_URL ?? ""; },                     // External OAuth provider server URL (optional/fallback)
  get ownerOpenId() { return process.env.OWNER_OPEN_ID ?? ""; },                           // Administrator OpenID identifier for privileged system access
  get isProduction() { return process.env.NODE_ENV === "production"; },                   // Boolean check: true when deployed in production mode
  get forgeApiUrl() { return process.env.BUILT_IN_FORGE_API_URL ?? ""; },                 // External API gateway URL (if integrated)
  get forgeApiKey() { return process.env.BUILT_IN_FORGE_API_KEY ?? ""; },                 // External API gateway authentication key
  get geminiApiKey() { return process.env.GEMINI_API_KEY ?? ""; },                         // Google Gemini AI API key used for clinical symptom assessments
  get authPublicBaseUrl() { return process.env.AUTH_PUBLIC_BASE_URL ?? ""; },             // Public root URL of the app for OAuth redirect callbacks
  get googleOAuthClientId() { return process.env.GOOGLE_OAUTH_CLIENT_ID ?? ""; },         // Google OAuth client ID for social login
  get googleOAuthClientSecret() { return process.env.GOOGLE_OAUTH_CLIENT_SECRET ?? ""; }, // Google OAuth secret key for token exchange
  get demoDoctorAccessCode() {                                                             // Access code for synthetic clinician testing portal
    return process.env.LIFELINK_DEMO_DOCTOR_ACCESS_CODE || "lifelink-controlled-clinician-secret-key-2026"; 
  },
};

