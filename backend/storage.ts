import fs from 'node:fs/promises';                                                        // Node asynchronous file system API
import path from 'node:path';                                                              // Path normalization and join utilities
import crypto from 'node:crypto';                                                          // Cryptographic UUID generation

const UPLOADS_DIR = path.resolve(process.cwd(), 'uploads');                                // Root local filesystem folder for user uploads

// Ensures that the destination uploads directory exists on disk, creating it if needed
async function ensureUploadsDir() {
  try {
    await fs.mkdir(UPLOADS_DIR, { recursive: true });                                      // Create folder recursively
  } catch (error) {
    console.error('Failed to create uploads directory:', error);
  }
}

// Converts deep slashes into hyphens to safely flatten object keys for filesystem storage
function normalizeKey(relKey: string): string {
  return relKey.replace(/^\/+/, "").replace(/\//g, "-");                                   // Strip leading slashes and replace nested slashes
}

// Appends an 8-character random UUID hash to filename before the extension to prevent overwriting
function appendHashSuffix(relKey: string): string {
  const hash = crypto.randomUUID().replace(/-/g, "").slice(0, 8);                          // Generate short unique hex snippet
  const lastDot = relKey.lastIndexOf(".");                                                 // Locate file extension dot
  if (lastDot === -1) return `${relKey}_${hash}`;                                          // No extension case
  return `${relKey.slice(0, lastDot)}_${hash}${relKey.slice(lastDot)}`;                    // Insert hash before extension
}

// Writes an uploaded binary file to local storage and returns its persistent key and public URL
export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream",
): Promise<{ key: string; url: string }> {
  await ensureUploadsDir();                                                                // Guarantee directory is ready
  const key = appendHashSuffix(normalizeKey(relKey));                                      // Compute sanitized unique key
  const filePath = path.join(UPLOADS_DIR, key);                                            // Absolute filesystem path
  
  await fs.writeFile(filePath, data);                                                      // Write binary buffer to disk

  return { key, url: `/uploads/${key}` };                                                  // Return storage key and accessible URL
}

// Looks up public URL representation for an existing storage key
export async function storageGet(relKey: string): Promise<{ key: string; url: string }> {
  const key = normalizeKey(relKey);                                                        // Clean key
  return { key, url: `/uploads/${key}` };                                                  // Static serve URL
}

// Generates an access URL for retrieving an uploaded asset
export async function storageGetSignedUrl(relKey: string): Promise<string> {
  const key = normalizeKey(relKey);                                                        // Clean key
  return `/uploads/${key}`;                                                                // Accessible path
}
