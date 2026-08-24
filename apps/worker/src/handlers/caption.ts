import { Job } from 'bullmq';
import { CaptionJobData, publishQueue } from '@reelflow/queue';
import { prisma } from '@reelflow/database';
import { getAiProvider } from '@reelflow/ai';

export async function handleCaption(job: Job<CaptionJobData>) {
  const { reelId } = job.data;
  
  console.log(`[Caption] Generating caption for Reel: ${reelId}`);

  await prisma.reel.update({
    where: { id: reelId },
    data: { status: 'CAPTION_GENERATING' },
  });

  try {
    const reel = await prisma.reel.findUnique({ where: { id: reelId } });
    if (!reel) throw new Error('Reel not found in database');

    const aiKeySetting = await prisma.setting.findUnique({ where: { key: 'AI_API_KEY' } });
    const ai = getAiProvider(aiKeySetting?.value);
    const context = reel.title || 'Instagram video';
    
    // Generate AI Caption
    const generated = await ai.generateCaption(context);

    // Save to DB
    const caption = await prisma.caption.create({
      data: {
        text: generated.caption,
        hashtags: generated.hashtags,
        shortTitle: generated.shortTitle,
        aiProvider: process.env.AI_PROVIDER || 'gemini',
      }
    });

    // Link caption to reel
    const updatedReel = await prisma.reel.update({
      where: { id: reelId },
      data: {
        captionId: caption.id,
        status: reel.postingMode === 'IMMEDIATELY' ? 'UPLOADING' : (reel.postingMode === 'SCHEDULED' ? 'SCHEDULED' : 'READY'),
      }
    });

    console.log(`[Caption] Successfully generated caption for Reel: ${reelId}`);

    // If posting mode is IMMEDIATELY, push to publish queue
    if (updatedReel.postingMode === 'IMMEDIATELY') {
      await publishQueue.add('publish', {
        reelId,
        publishJobId: 'immediate_' + Date.now(),
        attemptCount: 0,
      });
    }

  } catch (error: any) {
    console.error(`[Caption] Failed for Reel: ${reelId}`, error);

    // Graceful fallback: use a default caption so the reel still moves to READY
    // instead of failing completely. User can edit caption manually.
    console.log(`[Caption] Using fallback caption for Reel: ${reelId}`);
    try {
      const reel = await prisma.reel.findUnique({ where: { id: reelId } });
      const caption = await prisma.caption.create({
        data: {
          text: reel?.title || 'Some moments just stay with you.',
          hashtags: '#musicreels #naturelovers #cinematic',
          shortTitle: reel?.title || 'Instagram Reel',
          aiProvider: 'fallback',
        }
      });
      const updatedReel = await prisma.reel.update({
        where: { id: reelId },
        data: {
          captionId: caption.id,
          status: reel?.postingMode === 'IMMEDIATELY' ? 'UPLOADING' : (reel?.postingMode === 'SCHEDULED' ? 'SCHEDULED' : 'READY'),
        }
      });
      if (updatedReel.postingMode === 'IMMEDIATELY') {
        await publishQueue.add('publish', { reelId, publishJobId: 'immediate_' + Date.now(), attemptCount: 0 });
      }
      console.log(`[Caption] Fallback caption applied — Reel ${reelId} is now READY`);
    } catch (fallbackErr: any) {
      await prisma.reel.update({
        where: { id: reelId },
        data: { status: 'FAILED', errorMessage: `Caption generation failed: ${error.message}` },
      });
      throw error;
    }
  }
}
