import { OAUTH_STATE_COOKIE, encodeOAuthState } from "@shared/const";                          // Shared constants and state encoder

export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";                                      // Re-export session cookie parameters

// =========================================================================================
// OAUTH FLOW INITIATOR
// Dispatches the browser to the centralized OAuth authentication portal.
// Mints a cryptographic one-time nonce and writes the state cookie immediately before navigating.
// =========================================================================================
export const startLogin = () => {
  const oauthPortalUrl = import.meta.env.VITE_OAUTH_PORTAL_URL;                                 // Base URL of authentication provider
  const appId = import.meta.env.VITE_APP_ID;                                                    // Registered application ID
  const redirectUri = `${window.location.origin}/api/oauth/callback`;                           // Callback endpoint

  const nonce = crypto.randomUUID();                                                            // Cryptographic random nonce
  document.cookie = `${OAUTH_STATE_COOKIE}=${nonce}; Path=/; Max-Age=600; SameSite=None; Secure`; // Set state cookie
  const state = encodeOAuthState({ redirectUri, nonce });                                       // Encode payload

  const url = new URL(`${oauthPortalUrl}/app-auth`);                                            // Target OAuth endpoint
  url.searchParams.set("appId", appId);
  url.searchParams.set("redirectUri", redirectUri);
  url.searchParams.set("state", state);
  url.searchParams.set("type", "signIn");

  window.location.href = url.toString();                                                        // Redirect browser
};
