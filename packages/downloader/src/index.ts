import { HttpDownloaderProvider } from './http-provider';
import { DownloaderProvider } from './provider';

export * from './provider';
export * from './http-provider';

/**
 * Factory function to get the configured downloader provider.
 */
export function getDownloader(): DownloaderProvider {
  const apiUrl = process.env.DOWNLOADER_API_URL || '';
  const apiKey = process.env.DOWNLOADER_API_KEY;

  if (!apiUrl) {
    console.warn('⚠️ DOWNLOADER_API_URL is not set. Downloader will throw errors when used.');
  }

  return new HttpDownloaderProvider(apiUrl, apiKey);
}
