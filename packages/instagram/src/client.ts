import axios from 'axios';

export interface InstagramClientOptions {
  accessToken: string;
  instagramAccountId: string; // The specific IG user ID
  apiVersion?: string;
}

export interface InstagramAuthenticatedUser {
  id: string;
  username?: string;
  account_type?: string;
}

export class InstagramClient {
  private accessToken: string;
  private igAccountId: string;
  private readonly baseUrl: string;

  constructor(options: InstagramClientOptions) {
    this.accessToken = options.accessToken;
    this.igAccountId = options.instagramAccountId;
    const apiVersion = options.apiVersion || process.env.INSTAGRAM_GRAPH_API_VERSION || 'v24.0';
    this.baseUrl = `https://graph.instagram.com/${apiVersion}`;
  }

  async getAuthenticatedUser(): Promise<InstagramAuthenticatedUser> {
    try {
      const response = await axios.get(`${this.baseUrl}/me`, {
        params: {
          fields: 'id,username,account_type',
          access_token: this.accessToken,
        },
      });

      if (!response.data?.id) {
        throw new Error('Instagram account information could not be retrieved.');
      }

      return response.data;
    } catch (error: any) {
      throw new Error(`Failed to retrieve authenticated Instagram account: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  /**
   * Step 1: Create a media container for the Reel.
   * videoUrl must be a public URL accessible by Meta's servers.
   */
  async createMediaContainer(videoUrl: string, caption?: string): Promise<string> {
    try {
      const response = await axios.post(`${this.baseUrl}/${this.igAccountId}/media`, {
        media_type: 'REELS',
        video_url: videoUrl,
        caption: caption || '',
        access_token: this.accessToken,
      });

      if (!response.data || !response.data.id) {
        throw new Error('Failed to create media container: No ID returned');
      }

      return response.data.id;
    } catch (error: any) {
      throw new Error(`Failed to create media container: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  /**
   * Step 2: Poll for processing status.
   */
  async getPublishingStatus(containerId: string): Promise<string> {
    try {
      const response = await axios.get(`${this.baseUrl}/${containerId}`, {
        params: {
          fields: 'status_code',
          access_token: this.accessToken,
        },
      });

      return response.data.status_code; // e.g. 'FINISHED', 'IN_PROGRESS', 'ERROR'
    } catch (error: any) {
      throw new Error(`Failed to check container status: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  /**
   * Step 3: Publish the media container.
   */
  async publishMediaContainer(containerId: string): Promise<string> {
    try {
      const response = await axios.post(`${this.baseUrl}/${this.igAccountId}/media_publish`, {
        creation_id: containerId,
        access_token: this.accessToken,
      });

      if (!response.data || !response.data.id) {
        throw new Error('Failed to publish media: No ID returned');
      }

      return response.data.id; // Returns the final Instagram Media ID
    } catch (error: any) {
      throw new Error(`Failed to publish media: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  async createComment(mediaId: string, message: string): Promise<string> {
    try {
      const response = await axios.post(`${this.baseUrl}/${mediaId}/comments`, {
        message,
        access_token: this.accessToken,
      });

      if (!response.data?.id) {
        throw new Error('Instagram did not return a comment ID.');
      }

      return response.data.id;
    } catch (error: any) {
      throw new Error(`Failed to create Instagram comment: ${error.response?.data?.error?.message || error.message}`);
    }
  }
}
