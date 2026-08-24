export interface GeneratedCaption {
  caption: string;
  hashtags: string;
  shortTitle: string;
  category?: string;
  tone?: string;
  hookType?: string;
}

export interface CaptionProvider {
  /**
   * Generates a caption, hashtags, and a short title for a video.
   * Takes the video description/title from the downloader metadata as context.
   */
  generateCaption(context: string): Promise<GeneratedCaption>;
}
