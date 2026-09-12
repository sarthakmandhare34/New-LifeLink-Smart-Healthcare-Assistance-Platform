import type { CookieOptions, Request } from "express";                                  // Express types for cookie settings and incoming requests

// Set of loopback / local IP strings where TLS/HTTPS is not required during local development
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

// Helper to determine if a hostname string is a raw IP address (v4 or v6)
function isIpAddress(host: string) {
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return true;                                   // Matches IPv4 format (e.g. 192.168.1.1)
  return host.includes(":");                                                               // Matches IPv6 format (contains colons)
}

// Determines if an incoming HTTP request arrived over a secure HTTPS transport
function isSecureRequest(req: Request) {
  if (req.protocol === "https") return true;                                               // Direct HTTPS connection

  const forwardedProto = req.headers["x-forwarded-proto"];                                 // Check reverse proxy / cloud load balancer SSL header
  if (!forwardedProto) return false;                                                       // Header not present means plain HTTP

  const protoList = Array.isArray(forwardedProto)                                          // Handle single header string or multiple proxy hops
    ? forwardedProto
    : forwardedProto.split(",");

  return protoList.some(proto => proto.trim().toLowerCase() === "https");                  // True if any proxy hop indicates HTTPS
}

// Generates standardized secure cookie options for session storage
export function getSessionCookieOptions(
  req: Request
): Pick<CookieOptions, "domain" | "httpOnly" | "path" | "sameSite" | "secure"> {
  return {
    httpOnly: true,                                                                        // Prevents client-side JavaScript access (XSS defense)
    path: "/",                                                                             // Available across all application routes
    sameSite: "lax",                                                                       // Protects against CSRF attacks while allowing top-level navigations
    secure: isSecureRequest(req),                                                          // Only transmit over HTTPS in production environments
  };
}
