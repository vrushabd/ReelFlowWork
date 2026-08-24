import { z } from 'zod';

export const ReelUrlSchema = z.string().url().refine(
  (url) => {
    try {
      const parsed = new URL(url);
      return parsed.hostname.includes('instagram.com') && parsed.pathname.includes('/reel/');
    } catch {
      return false;
    }
  },
  {
    message: 'Must be a valid Instagram Reel URL (e.g., https://www.instagram.com/reel/...)',
  }
);

export const AddReelsSchema = z.object({
  urls: z.array(ReelUrlSchema).min(1, 'At least one URL is required'),
  postingMode: z.enum(['IMMEDIATELY', 'SCHEDULED', 'MANUAL']).default('MANUAL'),
});

export type AddReelsInput = z.infer<typeof AddReelsSchema>;
