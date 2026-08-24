import { Job } from 'bullmq';
import { PublishJobData, cleanupQueue } from '@reelflow/queue';
import { prisma } from '@reelflow/database';
import { getInstagramClient } from '@reelflow/instagram';
import { uploadVideoToCloudinary } from '../lib/cloudinary';
import { getVideoMetadata } from '@reelflow/video-processing';

async function ensureSystemUserId(): Promise<string> {
  const existingUser = await prisma.user.findFirst({ where: { email: 'system@reelflow.local' } });
  if (existingUser) return existingUser.id;

  const user = await prisma.user.create({
    data: {
      email: 'system@reelflow.local',
      passwordHash: 'system-managed',
      name: 'ReelFlow System',
    },
  });

  return user.id;
}

async function saveDiscoveredAccount(accessToken: string, account: { id: string; username?: string; account_type?: string }) {
  const userId = await ensureSystemUserId();
  return prisma.instagramAccount.upsert({
    where: { instagramUserId: account.id },
    update: {
      username: account.username || account.id,
      accountType: account.account_type || 'BUSINESS',
      accessTokenEnc: accessToken,
      isConnected: true,
    },
    create: {
      userId,
      instagramUserId: account.id,
      username: account.username || account.id,
      accountType: account.account_type || 'BUSINESS',
      accessTokenEnc: accessToken,
      isConnected: true,
    },
  });
}

async function getCloudinarySettings() {
  const settings = await prisma.setting.findMany({
    where: {
      key: {
        in: ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET'],
      },
    },
  });

  const byKey = Object.fromEntries(settings.map((setting) => [setting.key, setting.value]));
  return {
    cloudName: byKey.CLOUDINARY_CLOUD_NAME,
    apiKey: byKey.CLOUDINARY_API_KEY,
    apiSecret: byKey.CLOUDINARY_API_SECRET,
  };
}

export async function handlePublish(job: Job<PublishJobData>) {
  const { reelId } = job.data;
  
  console.log(`[Publish] Starting publish sequence for Reel: ${reelId}`);

  await prisma.reel.update({
    where: { id: reelId },
    data: { status: 'UPLOADING' },
  });

  try {
    const reel = await prisma.reel.findUnique({
      where: { id: reelId },
      include: { video: true, caption: true },
    });

    if (!reel || !reel.video) throw new Error('Reel or video not found');

    // Fetch primary IG account
    const igAccount = await prisma.instagramAccount.findFirst({
      where: { isConnected: true }
    });

    const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN;
    let instagramUserId = igAccount?.instagramUserId;

    if (!accessToken) {
      throw new Error('No connected Instagram account found in DB, and INSTAGRAM_ACCESS_TOKEN not set in .env');
    }
    if (!instagramUserId) {
      console.log('[Instagram] Retrieving authenticated account');
      const discoveryClient = getInstagramClient(accessToken, 'me');
      const authenticatedAccount = await discoveryClient.getAuthenticatedUser();
      console.log('[Instagram] Account ID retrieved successfully');
      if (authenticatedAccount.username) {
        console.log(`[Instagram] Username: @${authenticatedAccount.username}`);
      }
      const savedAccount = await saveDiscoveredAccount(accessToken, authenticatedAccount);
      instagramUserId = savedAccount.instagramUserId;
    }

    const igClient = getInstagramClient(accessToken, instagramUserId);

    // ── Audio Preflight (local file) ──────────────────────────────────────
    // Before uploading to Cloudinary, verify the local processed file still
    // has audio if the source did. This catches any FFmpeg audio-stripping bugs.
    if (reel.video.sourceHasAudio) {
      console.log('[Preflight] Verifying audio in processed file...');
      const localMeta = await getVideoMetadata(reel.video.filePath);
      if (!localMeta.hasAudio) {
        throw new Error(
          'Audio was lost during processing. Publishing cancelled. ' +
          'The source video had audio but the processed file has none. ' +
          'Check FFmpeg logs for details.'
        );
      }
      console.log(`[Preflight] ✓ Audio present: ${localMeta.audioCodec} ${localMeta.audioChannels}ch`);
    }

    let publicVideoUrl = reel.video.storagePath || reel.video.filePath;
    if (!publicVideoUrl.startsWith('http://') && !publicVideoUrl.startsWith('https://')) {
      console.log('[Publish] Uploading processed video to Cloudinary...');
      const cloudResult = await uploadVideoToCloudinary(reel.video.filePath, reelId, await getCloudinarySettings());
      publicVideoUrl = cloudResult.secure_url;

      // Store Cloudinary metadata in DB
      await prisma.video.update({
        where: { id: reel.video.id },
        data: {
          storagePath: cloudResult.secure_url,
          cloudinaryPublicId: cloudResult.public_id,
          cloudinaryBytes: BigInt(cloudResult.bytes),
          cloudinaryWidth: cloudResult.width || undefined,
          cloudinaryHeight: cloudResult.height || undefined,
          cloudinaryDuration: cloudResult.duration || undefined,
          cloudinaryFormat: cloudResult.format || undefined,
        },
      });
      console.log(`[Publish] ✓ Cloudinary upload complete: ${cloudResult.secure_url}`);
      console.log(`[Publish]   Size: ${Math.round(cloudResult.bytes / 1024 / 1024 * 10) / 10} MB, ${cloudResult.width}x${cloudResult.height}`);
    }

    if (!publicVideoUrl.startsWith('https://')) {
      throw new Error('Publishing requires a public HTTPS video URL.');
    }

    const fullCaption = `${reel.caption?.text || ''}\n\n${reel.caption?.hashtags || ''}`.trim();

    // 1. Create Media Container
    console.log('[Instagram] Creating media container...');
    const containerId = await igClient.createMediaContainer(publicVideoUrl, fullCaption);
    console.log(`[Instagram] Media container created: ${containerId}`);

    // 2. Poll for processing status
    let isReady = false;
    let attempts = 0;
    while (!isReady && attempts < 24) {  // Up to 2 minutes
      console.log(`[Instagram] Checking media processing status (attempt ${attempts + 1}/24)...`);
      const status = await igClient.getPublishingStatus(containerId);
      if (status === 'FINISHED') {
        isReady = true;
        break;
      }
      if (status === 'ERROR') {
        throw new Error('Meta API reported container processing error.');
      }
      await new Promise(r => setTimeout(r, 5000));
      attempts++;
    }

    if (!isReady) throw new Error('Container processing timed out on Meta\'s end.');

    // 3. Publish
    console.log('[Instagram] Publishing media...');
    const mediaId = await igClient.publishMediaContainer(containerId);

    // 4. Update Database
    await prisma.post.create({
      data: {
        reelId,
        instagramAccountId: igAccount?.id || undefined,
        instagramMediaId: mediaId,
        status: 'PUBLISHED',
        publishedAt: new Date(),
      }
    });

    await prisma.reel.update({
      where: { id: reelId },
      data: {
        status: 'PUBLISHED',
        publishedAt: new Date(),
        instagramMediaId: mediaId,
      }
    });

    console.log(`[Publish] ✅ Successfully published Reel: ${reelId} (Media ID: ${mediaId})`);

    // 5. Cleanup temp files
    await cleanupQueue.add('cleanup', { reelId, videoId: reel.video.id });

  } catch (error: any) {
    console.error(`[Publish] Failed for Reel: ${reelId}`, error);
    const rawMessage = error.message || 'Unknown publishing error';
    const errorMessage = rawMessage.includes('Cannot parse access token')
      ? 'Instagram publishing token is invalid. Update INSTAGRAM_ACCESS_TOKEN with a valid Instagram User Access Token.'
      : rawMessage;
    await prisma.reel.update({
      where: { id: reelId },
      data: {
        status: 'FAILED',
        errorMessage: `Publishing failed: ${errorMessage}`,
      }
    });
    throw error;
  }
}
