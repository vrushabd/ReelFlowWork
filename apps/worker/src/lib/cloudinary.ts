import { v2 as cloudinary, UploadApiOptions, UploadApiResponse } from 'cloudinary';

export type CloudinaryConfig = {
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

type CloudinaryUploadResponseLike = Partial<UploadApiResponse> & {
  secure_url?: string;
  public_id?: string;
  resource_type?: string;
  format?: string;
  bytes?: number;
  width?: number;
  height?: number;
  duration?: number;
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
    cloudName: (overrides.cloudName || fromUrl?.cloudName || process.env.CLOUDINARY_CLOUD_NAME || '').trim(),
    apiKey: (overrides.apiKey || fromUrl?.apiKey || process.env.CLOUDINARY_API_KEY || '').trim(),
    apiSecret: (overrides.apiSecret || fromUrl?.apiSecret || process.env.CLOUDINARY_API_SECRET || '').trim(),
  };

  // Safe diagnostics without exposing secrets
  console.log(`[Cloudinary Config Check]`);
  console.log(`  CLOUDINARY_CLOUD_NAME: ${config.cloudName ? 'configured' : 'missing'}`);
  console.log(`  CLOUDINARY_API_KEY:    ${config.apiKey ? 'configured' : 'missing'}`);
  console.log(`  CLOUDINARY_API_SECRET: ${config.apiSecret ? 'configured' : 'missing'}`);

  if (!config.cloudName || !config.apiKey || !config.apiSecret) {
    throw new Error(
      'Cloudinary is not fully configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.'
    );
  }

  return config;
}

/**
 * Uploads a video file to Cloudinary using the official Cloudinary Node.js SDK.
 * Uses signed server-side upload with resource_type: 'video'.
 * Generates public_id once and uses consistent folder: 'reelflow/reels'.
 */
export async function uploadVideoToCloudinary(
  filePath: string,
  reelId: string,
  overrides: Partial<CloudinaryConfig> = {}
): Promise<CloudinaryUploadResult> {
  const config = getCloudinaryConfig(overrides);

  cloudinary.config({
    cloud_name: config.cloudName,
    api_key: config.apiKey,
    api_secret: config.apiSecret,
    secure: true,
  });

  const folder = 'reelflow/reels';
  const publicId = `reel_${reelId}`;
  const canonicalPublicId = `${folder}/${publicId}`;
  const uploadOptions: UploadApiOptions = {
    resource_type: 'video',
    public_id: canonicalPublicId,
    overwrite: true,
    use_filename: false,
    unique_filename: false,
  };

  console.log(`[Cloudinary] Starting signed video upload...`);
  console.log(`  cloud_name:    ${config.cloudName}`);
  console.log(`  folder:        ${folder}`);
  console.log(`  public_id:     ${publicId}`);
  console.log(`  resource_type: ${uploadOptions.resource_type}`);
  console.log(`  overwrite:     ${String(uploadOptions.overwrite)}`);

  try {
    const stats = await import('node:fs/promises').then((fs) => fs.stat(filePath));
    const shouldUseLargeUpload = stats.size > 100 * 1024 * 1024;

    const rawResult = shouldUseLargeUpload
      ? await cloudinary.uploader.upload_large(filePath, uploadOptions)
      : await cloudinary.uploader.upload(filePath, uploadOptions);

    const result = rawResult as CloudinaryUploadResponseLike;

    if (!result.secure_url || !result.public_id) {
      throw new Error('Cloudinary upload did not return the expected upload response.');
    }

    if (!result.secure_url.startsWith('https://')) {
      throw new Error('Cloudinary upload did not return a valid HTTPS URL.');
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
  } catch (error: any) {
    console.error('[Cloudinary Error] Upload failed with safe metadata:', {
      cloudName: config.cloudName,
      folder,
      publicId,
      resourceType: uploadOptions.resource_type,
      overwrite: uploadOptions.overwrite,
      message: error?.message || String(error),
    });
    throw new Error(`Cloudinary upload failed: ${error.message || error}`);
  }
}
