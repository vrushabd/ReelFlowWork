import { GoogleGenerativeAI } from '@google/generative-ai';
import { CaptionProvider, GeneratedCaption } from './provider';

function sanitizeSourceContext(context: string): string {
  const sanitized = context
    .replace(/^video\s+by\s+[^\n|–—-]+/i, 'Instagram Reel')
    .replace(/(?:credit|creator|owner|source)\s*:?\s*@?[a-z0-9._]+/gi, '')
    .replace(/@[a-z0-9._]+/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim();

  return sanitized || 'Instagram Reel';
}

function stripOwnerMentions(value: unknown, fallback: string): string {
  if (typeof value !== 'string') return fallback;

  const sanitized = value
    .replace(/(?:credit(?:s)?(?:\s+to)?|creator|owner|source)\s*:?\s*@?[a-z0-9._]+/gi, '')
    .replace(/@[a-z0-9._]+/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim();

  return sanitized || fallback;
}

export class GeminiProvider implements CaptionProvider {
  private ai: GoogleGenerativeAI;

  constructor(apiKey: string) {
    this.ai = new GoogleGenerativeAI(apiKey);
  }

  async generateCaption(context: string): Promise<GeneratedCaption> {
    const safeContext = sanitizeSourceContext(context);
    const prompt = `
You are an expert Instagram social media manager for a page focused on Hindi music, music covers, scenery, nature, cinematic travel, and original/authorized aesthetic short-form videos.

First classify the content, then write a caption for MY page.

Rules:
1. Never claim facts that aren't present in the context.
2. Output strictly in JSON format matching the schema below.
3. No markdown blocks in output, just raw JSON.
4. Never mention, tag, credit, or name the source Reel owner/creator. Do not include usernames or @handles in the caption or short title.
5. Do not write phrases such as "video by", "reel by", "check this reel from", "watch this reel from", "credit to", or "source".
6. For Hindi music or covers, use natural Hindi, Hinglish, or English depending on the context.
7. Use emotional, music-first language for songs and peaceful, cinematic language for scenery.
8. Generate 5 to 10 relevant hashtags. Do not reuse the same generic hashtag set every time.
9. Do not claim something is currently trending unless current trend data appears in the context.

Context:
"${safeContext}"

JSON Schema:
{
  "category": "hindi_music | music_cover | scenery | nature | travel | cinematic | other",
  "caption": "A natural, engaging caption written for my page...",
  "hashtags": ["#hashtag1", "#hashtag2", "#hashtag3"],
  "shortTitle": "A short title",
  "tone": "emotional | peaceful | cinematic | romantic | energetic | reflective | other",
  "hookType": "pov | question | mood | poetic | simple | other"
}`;

    try {
      const model = this.ai.getGenerativeModel({
        model: process.env.GEMINI_MODEL || 'gemini-2.0-flash',
        generationConfig: { responseMimeType: 'application/json' },
      });
      const response = await model.generateContent(prompt);
      const text = response.response.text();
      const parsed = JSON.parse(text);
      const hashtags = Array.isArray(parsed.hashtags) ? parsed.hashtags.join(' ') : parsed.hashtags;

      return {
        caption: stripOwnerMentions(parsed.caption, 'Some moments just stay with you.'),
        hashtags: hashtags || '#musicreels #naturelovers #cinematic',
        shortTitle: stripOwnerMentions(parsed.shortTitle, 'Instagram Reel'),
        category: parsed.category || 'other',
        tone: parsed.tone || 'other',
        hookType: parsed.hookType || 'simple',
      };
    } catch (error: any) {
      throw new Error(`Gemini AI generation failed: ${error.message}`);
    }
  }
}
