export interface VideoMetadata {
  title?: string;
  description?: string;
  thumbnailUrl?: string;
  downloadUrl: string;
}

export interface DownloaderProvider {
  /**
   * Fetches metadata for a given reel URL, including the direct MP4 download link.
   * Throws an error if the URL is invalid or the video is unavailable.
   */
  getVideoMetadata(url: string): Promise<VideoMetadata>;
  
  /**
   * Downloads the video to a specific file path.
   * Returns the final path where the video was saved.
   */
  downloadVideo(downloadUrl: string, outputPath: string): Promise<string>;
}
