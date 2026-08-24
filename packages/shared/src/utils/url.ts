import * as crypto from 'crypto';

/**
 * Normalizes an Instagram Reel URL to a standard format for deduplication.
 * Removes query parameters and trailing slashes.
 */
export function normalizeReelUrl(url: string): string {
  try {
    const parsed = new URL(url);
    if (!parsed.hostname.includes('instagram.com')) {
      throw new Error('Not an Instagram URL');
    }

    // Keep only the path, e.g., /reel/ABC1234/
    let path = parsed.pathname;
    
    // Remove trailing slash
    if (path.endsWith('/')) {
      path = path.slice(0, -1);
    }

    return `https://www.instagram.com${path}`;
  } catch (error) {
    throw new Error(`Invalid URL: ${url}`);
  }
}

/**
 * Generates a SHA-256 hash of the normalized URL for easy database indexing.
 */
export function hashUrl(normalizedUrl: string): string {
  return crypto.createHash('sha256').update(normalizedUrl).digest('hex');
}
