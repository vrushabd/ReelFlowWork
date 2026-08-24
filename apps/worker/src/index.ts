import dotenv from 'dotenv';
import path from 'path';

// Load env vars
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

import { Worker } from 'bullmq';
import { QUEUE_NAMES } from '@reelflow/shared';
import { connection } from '@reelflow/queue';

import { handleDownload } from './handlers/download';
import { handleProcess } from './handlers/process';
import { handleCaption } from './handlers/caption';
import { handlePublish } from './handlers/publish';
import { handleCleanup } from './handlers/cleanup';

const concurrency = parseInt(process.env.WORKER_CONCURRENCY || '3', 10);

console.log('🚀 ReelFlow Worker starting...');

const downloadWorker = new Worker(QUEUE_NAMES.DOWNLOAD, handleDownload, { connection, concurrency });
const processWorker = new Worker(QUEUE_NAMES.PROCESS, handleProcess, { connection, concurrency });
const captionWorker = new Worker(QUEUE_NAMES.CAPTION, handleCaption, { connection, concurrency });
const publishWorker = new Worker(QUEUE_NAMES.PUBLISH, handlePublish, { connection, concurrency });
const cleanupWorker = new Worker(QUEUE_NAMES.CLEANUP, handleCleanup, { connection, concurrency: 1 });

console.log(`✅ Workers initialized with concurrency: ${concurrency}`);

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received. Shutting down workers gracefully...');
  await Promise.all([
    downloadWorker.close(),
    processWorker.close(),
    captionWorker.close(),
    publishWorker.close(),
    cleanupWorker.close(),
  ]);
  process.exit(0);
});
