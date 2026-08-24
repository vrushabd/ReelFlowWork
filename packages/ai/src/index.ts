import { GeminiProvider } from './gemini-provider';
import { CaptionProvider } from './provider';

export * from './provider';
export * from './gemini-provider';

/**
 * Factory function to get the configured AI caption provider.
 */
export function getAiProvider(overrideApiKey?: string): CaptionProvider {
  const apiKey = overrideApiKey || process.env.AI_API_KEY || '';

  if (!apiKey) {
    console.warn('⚠️ AI_API_KEY is not set. AI caption generation will throw errors when used.');
  }

  return new GeminiProvider(apiKey);
}
