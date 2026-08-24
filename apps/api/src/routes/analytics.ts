import { Router } from 'express';
import { prisma } from '@reelflow/database';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const totalReels = await prisma.reel.count();
    const published = await prisma.reel.count({ where: { status: 'PUBLISHED' } });
    const failed = await prisma.reel.count({ where: { status: 'FAILED' } });
    const scheduled = await prisma.reel.count({ where: { status: 'SCHEDULED' } });

    res.json({
      totalReels,
      published,
      failed,
      scheduled,
      // Mock metrics for IG
      totalReach: published * 1245,
      totalLikes: published * 342,
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

export const analyticsRouter = router;
