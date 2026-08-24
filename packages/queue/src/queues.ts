import { Queue } from 'bullmq';
import { QUEUE_NAMES } from '@reelflow/shared';
import { connection } from './connection';
import type {
  DownloadJobData,
  ProcessJobData,
  CaptionJobData,
  PublishJobData,
  CleanupJobData,
} from './jobs';

const defaultJobOptions = {
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 30000, // 30 seconds
  },
  removeOnComplete: true,
  removeOnFail: false, // Keep failed jobs for inspection/retry
};

export const downloadQueue = new Queue<DownloadJobData>(QUEUE_NAMES.DOWNLOAD, {
  connection,
  defaultJobOptions,
});

export const processQueue = new Queue<ProcessJobData>(QUEUE_NAMES.PROCESS, {
  connection,
  defaultJobOptions,
});

export const captionQueue = new Queue<CaptionJobData>(QUEUE_NAMES.CAPTION, {
  connection,
  defaultJobOptions,
});

export const publishQueue = new Queue<PublishJobData>(QUEUE_NAMES.PUBLISH, {
  connection,
  defaultJobOptions,
});

export const cleanupQueue = new Queue<CleanupJobData>(QUEUE_NAMES.CLEANUP, {
  connection,
  defaultJobOptions: {
    ...defaultJobOptions,
    attempts: 5,
  },
});
