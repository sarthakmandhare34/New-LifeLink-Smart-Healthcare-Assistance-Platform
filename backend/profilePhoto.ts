import express, { type Express } from "express";                                        // Express framework and types
import { createPatientEvent, updatePatientAvatarKey } from "./db";                         // Database mutations for avatar key and event publishing
import { authSession } from "./auth/authUtil";                                             // JWT session validator
import { storagePut } from "./storage";                                                    // Local disk file persistence helper

export const PROFILE_PHOTO_MAX_BYTES = 2 * 1024 * 1024;                                    // 2 MB maximum allowable upload size limit

// Whitelist mapping of supported image MIME types to file extensions
const profilePhotoTypes = {
  "image/jpeg": "jpg",                                                                     // JPEG format
  "image/png": "png",                                                                      // PNG format
  "image/webp": "webp",                                                                    // WebP format
} as const;

type ProfilePhotoType = keyof typeof profilePhotoTypes;                                    // Union of allowed MIME types

// Validates the binary "magic bytes" header signature to prevent file extension spoofing
function hasExpectedSignature(contentType: ProfilePhotoType, body: Buffer) {
  if (contentType === "image/jpeg") return body.length >= 3 && body[0] === 0xff && body[1] === 0xd8 && body[2] === 0xff; // JPEG magic bytes FF D8 FF
  if (contentType === "image/png") return body.length >= 8 && body.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])); // PNG magic bytes
  return body.length >= 12 && body.subarray(0, 4).toString("ascii") === "RIFF" && body.subarray(8, 12).toString("ascii") === "WEBP"; // WebP RIFF/WEBP header
}

// Full validation suite checking MIME header, buffer existence, file size, and magic byte signatures
export function validateProfilePhotoUpload(contentType: string, body: unknown): { ok: true; extension: string } | { ok: false; message: string } {
  if (!(contentType in profilePhotoTypes)) return { ok: false, message: "Use a JPG, PNG, or WebP image." }; // Content-Type check
  if (!Buffer.isBuffer(body) || body.length === 0) return { ok: false, message: "Choose an image to upload." }; // Empty buffer check
  if (body.length > PROFILE_PHOTO_MAX_BYTES) return { ok: false, message: "Choose an image smaller than 2 MB." }; // Size limit check
  if (!hasExpectedSignature(contentType as ProfilePhotoType, body)) return { ok: false, message: "The selected file does not match its image type." }; // Binary signature check
  return { ok: true, extension: profilePhotoTypes[contentType as ProfilePhotoType] };      // Approved upload with sanitized extension
}

/** Accepts one small image, derives patient ownership from the signed cookie, and stores only a managed key. */
export function registerPatientProfilePhotoRoute(app: Express) {
  app.post(
    "/api/patient/profile-photo",
    express.raw({ type: () => true, limit: `${PROFILE_PHOTO_MAX_BYTES}b` }),               // Read raw binary payload up to 2 MB
    async (req, res) => {
      if (req.get("x-lifelink-request") !== "profile-photo") {                             // CSRF security check header
        return res.status(403).json({ error: "Invalid profile-photo request." });
      }

      const user = await authSession.authenticateRequest(req).catch(() => null);           // Authenticate patient via session cookie
      if (!user) return res.status(401).json({ error: "Please sign in before changing your photo." }); // Reject guests

      const contentType = req.get("content-type")?.split(";", 1)[0]?.toLowerCase() ?? "";  // Extract pure MIME type
      const validation = validateProfilePhotoUpload(contentType, req.body);                 // Perform deep image validation
      if (!validation.ok) return res.status(400).json({ error: validation.message });      // Return error description

      try {
        const stored = await storagePut(                                                   // Write image to disk storage
          `patient-profile-photos/${user.id}/avatar.${validation.extension}`,
          req.body,
          contentType,
        );
        await updatePatientAvatarKey(user.id, stored.key);                                 // Store storage key in users MySQL table
        await createPatientEvent(user.id, "PROFILE_UPDATED", String(user.id));             // Broadcast real-time update event
        return res.status(201).json({ avatarUrl: stored.url });                            // Return public avatar image URL
      } catch (error) {
        console.error("[ProfilePhoto] Upload failed", error);
        return res.status(500).json({ error: "Your photo could not be saved. Please try again." });
      }
    },
  );
}
