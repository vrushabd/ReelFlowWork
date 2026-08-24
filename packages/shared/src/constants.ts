export const QUEUE_NAMES = {
  DOWNLOAD: 'download-queue',
  PROCESS: 'process-queue',
  CAPTION: 'caption-queue',
  PUBLISH: 'publish-queue',
  CLEANUP: 'cleanup-queue',
} as const;

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500,
} as const;

export const DEFAULT_PAGINATION_LIMIT = 20;
export const MAX_PAGINATION_LIMIT = 100;
