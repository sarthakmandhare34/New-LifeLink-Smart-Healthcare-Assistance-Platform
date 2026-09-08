import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createSyntheticDoctorCredential: vi.fn(),
  getSyntheticDoctorCredentialByEmail: vi.fn(),
  getSyntheticDoctorCredentialByUserId: vi.fn(),
  listSyntheticDoctorCredentialAccounts: vi.fn(),
  refreshSyntheticDoctorCredentialByDoctorId: vi.fn(),
  updateSyntheticDoctorPasswordByEmail: vi.fn(),
  updateSyntheticDoctorPasswordByUserId: vi.fn(),
  hashPatientPassword: vi.fn(),
  verifyPatientPassword: vi.fn(),
  createSessionToken: vi.fn(),
}));

vi.mock("../db", () => ({
  createSyntheticDoctorCredential: mocks.createSyntheticDoctorCredential,
  getSyntheticDoctorCredentialByEmail: mocks.getSyntheticDoctorCredentialByEmail,
  getSyntheticDoctorCredentialByUserId: mocks.getSyntheticDoctorCredentialByUserId,
  listSyntheticDoctorCredentialAccounts: mocks.listSyntheticDoctorCredentialAccounts,
  refreshSyntheticDoctorCredentialByDoctorId: mocks.refreshSyntheticDoctorCredentialByDoctorId,
  updateSyntheticDoctorPasswordByEmail: mocks.updateSyntheticDoctorPasswordByEmail,
  updateSyntheticDoctorPasswordByUserId: mocks.updateSyntheticDoctorPasswordByUserId,
}));
vi.mock("./nativePatientAuth", () => ({
  hashPatientPassword: mocks.hashPatientPassword,
  verifyPatientPassword: mocks.verifyPatientPassword,
}));
vi.mock("./authUtil", () => ({ authSession: { createSessionToken: mocks.createSessionToken } }));

import { ENV } from "../_core/env";
import { doctorAuthRouter } from "./doctorAuth";

function context() {
  const cookie = vi.fn();
  return {
    ctx: { user: null, req: { protocol: "https", headers: {} }, res: { cookie } } as any,
    cookie,
  };
}

function doctorContext() {
  return {
    user: { id: 73, openId: "synthetic-doctor:mock-central-cardiology-csmt", role: "doctor", name: "Controlled cardiology specialist", email: null, loginMethod: null, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
    req: { protocol: "https", headers: {} },
    res: { cookie: vi.fn() },
  } as any;
}

describe("synthetic doctor credentials", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.hashPatientPassword.mockResolvedValue("hashed-separate-password");
    mocks.createSessionToken.mockResolvedValue("signed-demo-doctor-session");
  });

  it("provisions one controlled doctor with the configured server-only provisioning code without returning it", async () => {
    const provisioningCode = ENV.demoDoctorAccessCode;
    expect(provisioningCode?.length ?? 0).toBeGreaterThanOrEqual(16);
    mocks.createSyntheticDoctorCredential.mockResolvedValue({
      user: { id: 73, openId: "synthetic-doctor:mock-central-cardiology-csmt", role: "doctor" },
      doctorId: "mock-central-cardiology-csmt",
      email: "cardiology-demo@lifelink.example",
    });

    const result = await doctorAuthRouter.createCaller(context().ctx).provision({
      doctorId: "mock-central-cardiology-csmt",
      email: "cardiology-demo@lifelink.example",
      password: "SeparateDemoPass1!",
      provisioningCode: provisioningCode!,
    });

    expect(result).toMatchObject({ doctorId: "mock-central-cardiology-csmt" });
    expect(JSON.stringify(result)).not.toContain(provisioningCode!);
    expect(mocks.createSyntheticDoctorCredential).toHaveBeenCalledWith(expect.objectContaining({ email: "cardiology-demo@lifelink.example", passwordHash: "hashed-separate-password" }));
  });

  it("provisions only unprovisioned controlled doctors and never returns the owner code", async () => {
    const provisioningCode = ENV.demoDoctorAccessCode;
    mocks.createSyntheticDoctorCredential.mockResolvedValueOnce({ user: { id: 73 }, doctorId: "mock-central-cardiology-csmt", email: "first@accounts.lifelink.test" }).mockResolvedValue(null);

    const result = await doctorAuthRouter.createCaller(context().ctx).provisionDirectory({ provisioningCode: provisioningCode! });

    expect(result.created).toHaveLength(1);
    expect(result.skipped).toBeGreaterThan(0);
    expect(JSON.stringify(result)).not.toContain(provisioningCode!);
    expect(result.created[0]?.password).toMatch(/^LL-/);
    expect(result.created[0]?.email).toMatch(/@accounts\.lifelink\.test$/);
  });

  it("rotates every controlled clinician email and password only after owner authorization", async () => {
    const provisioningCode = ENV.demoDoctorAccessCode;
    mocks.refreshSyntheticDoctorCredentialByDoctorId.mockResolvedValue("updated");

    const result = await doctorAuthRouter.createCaller(context().ctx).refreshDirectoryCredentials({ provisioningCode: provisioningCode! });

    expect(result.refreshed).toHaveLength(12);
    expect(result.refreshed.every((credential) => credential.email.endsWith("@accounts.lifelink.test") && credential.password.startsWith("LL-"))).toBe(true);
    expect(mocks.refreshSyntheticDoctorCredentialByDoctorId).toHaveBeenCalledTimes(12);
    expect(JSON.stringify(result)).not.toContain(provisioningCode!);
  });

  it("creates a session only for a doctor matching the supplied email and password", async () => {
    mocks.getSyntheticDoctorCredentialByEmail.mockResolvedValue({
      user: { id: 73, openId: "synthetic-doctor:mock-western-general-practice-churchgate", role: "doctor" },
      credential: { doctorId: "mock-western-general-practice-churchgate", passwordHash: "stored-hash" },
    });
    mocks.verifyPatientPassword.mockResolvedValue(true);
    const { ctx, cookie } = context();

    const result = await doctorAuthRouter.createCaller(ctx).login({ email: "general-demo@lifelink.example", password: "SeparateDemoPass1!" });

    expect(result).toMatchObject({ id: "mock-western-general-practice-churchgate", isSynthetic: true });
    expect(cookie).toHaveBeenCalledWith(expect.any(String), "signed-demo-doctor-session", expect.any(Object));
  });

  it("resets a password only when the configured owner provisioning code is supplied", async () => {
    const provisioningCode = ENV.demoDoctorAccessCode;
    mocks.updateSyntheticDoctorPasswordByEmail.mockResolvedValue(true);

    await expect(doctorAuthRouter.createCaller(context().ctx).resetPassword({ email: "cardiology-demo@lifelink.example", password: "NewSeparatePass1!", provisioningCode: provisioningCode! })).resolves.toEqual({ success: true });
    expect(mocks.updateSyntheticDoctorPasswordByEmail).toHaveBeenCalledWith("cardiology-demo@lifelink.example", "hashed-separate-password");
  });

  it("lists provisioned clinician emails only after owner authorization and never includes password hashes", async () => {
    const provisioningCode = ENV.demoDoctorAccessCode;
    mocks.listSyntheticDoctorCredentialAccounts.mockResolvedValue([{ doctorId: "mock-central-cardiology-csmt", email: "cardiology@lifelink.test" }]);

    const result = await doctorAuthRouter.createCaller(context().ctx).ownerAccounts({ provisioningCode: provisioningCode! });

    expect(result).toEqual([{ doctorId: "mock-central-cardiology-csmt", displayName: expect.any(String), email: "cardiology@lifelink.test" }]);
    expect(JSON.stringify(result)).not.toContain("passwordHash");
  });

  it("replaces a clinician password only with the owner provisioning code and returns the new password once", async () => {
    const provisioningCode = ENV.demoDoctorAccessCode;
    mocks.updateSyntheticDoctorPasswordByEmail.mockResolvedValue(true);

    const result = await doctorAuthRouter.createCaller(context().ctx).replacePassword({ email: "cardiology@lifelink.test", provisioningCode: provisioningCode! });

    expect(result.email).toBe("cardiology@lifelink.test");
    expect(result.password).toMatch(/^LL-/);
    expect(mocks.updateSyntheticDoctorPasswordByEmail).toHaveBeenCalledWith("cardiology@lifelink.test", "hashed-separate-password");
  });

  it("changes only the signed doctor’s own password after current-password verification", async () => {
    mocks.getSyntheticDoctorCredentialByUserId.mockResolvedValue({ userId: 73, passwordHash: "stored-hash" });
    mocks.verifyPatientPassword.mockResolvedValue(true);
    mocks.updateSyntheticDoctorPasswordByUserId.mockResolvedValue(true);

    await expect(doctorAuthRouter.createCaller(doctorContext()).changePassword({ currentPassword: "SeparateDemoPass1!", newPassword: "NewSeparatePass1!" })).resolves.toEqual({ success: true });
    expect(mocks.updateSyntheticDoctorPasswordByUserId).toHaveBeenCalledWith(73, "hashed-separate-password");
  });
});
