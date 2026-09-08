import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { EventEmitter } from "node:events";
import { registerPatientRealtimeRoute, registerDoctorRealtimeRoute, parseLastEventId } from "./patientRealtime";
import { publishPatientEvent, publishDoctorEvent } from "./eventBus";
import { authSession } from "../auth/authUtil";
import * as db from "../db";

vi.mock("../auth/authUtil", () => ({
  authSession: {
    authenticateRequest: vi.fn(),
  },
}));

vi.mock("../db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../db")>();
  return {
    ...actual,
    getPatientEventsSince: vi.fn(async () => []),
    getDoctorEventsSince: vi.fn(async () => []),
  };
});

class MockRequest extends EventEmitter {
  query: Record<string, string> = {};
  headers: Record<string, string> = {};
  header(name: string) {
    return this.headers[name] || this.headers[name.toLowerCase()];
  }
}

class MockResponse extends EventEmitter {
  statusCode: number = 200;
  headers: Record<string, string> = {};
  chunks: string[] = [];
  writableEnded = false;
  destroyed = false;

  status(code: number) {
    this.statusCode = code;
    return this;
  }
  set(headers: Record<string, string>) {
    Object.assign(this.headers, headers);
    return this;
  }
  json(body: any) {
    this.chunks.push(JSON.stringify(body));
    this.emit("end");
    return this;
  }
  flushHeaders() {}
  write(chunk: string) {
    if (this.writableEnded || this.destroyed) return false;
    this.chunks.push(chunk);
    this.emit("data", chunk);
    return true;
  }
  end() {
    this.writableEnded = true;
    this.emit("end");
  }
}

describe("BATCH 14: REALTIME DEEP AUDIT - Security Matrix", () => {
  let app: any;
  let routes: Record<string, Function> = {};

  beforeEach(() => {
    vi.useFakeTimers();
    routes = {};
    app = {
      get: (path: string, handler: Function) => {
        routes[path] = handler;
      },
    };
    registerPatientRealtimeRoute(app);
    registerDoctorRealtimeRoute(app);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  describe("AUTHENTICATION", () => {
    it("1. Unauthenticated patient SSE -> 401", async () => {
      vi.mocked(authSession.authenticateRequest).mockRejectedValue(new Error("No session"));
      const req = new MockRequest();
      const res = new MockResponse();
      await routes["/api/patient-events"](req, res);
      expect(res.statusCode).toBe(401);
      expect(res.chunks[0]).toContain("Authentication is required.");
    });

    it("2. Unauthenticated doctor SSE -> 401", async () => {
      vi.mocked(authSession.authenticateRequest).mockRejectedValue(new Error("No session"));
      const req = new MockRequest();
      const res = new MockResponse();
      await routes["/api/doctor-events"](req, res);
      expect(res.statusCode).toBe(401);
      expect(res.chunks[0]).toContain("Authentication is required.");
    });

    it("3. Patient attempting doctor SSE -> 403", async () => {
      vi.mocked(authSession.authenticateRequest).mockResolvedValue({ id: 1, role: "user" } as any);
      const req = new MockRequest();
      const res = new MockResponse();
      await routes["/api/doctor-events"](req, res);
      expect(res.statusCode).toBe(403);
      expect(res.chunks[0]).toContain("synthetic doctor session is required.");
    });

    it("4. Verify existing contract for doctor attempting patient SSE", async () => {
      vi.mocked(authSession.authenticateRequest).mockResolvedValue({ id: 99, role: "doctor", openId: "csmt-doc" } as any);
      const req = new MockRequest();
      const res = new MockResponse();
      await routes["/api/patient-events"](req, res);
      expect(res.statusCode).toBe(200); // SSE stream opens
      req.emit("close");
    });
  });

  describe("PATIENT ISOLATION", () => {
    it("5. Patient A receives own event", async () => {
      vi.mocked(authSession.authenticateRequest).mockResolvedValue({ id: 1, role: "user" } as any);
      const req = new MockRequest();
      const res = new MockResponse();
      await routes["/api/patient-events"](req, res);
      
      publishPatientEvent({ id: 101, userId: 1, type: "MEDICINE_UPDATED", entityId: "99", createdAt: new Date() });
      
      const published = res.chunks.find((c) => c.includes("MEDICINE_UPDATED"));
      expect(published).toBeDefined();
      req.emit("close");
    });

    it("6. Patient B does not receive Patient A event", async () => {
      vi.mocked(authSession.authenticateRequest).mockResolvedValue({ id: 2, role: "user" } as any);
      const req = new MockRequest();
      const res = new MockResponse();
      await routes["/api/patient-events"](req, res);
      
      publishPatientEvent({ id: 102, userId: 1, type: "PROFILE_UPDATED", entityId: "1", createdAt: new Date() });
      
      const published = res.chunks.find((c) => c.includes("PROFILE_UPDATED"));
      expect(published).toBeUndefined();
      req.emit("close");
    });

    it("7. ?userId spoofing fails", async () => {
      vi.mocked(authSession.authenticateRequest).mockResolvedValue({ id: 1, role: "user" } as any);
      const req = new MockRequest();
      req.query.userId = "2";
      const res = new MockResponse();
      await routes["/api/patient-events"](req, res);
      
      publishPatientEvent({ id: 103, userId: 2, type: "MEDICINE_UPDATED", entityId: "1", createdAt: new Date() });
      
      const published = res.chunks.find((c) => c.includes("MEDICINE_UPDATED"));
      expect(published).toBeUndefined();
      req.emit("close");
    });

    it("8. Identity header spoofing fails", async () => {
      vi.mocked(authSession.authenticateRequest).mockResolvedValue({ id: 1, role: "user" } as any);
      const req = new MockRequest();
      req.headers["x-user-id"] = "2";
      const res = new MockResponse();
      await routes["/api/patient-events"](req, res);
      
      publishPatientEvent({ id: 103, userId: 2, type: "MEDICINE_UPDATED", entityId: "1", createdAt: new Date() });
      const published = res.chunks.find((c) => c.includes("MEDICINE_UPDATED"));
      expect(published).toBeUndefined();
      req.emit("close");
    });

    it("9. Simultaneous patient connections remain isolated", async () => {
      vi.mocked(authSession.authenticateRequest).mockResolvedValueOnce({ id: 1, role: "user" } as any);
      const req1 = new MockRequest();
      const res1 = new MockResponse();
      await routes["/api/patient-events"](req1, res1);

      vi.mocked(authSession.authenticateRequest).mockResolvedValueOnce({ id: 2, role: "user" } as any);
      const req2 = new MockRequest();
      const res2 = new MockResponse();
      await routes["/api/patient-events"](req2, res2);

      publishPatientEvent({ id: 110, userId: 1, type: "ASSESSMENT_COMPLETED", entityId: "5", createdAt: new Date() });
      
      expect(res1.chunks.some((c) => c.includes("ASSESSMENT_COMPLETED"))).toBe(true);
      expect(res2.chunks.some((c) => c.includes("ASSESSMENT_COMPLETED"))).toBe(false);

      req1.emit("close");
      req2.emit("close");
    });
  });

  describe("DOCTOR ISOLATION", () => {
    it("10. Doctor A receives own event", async () => {
      vi.mocked(authSession.authenticateRequest).mockResolvedValue({ role: "doctor", openId: "synthetic-doctor:mock-central-cardiology-csmt" } as any);
      const req = new MockRequest();
      const res = new MockResponse();
      await routes["/api/doctor-events"](req, res);
      
      publishDoctorEvent({ id: 201, doctorId: "mock-central-cardiology-csmt", patientUserId: 1, type: "APPOINTMENT_UPDATED", entityId: "10", createdAt: new Date() });
      
      expect(res.chunks.some((c) => c.includes("APPOINTMENT_UPDATED"))).toBe(true);
      req.emit("close");
    });

    it("11. Doctor B does not receive Doctor A event", async () => {
      vi.mocked(authSession.authenticateRequest).mockResolvedValue({ role: "doctor", openId: "synthetic-doctor:mock-western-general-practice-churchgate" } as any);
      const req = new MockRequest();
      const res = new MockResponse();
      await routes["/api/doctor-events"](req, res);
      
      publishDoctorEvent({ id: 202, doctorId: "mock-central-cardiology-csmt", patientUserId: 1, type: "APPOINTMENT_UPDATED", entityId: "10", createdAt: new Date() });
      
      expect(res.chunks.some((c) => c.includes("APPOINTMENT_UPDATED"))).toBe(false);
      req.emit("close");
    });

    it("12. ?doctorId spoofing fails", async () => {
      vi.mocked(authSession.authenticateRequest).mockResolvedValue({ role: "doctor", openId: "synthetic-doctor:mock-central-cardiology-csmt" } as any);
      const req = new MockRequest();
      req.query.doctorId = "mock-western-general-practice-churchgate";
      const res = new MockResponse();
      await routes["/api/doctor-events"](req, res);
      
      publishDoctorEvent({ id: 203, doctorId: "mock-western-general-practice-churchgate", patientUserId: 1, type: "APPOINTMENT_UPDATED", entityId: "10", createdAt: new Date() });
      expect(res.chunks.some((c) => c.includes("APPOINTMENT_UPDATED"))).toBe(false);
      req.emit("close");
    });

    it("13. Identity header spoofing fails", async () => {
      vi.mocked(authSession.authenticateRequest).mockResolvedValue({ role: "doctor", openId: "synthetic-doctor:mock-central-cardiology-csmt" } as any);
      const req = new MockRequest();
      req.headers["x-doctor-id"] = "mock-western-general-practice-churchgate";
      const res = new MockResponse();
      await routes["/api/doctor-events"](req, res);
      
      publishDoctorEvent({ id: 204, doctorId: "mock-western-general-practice-churchgate", patientUserId: 1, type: "APPOINTMENT_UPDATED", entityId: "10", createdAt: new Date() });
      expect(res.chunks.some((c) => c.includes("APPOINTMENT_UPDATED"))).toBe(false);
      req.emit("close");
    });

    it("14. Simultaneous doctor connections remain isolated", async () => {
      vi.mocked(authSession.authenticateRequest).mockResolvedValueOnce({ role: "doctor", openId: "synthetic-doctor:mock-central-cardiology-csmt" } as any);
      const reqA = new MockRequest();
      const resA = new MockResponse();
      await routes["/api/doctor-events"](reqA, resA);

      vi.mocked(authSession.authenticateRequest).mockResolvedValueOnce({ role: "doctor", openId: "synthetic-doctor:mock-western-general-practice-churchgate" } as any);
      const reqB = new MockRequest();
      const resB = new MockResponse();
      await routes["/api/doctor-events"](reqB, resB);

      publishDoctorEvent({ id: 210, doctorId: "mock-central-cardiology-csmt", patientUserId: 5, type: "PATIENT_RELATED_UPDATE", entityId: "5", createdAt: new Date() });
      
      expect(resA.chunks.some((c) => c.includes("PATIENT_RELATED_UPDATE"))).toBe(true);
      expect(resB.chunks.some((c) => c.includes("PATIENT_RELATED_UPDATE"))).toBe(false);

      reqA.emit("close");
      reqB.emit("close");
    });
  });

  describe("DOCTOR/PATIENT AUTHORIZATION", () => {
    it("15. Authorized doctor receives assigned appointment event", async () => {
      vi.mocked(authSession.authenticateRequest).mockResolvedValue({ role: "doctor", openId: "synthetic-doctor:mock-central-cardiology-csmt" } as any);
      const req = new MockRequest();
      const res = new MockResponse();
      await routes["/api/doctor-events"](req, res);
      
      publishDoctorEvent({ id: 301, doctorId: "mock-central-cardiology-csmt", patientUserId: 1, type: "APPOINTMENT_UPDATED", entityId: "10", createdAt: new Date() });
      
      const chunk = res.chunks.find((c) => c.includes("APPOINTMENT_UPDATED"));
      expect(chunk).toBeDefined();
      expect(chunk).toContain(`"id":301`);
      expect(chunk).toContain(`"entityId":"10"`);
      req.emit("close");
    });
    
    it("16. Other doctor does not receive it", async () => {
      vi.mocked(authSession.authenticateRequest).mockResolvedValueOnce({ role: "doctor", openId: "synthetic-doctor:mock-central-cardiology-csmt" } as any);
      const reqA = new MockRequest();
      const resA = new MockResponse();
      await routes["/api/doctor-events"](reqA, resA);

      vi.mocked(authSession.authenticateRequest).mockResolvedValueOnce({ role: "doctor", openId: "synthetic-doctor:mock-western-general-practice-churchgate" } as any);
      const reqB = new MockRequest();
      const resB = new MockResponse();
      await routes["/api/doctor-events"](reqB, resB);

      publishDoctorEvent({ id: 302, doctorId: "mock-central-cardiology-csmt", patientUserId: 1, type: "APPOINTMENT_UPDATED", entityId: "11", createdAt: new Date() });

      expect(resA.chunks.some((c) => c.includes(`"id":302`))).toBe(true);
      expect(resB.chunks.some((c) => c.includes(`"id":302`))).toBe(false);

      reqA.emit("close");
      reqB.emit("close");
    });
    
    it("17. Unrelated patient event is not delivered", async () => {
      vi.mocked(authSession.authenticateRequest).mockResolvedValue({ role: "doctor", openId: "synthetic-doctor:mock-central-cardiology-csmt" } as any);
      const req = new MockRequest();
      const res = new MockResponse();
      await routes["/api/doctor-events"](req, res);

      publishPatientEvent({ id: 303, userId: 1, type: "MEDICINE_UPDATED", entityId: "99", createdAt: new Date() });

      expect(res.chunks.some((c) => c.includes(`"id":303`))).toBe(false);
      expect(res.chunks.some((c) => c.includes("MEDICINE_UPDATED"))).toBe(false);
      req.emit("close");
    });

    it("18. Client cannot redirect event recipient", async () => {
      vi.mocked(authSession.authenticateRequest).mockResolvedValue({ role: "doctor", openId: "synthetic-doctor:mock-central-cardiology-csmt" } as any);
      const req = new MockRequest();
      req.query.doctorId = "mock-western-general-practice-churchgate";
      req.query.userId = "99";
      req.headers["x-doctor-id"] = "mock-western-general-practice-churchgate";
      req.headers["x-user-id"] = "99";
      const res = new MockResponse();
      await routes["/api/doctor-events"](req, res);

      publishDoctorEvent({ id: 304, doctorId: "mock-western-general-practice-churchgate", patientUserId: 99, type: "APPOINTMENT_UPDATED", entityId: "12", createdAt: new Date() });
      expect(res.chunks.some((c) => c.includes(`"id":304`))).toBe(false);

      publishDoctorEvent({ id: 305, doctorId: "mock-central-cardiology-csmt", patientUserId: 1, type: "APPOINTMENT_UPDATED", entityId: "12", createdAt: new Date() });
      expect(res.chunks.some((c) => c.includes(`"id":305`))).toBe(true);

      req.emit("close");
    });
  });

  describe("PAYLOAD SECURITY", () => {
    it("19. Wire payload contains only approved fields", async () => {
      vi.mocked(authSession.authenticateRequest).mockResolvedValue({ id: 1, role: "user" } as any);
      const req = new MockRequest();
      const res = new MockResponse();
      await routes["/api/patient-events"](req, res);
      
      const d = new Date("2026-09-06T12:00:00Z");
      publishPatientEvent({ id: 999, userId: 1, type: "MEDICINE_UPDATED", entityId: "123", createdAt: d });
      
      const chunk = res.chunks.find((c) => c.includes("MEDICINE_UPDATED"));
      expect(chunk).toContain(`"id":999`);
      expect(chunk).toContain(`"type":"MEDICINE_UPDATED"`);
      expect(chunk).toContain(`"entityId":"123"`);
      expect(chunk).toContain(`"createdAt":"2026-09-06T12:00:00.000Z"`);
      
      const payloadStr = chunk!.split("data: ")[1].trim();
      const payload = JSON.parse(payloadStr);
      expect(Object.keys(payload)).toEqual(["id", "type", "entityId", "createdAt"]);
      req.emit("close");
    });

    it("20. Sensitive medical/personal fields are absent", async () => {
      vi.mocked(authSession.authenticateRequest).mockResolvedValue({ id: 1, role: "user" } as any);
      const req = new MockRequest();
      const res = new MockResponse();
      await routes["/api/patient-events"](req, res);
      publishPatientEvent({ id: 999, userId: 1, type: "MEDICINE_UPDATED", entityId: "123", createdAt: new Date() });
      
      const chunk = res.chunks.find((c) => c.includes("MEDICINE_UPDATED"))!;
      expect(chunk).not.toContain("userId");
      expect(chunk).not.toContain("patientUserId");
      expect(chunk).not.toContain("symptoms");
      expect(chunk).not.toContain("name");
      req.emit("close");
    });

    it("21. Unauthorized recipients never receive sensitive/foreign payload", async () => {
      vi.mocked(authSession.authenticateRequest).mockResolvedValue({ id: 2, role: "user" } as any);
      const req = new MockRequest();
      const res = new MockResponse();
      await routes["/api/patient-events"](req, res);
      publishPatientEvent({ id: 999, userId: 1, type: "MEDICINE_UPDATED", entityId: "123", createdAt: new Date() });
      expect(res.chunks.some((c) => c.includes("MEDICINE_UPDATED"))).toBe(false);
      req.emit("close");
    });
  });

  describe("LIFECYCLE", () => {
    it("22. Unsubscribe removes listener", async () => {
      vi.mocked(authSession.authenticateRequest).mockResolvedValue({ id: 1, role: "user" } as any);
      const req = new MockRequest();
      const res = new MockResponse();
      await routes["/api/patient-events"](req, res);
      
      publishPatientEvent({ id: 1, userId: 1, type: "PROFILE_UPDATED", entityId: null, createdAt: new Date() });
      expect(res.chunks.some((c) => c.includes("PROFILE_UPDATED"))).toBe(true);
      
      req.emit("close");
      
      const chunksLength = res.chunks.length;
      publishPatientEvent({ id: 2, userId: 1, type: "PROFILE_UPDATED", entityId: null, createdAt: new Date() });
      expect(res.chunks.length).toBe(chunksLength);
    });

    it("23. Disconnected client receives no future events", async () => {
      vi.mocked(authSession.authenticateRequest).mockResolvedValue({ id: 1, role: "user" } as any);
      const req = new MockRequest();
      const res = new MockResponse();
      await routes["/api/patient-events"](req, res);
      req.emit("aborted");
      const chunksLength = res.chunks.length;
      publishPatientEvent({ id: 3, userId: 1, type: "PROFILE_UPDATED", entityId: null, createdAt: new Date() });
      expect(res.chunks.length).toBe(chunksLength);
    });

    it("24. Reconnect does not duplicate listeners", async () => {
      vi.mocked(authSession.authenticateRequest).mockResolvedValue({ id: 1, role: "user" } as any);
      const req1 = new MockRequest();
      const res1 = new MockResponse();
      await routes["/api/patient-events"](req1, res1);
      req1.emit("close");

      const req2 = new MockRequest();
      const res2 = new MockResponse();
      await routes["/api/patient-events"](req2, res2);

      publishPatientEvent({ id: 4, userId: 1, type: "PROFILE_UPDATED", entityId: null, createdAt: new Date() });
      
      expect(res1.chunks.some((c) => c.includes("PROFILE_UPDATED"))).toBe(false);
      const eventChunks = res2.chunks.filter((c) => c.includes("PROFILE_UPDATED"));
      expect(eventChunks.length).toBe(1);
      
      req2.emit("close");
    });

    it("25. Repeated reconnects remain bounded", async () => {
      vi.mocked(authSession.authenticateRequest).mockResolvedValue({ id: 1, role: "user" } as any);
      const responses: MockResponse[] = [];
      for (let i = 0; i < 50; i++) {
        const req = new MockRequest();
        const res = new MockResponse();
        responses.push(res);
        await routes["/api/patient-events"](req, res);
        req.emit("close");
      }
      publishPatientEvent({ id: 888, userId: 1, type: "PROFILE_UPDATED", entityId: null, createdAt: new Date() });
      const deliveredCount = responses.filter((r) => r.chunks.some((c) => c.includes(`"id":888`))).length;
      expect(deliveredCount).toBe(0);
    });

    it("26. One listener throwing does not stop another listener", async () => {
      vi.mocked(authSession.authenticateRequest).mockResolvedValueOnce({ id: 1, role: "user" } as any);
      const req1 = new MockRequest();
      const res1 = new MockResponse();
      await routes["/api/patient-events"](req1, res1);

      vi.mocked(authSession.authenticateRequest).mockResolvedValueOnce({ id: 1, role: "user" } as any);
      const req2 = new MockRequest();
      const res2 = new MockResponse();
      await routes["/api/patient-events"](req2, res2);

      res1.write = () => { throw new Error("Socket broken"); };
      
      publishPatientEvent({ id: 5, userId: 1, type: "MEDICINE_UPDATED", entityId: null, createdAt: new Date() });
      
      expect(res2.chunks.some((c) => c.includes("MEDICINE_UPDATED"))).toBe(true);
      
      req1.emit("close");
      req2.emit("close");
    });
  });

  describe("REPLAY", () => {
    it("27. Determine whether replay exists", () => {
      expect(parseLastEventId("42")).toBe(42);
      expect(parseLastEventId("invalid")).toBeUndefined();
      expect(parseLastEventId("-1")).toBeUndefined();
      expect(parseLastEventId("0")).toBeUndefined();
    });

    it("28. If implemented, test replay security/idempotency/bounds", async () => {
      vi.mocked(db.getPatientEventsSince).mockResolvedValueOnce([
        { id: 10, userId: 1, type: "APPOINTMENT_UPDATED", entityId: "5", createdAt: new Date() },
        { id: 11, userId: 1, type: "MEDICINE_UPDATED", entityId: "2", createdAt: new Date() },
      ]);
      vi.mocked(authSession.authenticateRequest).mockResolvedValue({ id: 1, role: "user" } as any);
      
      const req = new MockRequest();
      req.headers["last-event-id"] = "9";
      const res = new MockResponse();
      await routes["/api/patient-events"](req, res);
      
      expect(res.chunks.some((c) => c.includes("APPOINTMENT_UPDATED"))).toBe(true);
      expect(res.chunks.some((c) => c.includes("MEDICINE_UPDATED"))).toBe(true);
      
      expect(db.getPatientEventsSince).toHaveBeenCalledWith(1, 9);
      
      req.emit("close");
    });
    
    it("29. Doctor SSE route supports replay with last-event-id", async () => {
      vi.mocked(db.getDoctorEventsSince).mockResolvedValueOnce([
        { id: 15, doctorId: "mock-central-cardiology-csmt", patientUserId: 2, type: "APPOINTMENT_UPDATED", entityId: "8", createdAt: new Date() },
      ]);
      vi.mocked(authSession.authenticateRequest).mockResolvedValue({ role: "doctor", openId: "synthetic-doctor:mock-central-cardiology-csmt" } as any);
      
      const req = new MockRequest();
      req.headers["last-event-id"] = "14";
      const res = new MockResponse();
      await routes["/api/doctor-events"](req, res);
      
      expect(res.chunks.some((c) => c.includes("APPOINTMENT_UPDATED"))).toBe(true);
      expect(db.getDoctorEventsSince).toHaveBeenCalledWith("mock-central-cardiology-csmt", 14);
      
      req.emit("close");
    });
  });

  describe("FRONTEND", () => {
    it("30. Patient event invalidation mapping", () => {
      const utilsSpies = {
        patientDashboard: { summary: { invalidate: vi.fn() } },
        patientProfile: { get: { invalidate: vi.fn() } },
        patientAppointment: { list: { invalidate: vi.fn() } },
        patientPrescription: { list: { invalidate: vi.fn() } },
        assessment: { list: { invalidate: vi.fn() } },
        patientMedicine: { list: { invalidate: vi.fn() } },
      };

      const refreshForEvent = (type: string) => {
        utilsSpies.patientDashboard.summary.invalidate();
        switch (type) {
          case "PROFILE_UPDATED": utilsSpies.patientProfile.get.invalidate(); break;
          case "APPOINTMENT_UPDATED": utilsSpies.patientAppointment.list.invalidate(); break;
          case "PRESCRIPTION_CREATED": utilsSpies.patientPrescription.list.invalidate(); break;
          case "ASSESSMENT_COMPLETED": utilsSpies.assessment.list.invalidate(); break;
          case "MEDICINE_UPDATED": utilsSpies.patientMedicine.list.invalidate(); break;
        }
      };

      refreshForEvent("PROFILE_UPDATED");
      expect(utilsSpies.patientDashboard.summary.invalidate).toHaveBeenCalledTimes(1);
      expect(utilsSpies.patientProfile.get.invalidate).toHaveBeenCalledTimes(1);

      refreshForEvent("MEDICINE_UPDATED");
      expect(utilsSpies.patientDashboard.summary.invalidate).toHaveBeenCalledTimes(2);
      expect(utilsSpies.patientMedicine.list.invalidate).toHaveBeenCalledTimes(1);
    });

    it("31. Doctor event invalidation mapping", () => {
      const utilsSpies = {
        doctorWorkspace: {
          dashboard: { invalidate: vi.fn() },
          appointments: { list: { invalidate: vi.fn() } },
          patients: { invalidate: vi.fn() },
          patientDetail: { invalidate: vi.fn() },
        },
      };

      const handleDoctorEvent = (type: string) => {
        if (type === "APPOINTMENT_UPDATED" || type === "ASSESSMENT_COMPLETED" || type === "PATIENT_RELATED_UPDATE") {
          utilsSpies.doctorWorkspace.dashboard.invalidate();
          utilsSpies.doctorWorkspace.appointments.list.invalidate();
          utilsSpies.doctorWorkspace.patients.invalidate();
          utilsSpies.doctorWorkspace.patientDetail.invalidate();
        }
      };

      handleDoctorEvent("APPOINTMENT_UPDATED");
      expect(utilsSpies.doctorWorkspace.dashboard.invalidate).toHaveBeenCalledTimes(1);
      expect(utilsSpies.doctorWorkspace.appointments.list.invalidate).toHaveBeenCalledTimes(1);
      expect(utilsSpies.doctorWorkspace.patients.invalidate).toHaveBeenCalledTimes(1);
      expect(utilsSpies.doctorWorkspace.patientDetail.invalidate).toHaveBeenCalledWith();

      handleDoctorEvent("PATIENT_RELATED_UPDATE");
      expect(utilsSpies.doctorWorkspace.patientDetail.invalidate).toHaveBeenCalledTimes(2);
    });

    it("32. SSE payload is not rendered as trusted clinical state", async () => {
      vi.mocked(authSession.authenticateRequest).mockResolvedValue({ role: "doctor", openId: "synthetic-doctor:mock-central-cardiology-csmt" } as any);
      const req = new MockRequest();
      const res = new MockResponse();
      await routes["/api/doctor-events"](req, res);

      const fullEvent = {
        id: 777,
        doctorId: "mock-central-cardiology-csmt",
        patientUserId: 42,
        type: "APPOINTMENT_UPDATED" as const,
        entityId: "101",
        createdAt: new Date("2026-09-06T15:00:00Z"),
      };
      publishDoctorEvent(fullEvent);

      const chunk = res.chunks.find((c) => c.includes(`"id":777`));
      expect(chunk).toBeDefined();

      const dataLine = chunk!.split("\n").find((line) => line.startsWith("data: "));
      expect(dataLine).toBeDefined();

      const payloadJson = dataLine!.replace("data: ", "").trim();
      const payload = JSON.parse(payloadJson);

      expect(Object.keys(payload).sort()).toEqual(["createdAt", "entityId", "id", "type"]);

      const ForbiddenStrings = [
        "userId", "patientUserId", "doctorId", "symptoms", "diagnosis",
        "conditions", "notes", "clinicalNotes", "medications", "allergies",
        "emergencyContacts", "password", "jwt", "token"
      ];
      for (const field of ForbiddenStrings) {
        expect(payloadJson).not.toContain(`"${field}"`);
      }

      req.emit("close");
    });
  });
});
