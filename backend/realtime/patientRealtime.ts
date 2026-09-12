import type { Express, Request, Response } from "express";                                  // Express types for route registration and HTTP streaming
import { getDoctorEventsSince, getPatientEventsSince } from "../db";                       // Queries database backlog for missed events during client disconnection
import { type RealtimeDoctorEvent, type RealtimePatientEvent, subscribeToDoctorEvents, subscribeToPatientEvents } from "./eventBus"; // Pub/sub subscription hooks
import { authSession } from "../auth/authUtil";                                            // JWT session token validator
import { doctorIdFromSyntheticOpenId } from "../syntheticDoctor";                          // Resolves clinician ID from session openId
import { COOKIE_NAME, DOCTOR_COOKIE_NAME } from "../../shared/const";                       // Patient and clinician cookie identifiers

const HEARTBEAT_MS = 25_000;                                                               // 25-second ping interval keeping cloud proxies from timing out

// Parses and validates the Last-Event-ID header or query param for event resynchronization
export function parseLastEventId(value: unknown) {
  const parsed = Number(value);                                                             // Convert string to numeric sequence ID
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;                      // Return integer ID or undefined
}

// Formats and writes a single patient event to the HTTP response stream following SSE specification
function writeEvent(res: Response, event: RealtimePatientEvent) {
  if (res.writableEnded || res.destroyed) return;                                          // Guard against closed network socket
  try {
    res.write(`id: ${event.id}\nevent: patient-event\ndata: ${JSON.stringify({              // Standard SSE message framing
      id: event.id,
      type: event.type,
      entityId: event.entityId,
      createdAt: event.createdAt.toISOString(),
    })}\n\n`);
  } catch (error) {
    console.error("[Realtime] Write failed for patient event", error);
  }
}

// Formats and writes a single clinician event to the HTTP response stream following SSE specification
function writeDoctorEvent(res: Response, event: RealtimeDoctorEvent) {
  if (res.writableEnded || res.destroyed) return;                                          // Guard against closed network socket
  try {
    res.write(`id: ${event.id}\nevent: doctor-event\ndata: ${JSON.stringify({               // Standard SSE message framing
      id: event.id,
      type: event.type,
      entityId: event.entityId,
      createdAt: event.createdAt.toISOString(),
    })}\n\n`);
  } catch (error) {
    console.error("[Realtime] Write failed for doctor event", error);
  }
}

// Sets required HTTP headers for persistent Server-Sent Events (SSE) streaming
function openStream(res: Response) {
  res.status(200).set({
    "Content-Type": "text/event-stream",                                                   // Instruct browser this is an active event stream
    "Cache-Control": "no-cache, no-transform",                                             // Prevent proxy caching and compression buffering
    Connection: "keep-alive",                                                              // Keep socket open indefinitely
    "X-Accel-Buffering": "no",                                                             // Disable Nginx reverse-proxy buffering
  });
  res.flushHeaders();                                                                      // Flush headers to client immediately
  res.write("retry: 3000\n\n");                                                            // Tell browser to reconnect after 3 seconds if disconnected
}

// Registers GET /api/patient-events SSE streaming endpoint for patient portals
export function registerPatientRealtimeRoute(app: Express) {
  app.get("/api/patient-events", async (req: Request, res: Response) => {
    let user;
    try {
      user = await authSession.authenticateRequest(req, COOKIE_NAME);                      // Verify patient session cookie
    } catch {
      res.status(401).json({ error: "Authentication is required." });                      // Reject unauthenticated requests
      return;
    }
    if (!user) {
      res.status(401).json({ error: "Authentication is required." });
      return;
    }

    openStream(res);                                                                       // Open persistent SSE channel
    try {
      const lastEventId = parseLastEventId(req.header("last-event-id") ?? req.query.lastEventId); // Parse reconnection event offset
      const backlog = await getPatientEventsSince(user.id, lastEventId);                    // Retrieve missed events from MySQL
      backlog.forEach((event) => writeEvent(res, event));                                  // Deliver missed backlog
    } catch (error) {
      console.error("[Realtime] Unable to load patient event backlog", error);
      res.write("event: stream-error\ndata: {\"message\":\"Unable to load updates.\"}\n\n");
    }

    const unsubscribe = subscribeToPatientEvents(user.id, (event) => writeEvent(res, event)); // Subscribe to live events
    const heartbeat = setInterval(() => {                                                  // Ping client every 25 seconds
      if (res.writableEnded || res.destroyed) return;
      try { res.write(": keepalive\n\n"); } catch (e) { /* ignore */ }
    }, HEARTBEAT_MS);
    const cleanup = () => {                                                                // Cleanup function on connection termination
      clearInterval(heartbeat);                                                            // Stop ping interval
      unsubscribe();                                                                       // Detach event listener from bus
    };
    req.on("close", cleanup);                                                              // Detect browser tab close
    req.on("aborted", cleanup);                                                            // Detect network drop
  });
}

/** Same authenticated SSE mechanism, restricted to the signed controlled synthetic doctor identity. */
export function registerDoctorRealtimeRoute(app: Express) {
  app.get("/api/doctor-events", async (req: Request, res: Response) => {
    let user;
    try {
      user = await authSession.authenticateRequest(req, DOCTOR_COOKIE_NAME);               // Verify doctor session cookie
    } catch {
      res.status(401).json({ error: "Authentication is required." });                      // Reject unauthenticated requests
      return;
    }
    if (!user) {
      res.status(401).json({ error: "Authentication is required." });
      return;
    }
    const doctorId = user.role === "doctor" ? doctorIdFromSyntheticOpenId(user.openId) : null; // Verify clinician role
    if (!doctorId) {
      res.status(403).json({ error: "A synthetic doctor session is required." });
      return;
    }

    openStream(res);                                                                       // Open persistent SSE channel
    try {
      const lastEventId = parseLastEventId(req.header("last-event-id") ?? req.query.lastEventId); // Parse reconnection event offset
      const backlog = await getDoctorEventsSince(doctorId, lastEventId);                    // Retrieve missed clinician events
      backlog.forEach((event) => writeDoctorEvent(res, event));                            // Deliver missed backlog
    } catch (error) {
      console.error("[Realtime] Unable to load doctor event backlog", error);
      res.write("event: stream-error\ndata: {\"message\":\"Unable to load updates.\"}\n\n");
    }

    const unsubscribe = subscribeToDoctorEvents(doctorId, (event) => writeDoctorEvent(res, event)); // Subscribe to live clinician updates
    const heartbeat = setInterval(() => {                                                  // Ping client every 25 seconds
      if (res.writableEnded || res.destroyed) return;
      try { res.write(": keepalive\n\n"); } catch (e) { /* ignore */ }
    }, HEARTBEAT_MS);
    const cleanup = () => {                                                                // Cleanup closure on disconnect
      clearInterval(heartbeat);                                                            // Terminate heartbeat timer
      unsubscribe();                                                                       // Detach from bus
    };
    req.on("close", cleanup);                                                              // Handle tab close
    req.on("aborted", cleanup);                                                            // Handle aborted stream
  });
}
