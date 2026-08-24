import ffmpeg from 'fluent-ffmpeg';
import * as path from 'path';

export function generateThumbnail(videoPath: string, outputDir: string, filename: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const outputPath = path.join(outputDir, filename);

    ffmpeg(videoPath)
      .on('end', () => resolve(outputPath))
      .on('error', (err) => reject(new Error(`Thumbnail generation failed: ${err.message}`)))
      .screenshots({
        timestamps: ['1'], // Grab frame at 1 second
        filename,
        folder: outputDir,
        size: '1080x1920', // Ensure standard 9:16 vertical ratio for thumbnail
      });
  });
}
