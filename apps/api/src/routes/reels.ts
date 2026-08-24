import { Router } from 'express';
import { prisma } from '@reelflow/database';
import { downloadQueue, publishQueue } from '@reelflow/queue';
import crypto from 'crypto';

const router = Router();
const POSTING_MODES = ['IMMEDIATELY', 'SCHEDULED', 'MANUAL'] as const;
type PostingMode = typeof POSTING_MODES[number];
const ACTIVE_STATUSES = new Set([
  'PENDING',
  'DOWNLOADING',
  'DOWNLOADED',
  'PROCESSING',
  'PROCESSED',
  'CAPTION_GENERATING',
  'UPLOADING',
]);

// Helper: safely serialize objects that may contain BigInt values
function safeJson(data: any) {
  return JSON.parse(JSON.stringify(data, (_key, value) =>
    typeof value === 'bigint' ? value.toString() : value
  ));
}

router.get('/', async (req, res) => {
  try {
    const { status } = req.query;
    
    let whereClause = {};
    if (status && typeof status === 'string') {
      const statuses = status.split(',');
      whereClause = { status: { in: statuses } };
    }

    const reels = await prisma.reel.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: { video: true, caption: true, post: true }
    });

    res.json({ reels: safeJson(reels) });
  } catch (error) {
    console.error('Error fetching reels:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { urls, postingMode } = req.body;

    if (!urls || !Array.isArray(urls)) {
      return res.status(400).json({ error: 'Invalid urls array' });
    }

    const normalizedPostingMode: PostingMode = typeof postingMode === 'string' && POSTING_MODES.includes(postingMode as PostingMode)
      ? postingMode as PostingMode
      : 'IMMEDIATELY';

    const addedReels = [];
    const requeuedReels = [];
    const publishQueuedReels = [];
    const skippedReels = [];

    for (const url of urls) {
      // Basic normalization to singular /reel/ if they pasted /reels/
      const normalizedUrl = url.split('?')[0].replace('/reels/', '/reel/');
      const urlHash = crypto.createHash('sha256').update(normalizedUrl).digest('hex');

      // Check if exists
      const existing = await prisma.reel.findUnique({
        where: { urlHash },
        include: { video: true, caption: true },
      });

      if (existing) {
        if (ACTIVE_STATUSES.has(existing.status)) {
          skippedReels.push({ id: existing.id, sourceUrl: existing.sourceUrl, reason: `Already ${existing.status}` });
          continue;
        }

        const updatedExisting = await prisma.reel.update({
          where: { id: existing.id },
          data: {
            postingMode: normalizedPostingMode,
            errorMessage: null,
            skipReason: null,
            attempts: 0,
          },
          include: { video: true, caption: true },
        });

        if (normalizedPostingMode === 'IMMEDIATELY' && updatedExisting.video && updatedExisting.caption) {
          await prisma.reel.update({
            where: { id: updatedExisting.id },
            data: { status: 'UPLOADING' },
          });
          await publishQueue.add('publish', {
            reelId: updatedExisting.id,
            publishJobId: 'immediate_' + Date.now(),
            attemptCount: 0,
          });
          publishQueuedReels.push(updatedExisting);
          continue;
        }

        await prisma.reel.update({
          where: { id: existing.id },
          data: { status: 'PENDING' },
        });
        await downloadQueue.add('download', {
          reelId: existing.id,
          url: existing.normalizedUrl,
          attemptCount: 0
        });
        requeuedReels.push(updatedExisting);
        continue;
      }

      // Create record
      const reel = await prisma.reel.create({
        data: {
          sourceUrl: url,
          normalizedUrl,
          urlHash,
          status: 'PENDING',
          postingMode: normalizedPostingMode,
        }
      });

      // Push to queue
      await downloadQueue.add('download', {
        reelId: reel.id,
        url: normalizedUrl,
        attemptCount: 0
      });

      addedReels.push(reel);
    }

    res.json({
      success: true,
      count: addedReels.length + requeuedReels.length + publishQueuedReels.length,
      addedCount: addedReels.length,
      requeuedCount: requeuedReels.length,
      publishQueuedCount: publishQueuedReels.length,
      skippedCount: skippedReels.length,
      reels: safeJson([...addedReels, ...requeuedReels, ...publishQueuedReels]),
      skipped: safeJson(skippedReels),
    });
  } catch (error: any) {
    console.error('Error adding reels:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.post('/:id/retry', async (req, res) => {
  try {
    const { id } = req.params;
    const reel = await prisma.reel.findUnique({ where: { id }, include: { video: true, caption: true } });
    if (!reel) return res.status(404).json({ error: 'Reel not found' });

    if (reel.video && reel.caption && reel.postingMode === 'IMMEDIATELY') {
      await prisma.reel.update({
        where: { id },
        data: { status: 'UPLOADING', errorMessage: null, attempts: 0 }
      });

      await publishQueue.add('publish', {
        reelId: reel.id,
        publishJobId: 'retry_' + Date.now(),
        attemptCount: 0
      });

      return res.json({ success: true, message: 'Reel queued for publishing' });
    }

    await prisma.reel.update({
      where: { id },
      data: { status: 'PENDING', errorMessage: null, attempts: 0 }
    });

    await downloadQueue.add('download', {
      reelId: reel.id,
      url: reel.normalizedUrl,
      attemptCount: 0
    });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.post('/:id/publish', async (req, res) => {
  try {
    const { id } = req.params;
    const reel = await prisma.reel.findUnique({ where: { id } });
    if (!reel) return res.status(404).json({ error: 'Reel not found' });
    if (reel.status !== 'READY') {
      return res.status(400).json({ error: `Reel is not READY (current status: ${reel.status})` });
    }

    await prisma.reel.update({
      where: { id },
      data: { status: 'UPLOADING', errorMessage: null }
    });

    await publishQueue.add('publish', {
      reelId: reel.id,
      publishJobId: 'manual_' + Date.now(),
      attemptCount: 0,
    });

    res.json({ success: true, message: 'Reel queued for publishing' });
  } catch (error: any) {
    console.error('Error triggering publish:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.reel.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

export const reelsRouter = router;
