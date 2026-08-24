import { Job } from 'bullmq';
import { CleanupJobData } from '@reelflow/queue';
import { prisma } from '@reelflow/database';
import * as fs from 'fs';
import * as path from 'path';

export async function handleCleanup(job: Job<CleanupJobData>) {
  const { reelId, videoId } = job.data;
  
  console.log(`[Cleanup] Cleaning up temporary files for Reel: ${reelId}`);

  try {
    if (videoId) {
      const video = await prisma.video.findUnique({ where: { id: videoId } });
      if (video && video.filePath) {
        if (fs.existsSync(video.filePath)) {
          fs.unlinkSync(video.filePath);
          console.log(`[Cleanup] Deleted processed video file: ${video.filePath}`);
        }
      }
    }
    
    // Check for raw files that might have been left over
    const STORAGE_PATH = path.resolve(process.env.LOCAL_STORAGE_PATH || './storage');
    const rawPath = path.join(STORAGE_PATH, `${reelId}_raw.mp4`);
    if (fs.existsSync(rawPath)) {
      fs.unlinkSync(rawPath);
      console.log(`[Cleanup] Deleted raw video file: ${rawPath}`);
    }

  } catch (error: any) {
    console.error(`[Cleanup] Failed for Reel: ${reelId}`, error);
    // Cleanup failures shouldn't fail the reel itself if it's already published
  }
}
