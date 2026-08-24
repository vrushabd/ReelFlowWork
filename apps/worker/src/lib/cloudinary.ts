import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';

type CloudinaryConfig = {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
};

export type CloudinaryUploadResult = {
  secure_url: string;
  public_id: string;
  resource_type: string;
  format: string;
  bytes: number;
  width?: number;
  height?: number;
  duration?: number;
};

type CloudinaryApiResponse = CloudinaryUploadResult & {
  error?: { message?: string };
};

function parseCloudinaryUrl(value: string): CloudinaryConfig | null {
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== 'cloudinary:') return null;
    return {
      cloudName: parsed.hostname,
      apiKey: decodeURIComponent(parsed.username),
      apiSecret: decodeURIComponent(parsed.password),
    };
  } catch {
    return null;
  }
}

function getCloudinaryConfig(overrides: Partial<CloudinaryConfig> = {}): CloudinaryConfig {
  const fromUrl = process.env.CLOUDINARY_URL ? parseCloudinaryUrl(process.env.CLOUDINARY_URL) : null;
  const config = {
    cloudName: overrides.cloudName || fromUrl?.cloudName || process.env.CLOUDINARY_CLOUD_NAME || '',
    apiKey: overrides.apiKey || fromUrl?.apiKey || process.env.CLOUDINARY_API_KEY || '',
    apiSecret: overrides.apiSecret || fromUrl?.apiSecret || process.env.CLOUDINARY_API_SECRET || '',
  };

  if (!config.cloudName || !config.apiKey || !config.apiSecret) {
    throw new Error('Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.');
  }

  return config;
}

function signUpload(params: Record<string, string>, apiSecret: string): string {
  const payload = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join('&');

  return crypto.createHash('sha1').update(payload + apiSecret).digest('hex');
}

/**
 * Upload a video to Cloudinary and return full metadata including public_id,
 * dimensions, duration, format, and bytes. This metadata is stored in the DB
 * for the Quality Dashboard and audio preflight checks.
 *
 * We do NOT apply transformations (q_auto:low etc.) — the file is uploaded
 * as-is and served at its original quality via HTTPS secure URL.
 */
export async function uploadVideoToCloudinary(
  filePath: string,
  reelId: string,
  overrides: Partial<CloudinaryConfig> = {}
): Promise<CloudinaryUploadResult> {
  const config = getCloudinaryConfig(overrides);
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const folder = 'reelflow/reels';
  const publicId = `${reelId}_${path.basename(filePath, path.extname(filePath))}`;
  const signedParams = {
    folder,
    overwrite: 'true',
    public_id: publicId,
    resource_type: 'video',
    timestamp,
  };
  const signature = signUpload(signedParams, config.apiSecret);
  const file = await fs.readFile(filePath);

  const form = new FormData();
  form.set('file', new Blob([new Uint8Array(file)], { type: 'video/mp4' }), path.basename(filePath));
  form.set('api_key', config.apiKey);
  form.set('folder', folder);
  form.set('overwrite', 'true');
  form.set('public_id', publicId);
  form.set('resource_type', 'video');
  form.set('timestamp', timestamp);
  form.set('signature', signature);

  const response = await fetch(`https://api.cloudinary.com/v1_1/${config.cloudName}/video/upload`, {
    method: 'POST',
    body: form,
  });
  const result = await response.json() as CloudinaryApiResponse;

  if (!response.ok || !result.secure_url) {
    throw new Error(`Cloudinary upload failed: ${result.error?.message || response.statusText}`);
  }

  if (!result.secure_url.startsWith('https://')) {
    throw new Error('Cloudinary upload did not return a secure HTTPS URL.');
  }

  return {
    secure_url: result.secure_url,
    public_id: result.public_id,
    resource_type: result.resource_type || 'video',
    format: result.format || 'mp4',
    bytes: result.bytes || 0,
    width: result.width,
    height: result.height,
    duration: result.duration,
  };
}
