import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);
const KEY_LENGTH = 64;

/** Hash a native patient password with a unique salt; plaintext is never persisted. */
export async function hashPatientPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derived = (await scrypt(password, salt, KEY_LENGTH)) as Buffer;
  return `${salt}:${derived.toString("hex")}`;
}

/** Verify a password against the stored `salt:hash` value in constant time. */
export async function verifyPatientPassword(password: string, storedHash: string): Promise<boolean> {
  const [salt, encodedHash] = storedHash.split(":");
  if (!salt || !encodedHash) return false;

  const expected = Buffer.from(encodedHash, "hex");
  const derived = (await scrypt(password, salt, KEY_LENGTH)) as Buffer;
  if (expected.length !== derived.length) return false;
  return timingSafeEqual(expected, derived);
}
