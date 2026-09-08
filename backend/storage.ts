import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

const UPLOADS_DIR = path.resolve(process.cwd(), 'uploads');

async function ensureUploadsDir() {
  try {
    await fs.mkdir(UPLOADS_DIR, { recursive: true });
  } catch (error) {
    console.error('Failed to create uploads directory:', error);
  }
}

function normalizeKey(relKey: string): string {
  return relKey.replace(/^\/+/, "").replace(/\//g, "-");
}

function appendHashSuffix(relKey: string): string {
  const hash = crypto.randomUUID().replace(/-/g, "").slice(0, 8);
  const lastDot = relKey.lastIndexOf(".");
  if (lastDot === -1) return `${relKey}_${hash}`;
  return `${relKey.slice(0, lastDot)}_${hash}${relKey.slice(lastDot)}`;
}

export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream",
): Promise<{ key: string; url: string }> {
  await ensureUploadsDir();
  const key = appendHashSuffix(normalizeKey(relKey));
  const filePath = path.join(UPLOADS_DIR, key);
  
  await fs.writeFile(filePath, data);

  return { key, url: `/uploads/${key}` };
}

export async function storageGet(relKey: string): Promise<{ key: string; url: string }> {
  const key = normalizeKey(relKey);
  return { key, url: `/uploads/${key}` };
}

export async function storageGetSignedUrl(relKey: string): Promise<string> {
  const key = normalizeKey(relKey);
  return `/uploads/${key}`;
}
