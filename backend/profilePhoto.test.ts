import { describe, expect, it } from "vitest";
import { PROFILE_PHOTO_MAX_BYTES, validateProfilePhotoUpload } from "./profilePhoto";

describe("patient profile photo validation", () => {
  it("accepts a small PNG body that matches its declared type", () => {
    const result = validateProfilePhotoUpload("image/png", Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x01]));
    expect(result).toEqual({ ok: true, extension: "png" });
  });

  it("rejects unsupported, oversized, and mismatched photo uploads before storage", () => {
    expect(validateProfilePhotoUpload("image/gif", Buffer.from([1]))).toMatchObject({ ok: false });
    expect(validateProfilePhotoUpload("image/jpeg", Buffer.from([0x89, 0x50, 0x4e, 0x47]))).toMatchObject({ ok: false });
    expect(validateProfilePhotoUpload("image/webp", Buffer.alloc(PROFILE_PHOTO_MAX_BYTES + 1))).toMatchObject({ ok: false });
  });
});
