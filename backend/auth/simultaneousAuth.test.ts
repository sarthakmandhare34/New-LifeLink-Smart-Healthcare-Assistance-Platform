import { describe, expect, it } from "vitest";
import { createContext } from "../_core/context";
import { authSession } from "./authUtil";
import { COOKIE_NAME, DOCTOR_COOKIE_NAME } from "../../shared/const";
import { appRouter } from "../routers";

describe("Simultaneous Doctor and Patient Sessions", () => {
  it("resolves both patient and doctor sessions concurrently without collision", async () => {
    // Generate valid tokens for both a patient and a doctor
    const patientToken = await authSession.createSessionToken("patient-open-id-123", { name: "Test Patient" });
    const doctorToken = await authSession.createSessionToken("synthetic-doctor:mock-central-cardiology-csmt", { name: "Dr. Central" });

    // Mock incoming request with BOTH cookies present simultaneously
    const req = {
      protocol: "https",
      url: "/api/trpc",
      headers: {
        cookie: `${COOKIE_NAME}=${patientToken}; ${DOCTOR_COOKIE_NAME}=${doctorToken}`,
      },
    } as any;

    const res = { cookie: () => {}, clearCookie: () => {} } as any;

    // Build context
    const ctx = await createContext({ req, res });

    // Verify context holds both identities separately
    expect(ctx.patientUser).toBeDefined();
    expect(ctx.doctorUser).toBeDefined();
  });
});
