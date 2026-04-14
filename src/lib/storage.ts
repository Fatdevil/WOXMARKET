import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const BUCKET_NAME = process.env.R2_BUCKET_NAME || 'voxmarket-storage';
const PUBLIC_BASE_URL = process.env.R2_PUBLIC_BASE_URL;

// We initialize the client conditionally to avoid crashing dev environments that lack credentials initially.
let s3Client: S3Client | null = null;

if (R2_ACCOUNT_ID && R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY) {
  s3Client = new S3Client({
    region: 'auto',
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: R2_ACCESS_KEY_ID,
      secretAccessKey: R2_SECRET_ACCESS_KEY,
    },
  });
}

/**
 * Uploads a raw buffer to Cloudflare R2.
 */
export async function uploadBuffer(buffer: Buffer, key: string, contentType: string): Promise<string> {
  if (!s3Client) {
    console.warn(`[Storage] R2 not configured. Mocking upload for key: ${key}`);
    return key;
  }

  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: buffer,
    ContentType: contentType,
  });

  await s3Client.send(command);
  return key;
}

/**
 * Retrieves the public URL for a given object key.
 * Only use this for generated and preview audio.
 */
export function getPublicUrl(key: string): string {
  if (!PUBLIC_BASE_URL) {
    console.warn('[Storage] R2_PUBLIC_BASE_URL is missing. Returning local mock path.');
    // Fallback for dev MVP mapping
    return `/uploads/${key.split('/').pop()}`;
  }
  
  // Ensure strict trailing slash handling
  const baseUrl = PUBLIC_BASE_URL.endsWith('/') ? PUBLIC_BASE_URL.slice(0, -1) : PUBLIC_BASE_URL;
  return `${baseUrl}/${key}`;
}

/**
 * Generates a time-limited Signed URL.
 * Strongly recommended for 'training' audio to keep it private.
 */
export async function generateSignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
  if (!s3Client) {
    console.warn('[Storage] R2 not configured. Returning mock signed URL.');
    return `/uploads/locked/${key.split('/').pop()}?mock=true`;
  }

  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  return getSignedUrl(s3Client, command, { expiresIn });
}
