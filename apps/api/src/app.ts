import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

export const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: '*',
  credentials: false,
}));

// Parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

import { prisma } from '@reelflow/database';
import { connection } from '@reelflow/queue';

// Basic health check
app.get('/api/health', async (req, res) => {
  let dbStatus = false;
  let redisStatus = false;
  let downloaderStatus = false;
  let downloaderError: string | null = null;

  try { await prisma.$queryRaw`SELECT 1`; dbStatus = true; } catch (e) {}

  try {
    const pong = await connection.ping();
    redisStatus = pong === 'PONG';
  } catch (e) {
    console.error('Redis health check failed:', e);
  }

  try {
    const downloaderUrl = process.env.DOWNLOADER_API_URL || 'http://downloader:8080';
    const resp = await fetch(`${downloaderUrl}/health`, { signal: AbortSignal.timeout(3000) });
    downloaderStatus = resp.ok;
  } catch (e) {
    console.error('Downloader health check failed:', e);
    downloaderError = e instanceof Error ? e.message : 'Unknown downloader health error';
  }

  res.json({ 
    status: dbStatus && redisStatus && downloaderStatus ? 'ok' : 'degraded',
    db: dbStatus,
    redis: redisStatus,
    downloader: downloaderStatus,
    downloaderError,
    timestamp: new Date().toISOString() 
  });
});

import { reelsRouter } from './routes/reels';
import { analyticsRouter } from './routes/analytics';
import { logsRouter } from './routes/logs';
import { settingsRouter } from './routes/settings';

// Setup routes here...
app.use('/api/reels', reelsRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/logs', logsRouter);
app.use('/api/settings', settingsRouter);

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({
    message: 'Internal Server Error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});
