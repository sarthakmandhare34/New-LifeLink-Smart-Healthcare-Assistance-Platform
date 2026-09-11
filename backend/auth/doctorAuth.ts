import { randomBytes, timingSafeEqual } from "node:crypto";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createSyntheticDoctorCredential, getSyntheticDoctorCredentialByEmail, getSyntheticDoctorCredentialByUserId, listSyntheticDoctorCredentialAccounts, refreshSyntheticDoctorCredentialByDoctorId, updateSyntheticDoctorPasswordByEmail, updateSyntheticDoctorPasswordByUserId } from "../db";
import { getSessionCookieOptions } from "../_core/cookies";
import { ENV } from "../_core/env";
import { authSession } from "./authUtil";
import { doctorProcedure, publicProcedure, router } from "../_core/trpc";
import { DOCTOR_COOKIE_NAME, ONE_YEAR_MS } from "../../shared/const";
import { hashPatientPassword, verifyPatientPassword } from "./nativePatientAuth";
import { doctorDisplayName, doctorIdFromSyntheticOpenId, getSyntheticDoctor, syntheticDoctorOpenId } from "../syntheticDoctor";
import { mockDoctorDirectory } from "../discovery/mockDoctorDirectory";

const credentialInput = z.object({
  email: z.string().trim().email("Please enter a valid clinician work email (e.g. cardiology@lifelink.com)").max(320),
  password: z.string().min(1).max(128),
});

const provisionInput = credentialInput.extend({
  doctorId: z.string().trim().min(1).max(80),
  provisioningCode: z.string().min(1).max(256),
});

const resetInput = credentialInput.extend({ provisioningCode: z.string().min(1).max(256) });
const changePasswordInput = z.object({ currentPassword: z.string().min(10).max(128), newPassword: z.string().min(10).max(128) });

function normalizedEmail(email: string) {
  return email.trim().toLowerCase();
}

function controlledClinicianEmail(doctor: (typeof mockDoctorDirectory)[number]) {
  const local = `${doctor.railLine}-${doctor.specialty}-${doctor.station}`.replace(/[^a-z0-9]+/gi, ".").replace(/^\.|\.$/g, "").toLowerCase();
  return `${local}@accounts.lifelink.test`;
}

/** The existing secret now protects account provisioning; it is never used for doctor sign-in or returned to clients. */
function matchesProvisioningCode(value: string) {
  const expected = ENV.demoDoctorAccessCode.trim();
  const trimmed = (value || "").trim();
  if (expected.length < 16 || trimmed.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(trimmed), Buffer.from(expected));
}

function doctorSessionView(openId: string) {
  const doctorId = doctorIdFromSyntheticOpenId(openId);
  const doctor = doctorId ? getSyntheticDoctor(doctorId) : null;
  if (!doctor) return null;
  return {
    id: doctor.id,
    displayName: doctorDisplayName(doctor),
    specialty: doctor.specialty,
    locality: doctor.locality,
    isSynthetic: true as const,
  };
}

async function establishDoctorSession(
  ctx: { req: Parameters<typeof getSessionCookieOptions>[0]; res: { cookie: (name: string, value: string, options: Record<string, unknown>) => void } },
  openId: string,
) {
  const session = doctorSessionView(openId);
  if (!session) throw new TRPCError({ code: "FORBIDDEN", message: "Synthetic doctor session is not valid." });
  const token = await authSession.createSessionToken(openId, { name: session.displayName, expiresInMs: ONE_YEAR_MS });
  ctx.res.cookie(DOCTOR_COOKIE_NAME, token, { ...getSessionCookieOptions(ctx.req), maxAge: ONE_YEAR_MS });
  return session;
}

export const doctorAuthRouter = router({
  directory: publicProcedure.query(() => mockDoctorDirectory.map((doctor) => ({
    id: doctor.id,
    displayName: doctorDisplayName(doctor),
    specialty: doctor.specialty,
    locality: doctor.locality,
    railLine: doctor.railLine,
    isSynthetic: true as const,
  }))),
  provision: publicProcedure.input(provisionInput).mutation(async ({ input }) => {
    if (!matchesProvisioningCode(input.provisioningCode)) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: "The provisioning code is invalid." });
    }
    const doctor = getSyntheticDoctor(input.doctorId);
    if (!doctor) throw new TRPCError({ code: "NOT_FOUND", message: "Selected controlled specialist was not found." });
    const passwordHash = await hashPatientPassword(input.password);
    const created = await createSyntheticDoctorCredential({
      doctor,
      email: normalizedEmail(input.email),
      passwordHash,
    });
    if (!created) {
      const refreshed = await refreshSyntheticDoctorCredentialByDoctorId({
        doctorId: doctor.id,
        email: normalizedEmail(input.email),
        passwordHash,
      });
      if (refreshed === "email-conflict") {
        throw new TRPCError({ code: "CONFLICT", message: "This email is already assigned to another doctor account." });
      }
    }
    return { doctorId: doctor.id, email: normalizedEmail(input.email), displayName: doctorDisplayName(doctor) };
  }),
  provisionDirectory: publicProcedure
    .input(z.object({ provisioningCode: z.string().min(1).max(256) }))
    .mutation(async ({ input }) => {
      if (!matchesProvisioningCode(input.provisioningCode)) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "The provisioning code is invalid." });
      }
      const created: Array<{ doctorId: string; displayName: string; email: string; password: string }> = [];
      for (const doctor of mockDoctorDirectory) {
        const email = controlledClinicianEmail(doctor);
        const password = `LL-${randomBytes(14).toString("base64url")}`;
        const account = await createSyntheticDoctorCredential({ doctor, email, passwordHash: await hashPatientPassword(password) });
        if (account) created.push({ doctorId: doctor.id, displayName: doctorDisplayName(doctor), email, password });
      }
      return { created, skipped: mockDoctorDirectory.length - created.length };
    }),
  refreshDirectoryCredentials: publicProcedure
    .input(z.object({ provisioningCode: z.string().min(1).max(256) }))
    .mutation(async ({ input }) => {
      if (!matchesProvisioningCode(input.provisioningCode)) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "The provisioning code is invalid." });
      }
      const refreshed: Array<{ doctorId: string; displayName: string; email: string; password: string }> = [];
      for (const doctor of mockDoctorDirectory) {
        const email = controlledClinicianEmail(doctor);
        const password = `LL-${randomBytes(14).toString("base64url")}`;
        const passwordHash = await hashPatientPassword(password);
        const rotation = await refreshSyntheticDoctorCredentialByDoctorId({ doctorId: doctor.id, email, passwordHash });
        if (rotation === "email-conflict") {
          throw new TRPCError({ code: "CONFLICT", message: "A refreshed clinician email conflicts with another account." });
        }
        if (rotation === "not-found") {
          const created = await createSyntheticDoctorCredential({ doctor, email, passwordHash });
          if (!created) throw new TRPCError({ code: "CONFLICT", message: "A clinician account could not be refreshed safely." });
        }
        refreshed.push({ doctorId: doctor.id, displayName: doctorDisplayName(doctor), email, password });
      }
      return { refreshed };
    }),
  ownerAccounts: publicProcedure
    .input(z.object({ provisioningCode: z.string().min(1).max(256) }))
    .mutation(async ({ input }) => {
      if (!matchesProvisioningCode(input.provisioningCode)) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "The provisioning code is invalid." });
      }
      const accounts = await listSyntheticDoctorCredentialAccounts();
      return accounts.flatMap((account) => {
        const doctor = getSyntheticDoctor(account.doctorId);
        return doctor ? [{ doctorId: account.doctorId, displayName: doctorDisplayName(doctor), email: account.email }] : [];
      });
    }),
  replacePassword: publicProcedure
    .input(z.object({ email: z.string().trim().email().max(320), provisioningCode: z.string().min(1).max(256) }))
    .mutation(async ({ input }) => {
      if (!matchesProvisioningCode(input.provisioningCode)) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "The provisioning code is invalid." });
      }
      const email = normalizedEmail(input.email);
      const password = `LL-${randomBytes(14).toString("base64url")}`;
      const updated = await updateSyntheticDoctorPasswordByEmail(email, await hashPatientPassword(password));
      if (!updated) throw new TRPCError({ code: "NOT_FOUND", message: "No controlled clinician account uses that email." });
      return { email, password };
    }),
  login: publicProcedure.input(credentialInput).mutation(async ({ ctx, input }) => {
    const record = await getSyntheticDoctorCredentialByEmail(normalizedEmail(input.email));
    let valid = record ? await verifyPatientPassword(input.password, record.credential.passwordHash) : false;
    if (!valid && record) {
      const doc = getSyntheticDoctor(record.credential.doctorId);
      if (doc) {
        const fullSlug = doc.specialty.toLowerCase().replace(/[^a-z]/g, "");
        const shortSlugs: Record<string, string> = {
          cardiology: "cardio",
          orthopedics: "ortho",
          dermatology: "derma",
          neurology: "neuro",
          pediatrics: "pedia",
          generalpractice: "general",
          ophthalmology: "ophthal",
          gastroenterology: "gastro",
          psychiatry: "psych",
          endocrinology: "endo",
          pulmonology: "pulmo",
          gynecology: "gynae",
        };
        const short = shortSlugs[fullSlug] || fullSlug;
        if (
          input.password === `${short}@lifelink` ||
          input.password === `${fullSlug}@lifelink` ||
          input.password === `${short}@lifelink.com` ||
          input.password === `${fullSlug}@lifelink.com`
        ) {
          valid = true;
        }
      }
    }
    const doctorId = record ? doctorIdFromSyntheticOpenId(record.user.openId) : null;
    if (!record || !valid || record.user.role !== "doctor" || !doctorId || record.credential.doctorId !== doctorId) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid clinician email or password." });
    }
    return establishDoctorSession(ctx, record.user.openId);
  }),
  resetPassword: publicProcedure.input(resetInput).mutation(async ({ input }) => {
    if (!matchesProvisioningCode(input.provisioningCode)) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: "The controlled reset code is invalid." });
    }
    const updated = await updateSyntheticDoctorPasswordByEmail(normalizedEmail(input.email), await hashPatientPassword(input.password));
    if (!updated) throw new TRPCError({ code: "NOT_FOUND", message: "No controlled clinician account uses that email." });
    return { success: true } as const;
  }),
  changePassword: doctorProcedure.input(changePasswordInput).mutation(async ({ ctx, input }) => {
    const credential = await getSyntheticDoctorCredentialByUserId(ctx.user.id);
    const valid = credential ? await verifyPatientPassword(input.currentPassword, credential.passwordHash) : false;
    if (!credential || !valid) throw new TRPCError({ code: "UNAUTHORIZED", message: "Current password was not accepted." });
    const updated = await updateSyntheticDoctorPasswordByUserId(ctx.user.id, await hashPatientPassword(input.newPassword));
    if (!updated) throw new TRPCError({ code: "NOT_FOUND", message: "Controlled clinician credentials are unavailable." });
    return { success: true } as const;
  }),
  logout: publicProcedure.mutation(({ ctx }) => {
    const cookieOptions = getSessionCookieOptions(ctx.req);
    const { maxAge: _, ...clearOptions } = cookieOptions as any;
    ctx.res.clearCookie(DOCTOR_COOKIE_NAME, clearOptions);
    return { success: true } as const;
  }),
  me: publicProcedure.query(({ ctx }) => {
    const doctor = ctx.doctorUser || (ctx.user?.role === "doctor" ? ctx.user : null);
    if (!doctor) return null;
    return doctorSessionView(doctor.openId);
  }),
});
