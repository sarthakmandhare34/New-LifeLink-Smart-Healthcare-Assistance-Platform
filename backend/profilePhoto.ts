import express, { type Express } from "express";
import { createPatientEvent, updatePatientAvatarKey } from "./db";
import { authSession } from "./auth/authUtil";
import { storagePut } from "./storage";

export const PROFILE_PHOTO_MAX_BYTES = 2 * 1024 * 1024;

const profilePhotoTypes = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
} as const;

type ProfilePhotoType = keyof typeof profilePhotoTypes;

function hasExpectedSignature(contentType: ProfilePhotoType, body: Buffer) {
  if (contentType === "image/jpeg") return body.length >= 3 && body[0] === 0xff && body[1] === 0xd8 && body[2] === 0xff;
  if (contentType === "image/png") return body.length >= 8 && body.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  return body.length >= 12 && body.subarray(0, 4).toString("ascii") === "RIFF" && body.subarray(8, 12).toString("ascii") === "WEBP";
}

export function validateProfilePhotoUpload(contentType: string, body: unknown): { ok: true; extension: string } | { ok: false; message: string } {
  if (!(contentType in profilePhotoTypes)) return { ok: false, message: "Use a JPG, PNG, or WebP image." };
  if (!Buffer.isBuffer(body) || body.length === 0) return { ok: false, message: "Choose an image to upload." };
  if (body.length > PROFILE_PHOTO_MAX_BYTES) return { ok: false, message: "Choose an image smaller than 2 MB." };
  if (!hasExpectedSignature(contentType as ProfilePhotoType, body)) return { ok: false, message: "The selected file does not match its image type." };
  return { ok: true, extension: profilePhotoTypes[contentType as ProfilePhotoType] };
}

/** Accepts one small image, derives patient ownership from the signed cookie, and stores only a managed key. */
export function registerPatientProfilePhotoRoute(app: Express) {
  app.post(
    "/api/patient/profile-photo",
    express.raw({ type: () => true, limit: `${PROFILE_PHOTO_MAX_BYTES}b` }),
    async (req, res) => {
      if (req.get("x-lifelink-request") !== "profile-photo") {
        return res.status(403).json({ error: "Invalid profile-photo request." });
      }

      const user = await authSession.authenticateRequest(req).catch(() => null);
      if (!user) return res.status(401).json({ error: "Please sign in before changing your photo." });

      const contentType = req.get("content-type")?.split(";", 1)[0]?.toLowerCase() ?? "";
      const validation = validateProfilePhotoUpload(contentType, req.body);
      if (!validation.ok) return res.status(400).json({ error: validation.message });

      try {
        const stored = await storagePut(
          `patient-profile-photos/${user.id}/avatar.${validation.extension}`,
          req.body,
          contentType,
        );
        await updatePatientAvatarKey(user.id, stored.key);
        await createPatientEvent(user.id, "PROFILE_UPDATED", String(user.id));
        return res.status(201).json({ avatarUrl: stored.url });
      } catch (error) {
        console.error("[ProfilePhoto] Upload failed", error);
        return res.status(500).json({ error: "Your photo could not be saved. Please try again." });
      }
    },
  );
}
