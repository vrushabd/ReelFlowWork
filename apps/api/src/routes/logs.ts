import { Router } from 'express';
import { prisma } from '@reelflow/database';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const logs = await prisma.systemLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    res.json({ logs });
  } catch (error) {
    console.error('Error fetching logs:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

export const logsRouter = router;
