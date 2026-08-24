import { Job } from 'bullmq';
import { DownloadJobData, processQueue } from '@reelflow/queue';
import { prisma } from '@reelflow/database';
import * as path from 'path';
import * as fs from 'fs';
import * as https from 'https';
import * as http from 'http';
import { calculateFileHash } from '@reelflow/shared';

const STORAGE_PATH = path.resolve(process.env.LOCAL_STORAGE_PATH || './storage');
const DOWNLOADER_API_URL = process.env.DOWNLOADER_API_URL || 'http://downloader:8080';

/**
 * Stream a URL to a file path. Used to download the muxed video from
 * the downloader service's /download endpoint.
 */
function streamToFile(url: string, outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const proto = url.startsWith('https') ? https : http;
    const file = fs.createWriteStream(outputPath);
    proto.get(url, (response) => {
      if (response.statusCode !== 200) {
        file.close();
        reject(new Error(`Downloader service returned HTTP ${response.statusCode}`));
        return;
      }
      response.pipe(file);
      file.on('finish', () => { file.close(); resolve(); });
      file.on('error', (err) => { file.close(); reject(err); });
    }).on('error', reject);
  });
}

export async function handleDownload(job: Job<DownloadJobData>) {
  const { reelId, url } = job.data;
  
  console.log(`[Download] Starting best-quality download for Reel: ${reelId}`);

  await prisma.reel.update({
    where: { id: reelId },
    data: { status: 'DOWNLOADING' },
  });

  try {
    // Ensure storage directory exists
    if (!fs.existsSync(STORAGE_PATH)) {
      fs.mkdirSync(STORAGE_PATH, { recursive: true });
    }

    // 1. Fetch metadata (for title, source quality info)
    console.log(`[Download] Fetching metadata for: ${url}`);
    const metaResponse = await fetch(`${DOWNLOADER_API_URL}/?url=${encodeURIComponent(url)}`);
    if (!metaResponse.ok) {
      throw new Error(`Downloader metadata API returned ${metaResponse.status}`);
    }
    const metadata = await metaResponse.json() as {
      title?: string;
      description?: string;
      download_link?: string;
      width?: number;
      height?: number;
      fps?: number;
      vcodec?: string;
      acodec?: string;
      needs_mux?: boolean;
    };

    if (!metadata.download_link) {
      throw new Error('Downloader API returned no download link.');
    }

    const tempFilePath = path.join(STORAGE_PATH, `${reelId}_raw.mp4`);

    // 2. Download best-quality muxed file via /download endpoint
    // The downloader service runs yt-dlp internally and returns a single
    // high-quality MP4 (with muxed audio if separate streams were available)
    console.log(`[Download] Downloading best-quality file (source: ${metadata.width || '?'}x${metadata.height || '?'} ${metadata.vcodec || '?'})`);
    await streamToFile(
      `${DOWNLOADER_API_URL}/download?url=${encodeURIComponent(url)}`,
      tempFilePath
    );

    console.log(`[Download] File saved to disk: ${tempFilePath}`);

    // 3. Hash calculation for duplicate detection
    const sha256 = await calculateFileHash(tempFilePath);
    
    const existingVideo = await prisma.video.findUnique({ where: { sha256 } });

    if (existingVideo) {
      console.log(`[Download] Duplicate video detected (Hash: ${sha256}) for Reel: ${reelId}`);
      if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
      
      await prisma.reel.update({
        where: { id: reelId },
        data: {
          status: 'SKIPPED_DUPLICATE',
          skipReason: 'Exact video file already processed previously.',
        }
      });
      return;
    }

    // 4. Create Video record with source quality metadata
    const stat = fs.statSync(tempFilePath);
    const video = await prisma.video.create({
      data: {
        filePath: tempFilePath,
        storagePath: tempFilePath,
        sha256,
        size: stat.size,
        // Store source quality for Quality Dashboard comparison
        sourceWidth: metadata.width || null,
        sourceHeight: metadata.height || null,
        sourceCodec: metadata.vcodec || null,
        sourceFps: metadata.fps || null,
        sourceHasAudio: metadata.acodec ? metadata.acodec !== 'none' : true,
        sourceAudioCodec: (metadata.acodec && metadata.acodec !== 'none') ? metadata.acodec : null,
        reel: { connect: { id: reelId } }
      }
    });

    // 5. Update Reel with metadata
    await prisma.reel.update({
      where: { id: reelId },
      data: {
        status: 'DOWNLOADED',
        title: metadata.title || metadata.description || 'Instagram Reel',
      }
    });

    // 6. Push to process queue
    await processQueue.add('process', {
      reelId,
      videoId: video.id,
      filePath: tempFilePath,
      attemptCount: 0,
    });

    console.log(`[Download] Successfully downloaded Reel: ${reelId} (${metadata.width}x${metadata.height})`);
  } catch (error: any) {
    console.error(`[Download] Failed for Reel: ${reelId}`, error);
    await prisma.reel.update({
      where: { id: reelId },
      data: {
        status: 'FAILED',
        errorMessage: `Download failed: ${error.message}`,
      }
    });
    throw error;
  }
}
