import { GoogleGenerativeAI } from '@google/generative-ai';
import { CaptionProvider, GeneratedCaption } from './provider';

export class GeminiProvider implements CaptionProvider {
  private ai: GoogleGenerativeAI;

  constructor(apiKey: string) {
    this.ai = new GoogleGenerativeAI(apiKey);
  }

  async generateCaption(context: string): Promise<GeneratedCaption> {
    const prompt = `
You are an expert Instagram social media manager for a page focused on Hindi music, music covers, scenery, nature, cinematic travel, and original/authorized aesthetic short-form videos.

First classify the content, then write a caption for MY page.

Rules:
1. Never claim facts that aren't present in the context.
2. Output strictly in JSON format matching the schema below.
3. No markdown blocks in output, just raw JSON.
4. Do not write captions like "check this reel from", "watch this reel from", or "credit: @xyz" unless attribution is explicitly requested.
5. For Hindi music or covers, use natural Hindi, Hinglish, or English depending on the context.
6. Use emotional, music-first language for songs and peaceful, cinematic language for scenery.
7. Generate 5 to 10 relevant hashtags. Do not reuse the same generic hashtag set every time.
8. Do not claim something is currently trending unless current trend data appears in the context.

Context:
"${context}"

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
        caption: parsed.caption || 'Some moments just stay with you.',
        hashtags: hashtags || '#musicreels #naturelovers #cinematic',
        shortTitle: parsed.shortTitle || 'Instagram Reel',
        category: parsed.category || 'other',
        tone: parsed.tone || 'other',
        hookType: parsed.hookType || 'simple',
      };
    } catch (error: any) {
      throw new Error(`Gemini AI generation failed: ${error.message}`);
    }
  }
}
