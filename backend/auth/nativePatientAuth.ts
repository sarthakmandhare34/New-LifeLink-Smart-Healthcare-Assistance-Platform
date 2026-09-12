import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";     // Node native cryptographic utilities for secure hashing and constant-time compare
import { promisify } from "node:util";                                                     // Converts callback-based APIs into async Promise-based functions

const scrypt = promisify(scryptCallback);                                                  // Promisified scrypt key derivation function (resistant to GPU attacks)
const KEY_LENGTH = 64;                                                                     // Derived cryptographic key length in bytes (512-bit security)

/** Hash a native patient password with a unique salt; plaintext is never persisted. */
export async function hashPatientPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");                                            // Generate cryptographically strong 16-byte random salt
  const derived = (await scrypt(password, salt, KEY_LENGTH)) as Buffer;                    // Derive heavy key buffer using memory-hard scrypt
  return `${salt}:${derived.toString("hex")}`;                                             // Format as salt:hash for storage in MySQL database
}

/** Verify a password against the stored `salt:hash` value in constant time. */
export async function verifyPatientPassword(password: string, storedHash: string): Promise<boolean> {
  const [salt, encodedHash] = storedHash.split(":");                                       // Split stored string into salt and expected hash
  if (!salt || !encodedHash) return false;                                                 // Malformed hash format check

  const expected = Buffer.from(encodedHash, "hex");                                        // Decode stored hash hex string into raw binary Buffer
  const derived = (await scrypt(password, salt, KEY_LENGTH)) as Buffer;                    // Re-hash entered plaintext password with same salt
  if (expected.length !== derived.length) return false;                                    // Length check to prevent timingSafeEqual crashes
  return timingSafeEqual(expected, derived);                                               // Constant-time comparison preventing timing attacks
}
