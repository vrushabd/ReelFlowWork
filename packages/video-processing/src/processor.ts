import ffmpeg from 'fluent-ffmpeg';
import { getVideoMetadata } from './metadata';

export interface ProcessVideoOptions {
  inputPath: string;
  outputPath: string;
  threads?: number;
  aspectMode?: 'preserve' | 'crop_to_9_16' | 'letterbox_to_9_16';
}

/**
 * Preserves source quality whenever possible, especially original music audio.
 * Transcodes only when Instagram-compatible codecs/container are not present or
 * an explicit aspect-ratio mode requires filtering.
 */
export async function processVideo({
  inputPath,
  outputPath,
  threads = 2,
  aspectMode = (process.env.VIDEO_ASPECT_MODE as ProcessVideoOptions['aspectMode']) || 'preserve',
}: ProcessVideoOptions): Promise<string> {
  const metadata = await getVideoMetadata(inputPath);
  const sourceIsMp4 = metadata.format?.split(',').includes('mp4') || inputPath.toLowerCase().endsWith('.mp4');
  const videoCompatible = metadata.codec === 'h264' && (!metadata.pixelFormat || metadata.pixelFormat === 'yuv420p');
  const audioCompatible = !metadata.hasAudio || metadata.audioCodec === 'aac';
  const shouldFilterAspect = aspectMode !== 'preserve';
  const canRemux = sourceIsMp4 && videoCompatible && audioCompatible && !shouldFilterAspect;
  
  return new Promise((resolve, reject) => {
    const outputOptions = [
      '-map 0:v:0',
      '-map 0:a:0?',
      '-movflags +faststart',
      `-threads ${threads}`,
    ];

    if (canRemux) {
      outputOptions.push('-c:v copy', '-c:a copy');
    } else {
      outputOptions.push(
        videoCompatible && !shouldFilterAspect ? '-c:v copy' : '-c:v libx264',
        videoCompatible && !shouldFilterAspect ? '' : '-preset medium',
        videoCompatible && !shouldFilterAspect ? '' : '-crf 18',
        videoCompatible && !shouldFilterAspect ? '' : '-pix_fmt yuv420p',
        audioCompatible ? '-c:a copy' : '-c:a aac',
        audioCompatible ? '' : '-b:a 192k'
      );
    }

    if (aspectMode === 'letterbox_to_9_16') {
      outputOptions.push('-vf scale=1080:1920:force_original_aspect_ratio=decrease:force_divisible_by=2,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:black');
    } else if (aspectMode === 'crop_to_9_16') {
      outputOptions.push('-vf scale=1080:1920:force_original_aspect_ratio=increase:force_divisible_by=2,crop=1080:1920');
    }

    const command = ffmpeg(inputPath)
      .outputOptions(outputOptions.filter(Boolean))
      .toFormat('mp4');

    command
      .on('start', (cmd) => console.log(`Started FFmpeg: ${cmd}`))
      .on('end', () => resolve(outputPath))
      .on('error', (err) => reject(new Error(`Video processing failed: ${err.message}`)))
      .save(outputPath);
  });
}
