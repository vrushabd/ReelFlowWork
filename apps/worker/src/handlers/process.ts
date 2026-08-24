import { Job } from 'bullmq';
import { ProcessJobData, captionQueue } from '@reelflow/queue';
import { prisma } from '@reelflow/database';
import { processVideo, generateThumbnail, getVideoMetadata } from '@reelflow/video-processing';
import * as path from 'path';

const STORAGE_PATH = path.resolve(process.env.LOCAL_STORAGE_PATH || './storage');

export async function handleProcess(job: Job<ProcessJobData>) {
  const { reelId, videoId, filePath } = job.data;
  
  console.log(`[Process] Starting video processing for Reel: ${reelId}`);

  await prisma.reel.update({
    where: { id: reelId },
    data: { status: 'PROCESSING' },
  });

  try {
    // 1. Inspect source file first
    const sourceMetadata = await getVideoMetadata(filePath);
    console.log(`[Process] Source: ${sourceMetadata.width}x${sourceMetadata.height} ${sourceMetadata.fps}fps ${sourceMetadata.codec} ${sourceMetadata.hasAudio ? `🎵 ${sourceMetadata.audioCodec}` : '(no audio)'}`);

    // Update DB with source quality (may differ from download metadata if already set)
    await prisma.video.update({
      where: { id: videoId },
      data: {
        sourceWidth: sourceMetadata.width || undefined,
        sourceHeight: sourceMetadata.height || undefined,
        sourceCodec: sourceMetadata.codec || undefined,
        sourceFps: sourceMetadata.fps || undefined,
        sourceHasAudio: sourceMetadata.hasAudio,
        sourceAudioCodec: sourceMetadata.audioCodec || undefined,
        // Also store audio metadata from source
        audioCodec: sourceMetadata.audioCodec || undefined,
        audioBitrate: sourceMetadata.audioBitrate || undefined,
        audioSampleRate: sourceMetadata.audioSampleRate || undefined,
        audioChannels: sourceMetadata.audioChannels || undefined,
      }
    });

    const processedFilePath = path.join(STORAGE_PATH, `${reelId}_processed.mp4`);
    const thumbnailFilename = `${reelId}_thumb.jpg`;

    // 2. Process Video (FFmpeg) — preserves audio via -map 0:a:0? and smart remux
    await processVideo({
      inputPath: filePath,
      outputPath: processedFilePath,
      threads: parseInt(process.env.FFMPEG_THREADS || '2', 10),
      aspectMode: (process.env.VIDEO_ASPECT_MODE as any) || 'preserve',
    });

    // 3. Verify output quality
    const outputMetadata = await getVideoMetadata(processedFilePath);
    console.log(`[Process] Output: ${outputMetadata.width}x${outputMetadata.height} ${outputMetadata.fps}fps ${outputMetadata.codec} ${outputMetadata.hasAudio ? `🎵 ${outputMetadata.audioCodec}` : '❌ NO AUDIO'}`);

    // Audio integrity check — if source had audio but output doesn't, abort
    if (sourceMetadata.hasAudio && !outputMetadata.hasAudio) {
      throw new Error(`AUDIO LOST during processing! Source had ${sourceMetadata.audioCodec} audio but output has none. Publishing aborted to prevent silent video.`);
    }

    // Warn if resolution dropped
    if (sourceMetadata.width && outputMetadata.width && outputMetadata.width < sourceMetadata.width) {
      console.warn(`[Process] ⚠ Resolution decreased: ${sourceMetadata.width}x${sourceMetadata.height} → ${outputMetadata.width}x${outputMetadata.height}`);
    }

    // 4. Generate Thumbnail
    await generateThumbnail(processedFilePath, STORAGE_PATH, thumbnailFilename);

    // 5. Update Database with processed quality
    await prisma.video.update({
      where: { id: videoId },
      data: {
        filePath: processedFilePath,
        width: outputMetadata.width,
        height: outputMetadata.height,
        duration: outputMetadata.duration,
        fps: outputMetadata.fps,
        codec: outputMetadata.codec,
        thumbnailPath: path.join(STORAGE_PATH, thumbnailFilename),
        // Update audio metadata with processed output values
        audioCodec: outputMetadata.audioCodec || undefined,
        audioBitrate: outputMetadata.audioBitrate || undefined,
        audioSampleRate: outputMetadata.audioSampleRate || undefined,
        audioChannels: outputMetadata.audioChannels || undefined,
      }
    });

    await prisma.reel.update({
      where: { id: reelId },
      data: { status: 'PROCESSED' },
    });

    // 6. Push to caption queue
    await captionQueue.add('caption', {
      reelId,
      videoId,
      attemptCount: 0,
    });

    console.log(`[Process] ✅ Successfully processed Reel: ${reelId}`);
  } catch (error: any) {
    console.error(`[Process] Failed for Reel: ${reelId}`, error);
    await prisma.reel.update({
      where: { id: reelId },
      data: {
        status: 'FAILED',
        errorMessage: `Processing failed: ${error.message}`,
      }
    });
    throw error;
  }
}
