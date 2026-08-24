import axios from 'axios';
import * as fs from 'fs';
import { pipeline } from 'stream/promises';
import { DownloaderProvider, VideoMetadata } from './provider';

export class HttpDownloaderProvider implements DownloaderProvider {
  private apiUrl: string;
  private apiKey?: string;

  constructor(apiUrl: string, apiKey?: string) {
    this.apiUrl = apiUrl;
    this.apiKey = apiKey;
  }

  async getVideoMetadata(url: string): Promise<VideoMetadata> {
    if (!this.apiUrl) {
      throw new Error('DOWNLOADER_API_URL is not configured.');
    }

    try {
      const response = await axios.get(this.apiUrl, {
        params: { url },
        headers: this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : undefined,
      });

      const data = response.data;
      if (!data || !data.download_link) {
        throw new Error('Downloader API returned invalid response format.');
      }

      return {
        title: data.title,
        description: data.description,
        thumbnailUrl: data.thumbnail,
        downloadUrl: data.download_link,
      };
    } catch (error: any) {
      throw new Error(`Failed to fetch video metadata: ${error.message}`);
    }
  }

  async downloadVideo(downloadUrl: string, outputPath: string): Promise<string> {
    try {
      const response = await axios.get(downloadUrl, { responseType: 'stream' });
      await pipeline(response.data, fs.createWriteStream(outputPath));
      return outputPath;
    } catch (error: any) {
      throw new Error(`Failed to download video file: ${error.message}`);
    }
  }
}
