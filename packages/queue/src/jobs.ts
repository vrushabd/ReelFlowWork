export interface DownloadJobData {
  reelId: string;
  url: string;
  attemptCount: number;
}

export interface ProcessJobData {
  reelId: string;
  videoId: string;
  filePath: string;
  attemptCount: number;
}

export interface CaptionJobData {
  reelId: string;
  videoId: string;
  attemptCount: number;
}

export interface PublishJobData {
  reelId: string;
  publishJobId: string;
  attemptCount: number;
}

export interface CleanupJobData {
  reelId: string;
  videoId?: string;
}
