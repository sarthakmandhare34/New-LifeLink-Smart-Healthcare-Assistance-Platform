import type { Express, Request, Response } from "express";
import { getDoctorEventsSince, getPatientEventsSince } from "../db";
import { type RealtimeDoctorEvent, type RealtimePatientEvent, subscribeToDoctorEvents, subscribeToPatientEvents } from "./eventBus";
import { authSession } from "../auth/authUtil";
import { doctorIdFromSyntheticOpenId } from "../syntheticDoctor";
import { COOKIE_NAME, DOCTOR_COOKIE_NAME } from "../../shared/const";

const HEARTBEAT_MS = 25_000;

export function parseLastEventId(value: unknown) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

function writeEvent(res: Response, event: RealtimePatientEvent) {
  if (res.writableEnded || res.destroyed) return;
  try {
    res.write(`id: ${event.id}\nevent: patient-event\ndata: ${JSON.stringify({
      id: event.id,
      type: event.type,
      entityId: event.entityId,
      createdAt: event.createdAt.toISOString(),
    })}\n\n`);
  } catch (error) {
    console.error("[Realtime] Write failed for patient event", error);
  }
}

function writeDoctorEvent(res: Response, event: RealtimeDoctorEvent) {
  if (res.writableEnded || res.destroyed) return;
  try {
    res.write(`id: ${event.id}\nevent: doctor-event\ndata: ${JSON.stringify({
      id: event.id,
      type: event.type,
      entityId: event.entityId,
      createdAt: event.createdAt.toISOString(),
    })}\n\n`);
  } catch (error) {
    console.error("[Realtime] Write failed for doctor event", error);
  }
}

function openStream(res: Response) {
  res.status(200).set({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });
  res.flushHeaders();
  res.write("retry: 3000\n\n");
}

export function registerPatientRealtimeRoute(app: Express) {
  app.get("/api/patient-events", async (req: Request, res: Response) => {
    let user;
    try {
      user = await authSession.authenticateRequest(req, COOKIE_NAME);
    } catch {
      res.status(401).json({ error: "Authentication is required." });
      return;
    }
    if (!user) {
      res.status(401).json({ error: "Authentication is required." });
      return;
    }

    openStream(res);
    try {
      const lastEventId = parseLastEventId(req.header("last-event-id") ?? req.query.lastEventId);
      const backlog = await getPatientEventsSince(user.id, lastEventId);
      backlog.forEach((event) => writeEvent(res, event));
    } catch (error) {
      console.error("[Realtime] Unable to load patient event backlog", error);
      res.write("event: stream-error\ndata: {\"message\":\"Unable to load updates.\"}\n\n");
    }

    const unsubscribe = subscribeToPatientEvents(user.id, (event) => writeEvent(res, event));
    const heartbeat = setInterval(() => {
      if (res.writableEnded || res.destroyed) return;
      try { res.write(": keepalive\n\n"); } catch (e) { /* ignore */ }
    }, HEARTBEAT_MS);
    const cleanup = () => {
      clearInterval(heartbeat);
      unsubscribe();
    };
    req.on("close", cleanup);
    req.on("aborted", cleanup);
  });
}

/** Same authenticated SSE mechanism, restricted to the signed controlled synthetic doctor identity. */
export function registerDoctorRealtimeRoute(app: Express) {
  app.get("/api/doctor-events", async (req: Request, res: Response) => {
    let user;
    try {
      user = await authSession.authenticateRequest(req, DOCTOR_COOKIE_NAME);
    } catch {
      res.status(401).json({ error: "Authentication is required." });
      return;
    }
    if (!user) {
      res.status(401).json({ error: "Authentication is required." });
      return;
    }
    const doctorId = user.role === "doctor" ? doctorIdFromSyntheticOpenId(user.openId) : null;
    if (!doctorId) {
      res.status(403).json({ error: "A synthetic doctor session is required." });
      return;
    }

    openStream(res);
    try {
      const lastEventId = parseLastEventId(req.header("last-event-id") ?? req.query.lastEventId);
      const backlog = await getDoctorEventsSince(doctorId, lastEventId);
      backlog.forEach((event) => writeDoctorEvent(res, event));
    } catch (error) {
      console.error("[Realtime] Unable to load doctor event backlog", error);
      res.write("event: stream-error\ndata: {\"message\":\"Unable to load updates.\"}\n\n");
    }

    const unsubscribe = subscribeToDoctorEvents(doctorId, (event) => writeDoctorEvent(res, event));
    const heartbeat = setInterval(() => {
      if (res.writableEnded || res.destroyed) return;
      try { res.write(": keepalive\n\n"); } catch (e) { /* ignore */ }
    }, HEARTBEAT_MS);
    const cleanup = () => {
      clearInterval(heartbeat);
      unsubscribe();
    };
    req.on("close", cleanup);
    req.on("aborted", cleanup);
  });
}
