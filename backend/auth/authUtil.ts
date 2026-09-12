import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";                                // Default patient cookie key and 365-day millisecond constant
import { ForbiddenError } from "@shared/_core/errors";                                      // Helper for throwing 403 Forbidden HTTP exceptions
import { parse as parseCookieHeader } from "cookie";                                       // Cookie parser library for parsing raw cookie headers
import type { Request } from "express";                                                     // Express Request type
import { SignJWT, jwtVerify } from "jose";                                                  // Lightweight JWT signing and cryptographic verification library
import type { User } from "../../database/schema";                                         // Database user model type
import * as db from "../db";                                                               // Database queries for user lookup
import { ENV } from "../_core/env";                                                         // Environment variable provider

// The decoded JSON payload stored inside each user/doctor session token
export type SessionPayload = {
  openId: string;                                                                          // Unique identifier for the user account
  appId: string;                                                                           // Application identifier associated with the token
  name: string;                                                                            // Display name of the user
};

// Manages JSON Web Token (JWT) lifecycle for patient and doctor sessions
class AuthSessionManager {
  // Retrieves the encryption secret key and converts it into a binary Uint8Array
  private getSessionSecret() {
    if (ENV.isProduction && !ENV.cookieSecret) {                                           // Strict check: production MUST provide a strong JWT secret
      throw new Error("CRITICAL SECURITY ERROR: JWT_SECRET environment variable must be configured in production mode.");
    }
    const secret = ENV.cookieSecret || "local-development-secret-key-change-in-production"; // Safe default for local developer machines
    return new TextEncoder().encode(secret);                                               // Encode UTF-8 string into byte buffer required by jose
  }

  // Parses raw cookie header string from incoming HTTP request into a Key-Value Map
  private parseCookies(cookieHeader: string | undefined) {
    if (!cookieHeader) {                                                                   // If no cookies provided
      return new Map<string, string>();                                                    // Return empty Map
    }
    const parsed = parseCookieHeader(cookieHeader);                                        // Parse cookie string into record object
    return new Map(Object.entries(parsed));                                                // Convert record into Map for fast lookup
  }

  // Helper to create a signed session token given an openId and optional parameters
  async createSessionToken(
    openId: string,
    options: { expiresInMs?: number; name?: string } = {}
  ): Promise<string> {
    return this.signSession(                                                               // Delegate to signSession with default app ID
      {
        openId,
        appId: ENV.appId || "local-app",
        name: options.name || "",
      },
      options
    );
  }

  // Signs and packages a SessionPayload into a cryptographically secure JWT string
  async signSession(
    payload: SessionPayload,
    options: { expiresInMs?: number } = {}
  ): Promise<string> {
    const issuedAt = Date.now();                                                           // Current timestamp in milliseconds
    const expiresInMs = options.expiresInMs ?? ONE_YEAR_MS;                                 // Default expiry: 1 full year unless specified
    const expirationSeconds = Math.floor((issuedAt + expiresInMs) / 1000);                  // Convert expiration timestamp to seconds for JWT
    const secretKey = this.getSessionSecret();                                             // Fetch encoded secret bytes

    return new SignJWT({                                                                   // Initialize JWT signer with payload
      openId: payload.openId,
      appId: payload.appId,
      name: payload.name,
    })
      .setProtectedHeader({ alg: "HS256", typ: "JWT" })                                    // Use HMAC SHA-256 algorithm
      .setExpirationTime(expirationSeconds)                                                // Set expiration UNIX timestamp
      .sign(secretKey);                                                                    // Sign with secret key and produce string
  }

  // Cryptographically verifies an incoming token and returns its decoded payload
  async verifySession(
    cookieValue: string | undefined | null
  ): Promise<{ openId: string; appId: string; name: string } | null> {
    if (!cookieValue) {                                                                    // If token string is missing or empty
      return null;                                                                         // Verification fails
    }

    try {
      const secretKey = this.getSessionSecret();                                           // Fetch secret key bytes
      const { payload } = await jwtVerify(cookieValue, secretKey, {                        // Validate signature and expiration
        algorithms: ["HS256"],                                                             // Restrict strictly to HS256 to prevent alg:none attacks
      });
      const { openId, appId, name } = payload as Record<string, unknown>;                  // Extract fields from payload

      if (                                                                                 // Ensure all expected fields are valid strings
        typeof openId !== "string" ||
        typeof appId !== "string" ||
        typeof name !== "string"
      ) {
        return null;                                                                       // Malformed payload structure
      }

      return { openId, appId, name };                                                      // Return verified session data
    } catch (error) {
      return null;                                                                         // Expired token or tampered signature
    }
  }

  // Authenticates an Express HTTP request by reading cookies or Bearer Authorization header
  async authenticateRequest(
    req: Request,
    cookieName: string = COOKIE_NAME                                                       // Defaults to patient cookie, or doctor cookie when specified
  ): Promise<AuthenticatedUser> {
    const cookies = this.parseCookies(req.headers.cookie);                                 // Parse all cookies from request header
    let sessionToken = cookies.get(cookieName);                                            // Look for target session cookie

    if (!sessionToken) {                                                                   // Fallback: check Authorization Bearer header
      const authHeader = req.headers.authorization;
      if (typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
        sessionToken = authHeader.slice(7);                                                // Strip 'Bearer ' prefix to extract raw token
      }
    }

    const session = await this.verifySession(sessionToken);                                // Verify the token cryptographically

    if (!session) {                                                                        // Token invalid or missing
      throw ForbiddenError("Invalid session cookie");                                      // Reject with 403 Forbidden
    }

    if (session.openId.startsWith("cron_")) {                                              // Check if token represents internal scheduled cron job
       return {                                                                            // Return synthetic user representation for cron tasks
        id: -1,
        openId: session.openId,
        name: "System Scheduled Task",
        email: null,
        loginMethod: null,
        role: "user",
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignedIn: new Date(),
        isCron: true,
      } as AuthenticatedUser;
    }

    const user = await db.getUserByOpenId(session.openId);                                 // Query database for user with matching openId

    if (!user) {                                                                           // User was deleted or no longer exists in DB
      throw ForbiddenError("User not found in database");                                  // Reject request
    }

    return user;                                                                           // Return authenticated database user record
  }
}

// User object enriched with optional runtime task/cron flags
export type AuthenticatedUser = User & {
  taskUid?: string;
  isCron?: boolean;
};

// Global singleton instance of AuthSessionManager for the application
export const authSession = new AuthSessionManager();
