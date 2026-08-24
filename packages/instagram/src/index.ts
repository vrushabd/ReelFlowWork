export * from './client';

export function getInstagramClient(accessToken: string, instagramAccountId: string): import('./client').InstagramClient {
  return new (require('./client').InstagramClient)({ accessToken, instagramAccountId });
}
