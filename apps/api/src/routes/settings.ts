import { Router } from 'express';
import { prisma } from '@reelflow/database';
import { getInstagramClient } from '@reelflow/instagram';
import { timingSafeEqual } from 'node:crypto';

const router = Router();

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

async function getInstagramAccessToken(): Promise<{ token: string; source: 'database' | 'env' | 'none' }> {
  const setting = await prisma.setting.findUnique({ where: { key: 'INSTAGRAM_ACCESS_TOKEN' } });
  if (setting?.value) return { token: setting.value, source: 'database' };
  if (process.env.INSTAGRAM_ACCESS_TOKEN) return { token: process.env.INSTAGRAM_ACCESS_TOKEN, source: 'env' };
  return { token: '', source: 'none' };
}

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

async function discoverAndSaveInstagramAccount(accessToken: string) {
  console.log('[Instagram] Retrieving authenticated account');
  const client = getInstagramClient(accessToken, 'me');
  const account = await client.getAuthenticatedUser();
  console.log('[Instagram] Account ID retrieved successfully');
  if (account.username) {
    console.log('[Instagram] Username retrieved successfully');
  }

  const userId = await ensureSystemUserId();
  const savedAccount = await prisma.instagramAccount.upsert({
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

  return savedAccount;
}

router.get('/instagram', async (req, res) => {
  try {
    const { token: accessToken, source: tokenSource } = await getInstagramAccessToken();
    const isConnectedEnv = tokenSource === 'env';

    const igAccountDb = await prisma.instagramAccount.findFirst({
      where: { isConnected: true }
    });

    const isConnected = isConnectedEnv || !!igAccountDb;

    let username: string | null = igAccountDb?.username || null;
    let instagramUserId: string | null = igAccountDb?.instagramUserId || null;
    let profilePicture: string | null = null;
    let profileTokenValid = false;
    let publishingTokenValid = false;
    let tokenError: string | null = null;

    // Fetch real data from Meta Graph API if we have a token
    if (accessToken) {
      try {
        const savedAccount = igAccountDb?.instagramUserId
          ? igAccountDb
          : await discoverAndSaveInstagramAccount(accessToken);

        username = savedAccount.username || username;
        instagramUserId = savedAccount.instagramUserId || instagramUserId;
        profileTokenValid = true;
      } catch (metaErr) {
        console.warn('Could not reach Meta Graph API:', metaErr);
        tokenError = metaErr instanceof Error ? metaErr.message : 'Could not reach Instagram API';
      }

      if (profileTokenValid && instagramUserId && username) {
        publishingTokenValid = true;
      }
    }

    res.json({
      isConnected,
      tokenValid: publishingTokenValid,
      profileTokenValid,
      publishingTokenValid,
      tokenError,
      source: tokenSource,
      instagramUserId: instagramUserId || null,
      username: username || null,
      profilePicture,
    });
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.post('/instagram/test', async (req, res) => {
  try {
    console.log('[Instagram] Checking connection');
    const { token: accessToken } = await getInstagramAccessToken();
    if (!accessToken) {
      return res.status(400).json({
        success: false,
        code: 'TOKEN_MISSING',
        message: 'Instagram access token is not configured.',
      });
    }

    const savedAccount = await discoverAndSaveInstagramAccount(accessToken);
    console.log('[Instagram] Connection verified');

    res.json({
      success: true,
      isConnected: true,
      tokenValid: true,
      publishingAvailable: true,
      instagramUserId: savedAccount.instagramUserId,
      username: savedAccount.username,
    });
  } catch (error: any) {
    const message = error.message || 'Instagram authentication failed';
    console.warn('[Instagram] Connection test failed:', message);
    res.status(400).json({
      success: false,
      code: message.includes('permission') ? 'PUBLISHING_PERMISSION_MISSING' : 'AUTHENTICATION_FAILED',
      message: message.includes('permission')
        ? 'Reconnect the Instagram account and grant the required content publishing permission.'
        : 'Your Instagram access token is invalid or expired. Reconnect your Instagram account.',
    });
  }
});

router.post('/instagram/token', async (req, res) => {
  try {
    const configuredPassword = process.env.DASHBOARD_PASSWORD || '';
    const dashboardPassword = typeof req.body.dashboardPassword === 'string' ? req.body.dashboardPassword : '';
    const accessToken = typeof req.body.accessToken === 'string' ? req.body.accessToken.trim() : '';

    if (!configuredPassword || !safeEqual(dashboardPassword, configuredPassword)) {
      return res.status(401).json({ error: 'Incorrect dashboard password.' });
    }
    if (!accessToken || accessToken.includes('*')) {
      return res.status(400).json({ error: 'Enter a valid Meta access token.' });
    }

    const savedAccount = await discoverAndSaveInstagramAccount(accessToken);
    await prisma.setting.upsert({
      where: { key: 'INSTAGRAM_ACCESS_TOKEN' },
      update: { value: accessToken, isSecret: true },
      create: { key: 'INSTAGRAM_ACCESS_TOKEN', value: accessToken, isSecret: true },
    });

    res.json({
      success: true,
      username: savedAccount.username,
      instagramUserId: savedAccount.instagramUserId,
    });
  } catch (error: any) {
    console.warn('[Instagram] Token update failed:', error?.message || 'Unknown error');
    res.status(400).json({ error: 'Meta rejected this token. Verify it is valid and has publishing permissions.' });
  }
});

router.get('/', async (req, res) => {
  try {
    const [
      aiKeySetting,
      cloudNameSetting,
      cloudApiKeySetting,
      cloudSecretSetting,
    ] = await Promise.all([
      prisma.setting.findUnique({ where: { key: 'AI_API_KEY' } }),
      prisma.setting.findUnique({ where: { key: 'CLOUDINARY_CLOUD_NAME' } }),
      prisma.setting.findUnique({ where: { key: 'CLOUDINARY_API_KEY' } }),
      prisma.setting.findUnique({ where: { key: 'CLOUDINARY_API_SECRET' } }),
    ]);
    res.json({
      aiApiKeySet: !!aiKeySetting || !!process.env.AI_API_KEY,
      cloudinary: {
        cloudName: cloudNameSetting?.value || process.env.CLOUDINARY_CLOUD_NAME || '',
        apiKey: cloudApiKeySetting?.value || process.env.CLOUDINARY_API_KEY || '',
        apiSecretSet: !!cloudSecretSetting || !!process.env.CLOUDINARY_API_SECRET,
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.post('/cloudinary', async (req, res) => {
  try {
    const { cloudName, apiKey, apiSecret } = req.body;
    const updates: Array<{ key: string; value: string; isSecret: boolean }> = [];

    if (typeof cloudName === 'string' && cloudName.trim()) {
      updates.push({ key: 'CLOUDINARY_CLOUD_NAME', value: cloudName.trim(), isSecret: false });
    }
    if (typeof apiKey === 'string' && apiKey.trim()) {
      updates.push({ key: 'CLOUDINARY_API_KEY', value: apiKey.trim(), isSecret: true });
    }
    if (typeof apiSecret === 'string' && apiSecret.trim() && !apiSecret.includes('*')) {
      updates.push({ key: 'CLOUDINARY_API_SECRET', value: apiSecret.trim(), isSecret: true });
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No Cloudinary settings provided' });
    }

    await Promise.all(updates.map((setting) => prisma.setting.upsert({
      where: { key: setting.key },
      update: { value: setting.value, isSecret: setting.isSecret },
      create: setting,
    })));

    res.json({ success: true });
  } catch (error) {
    console.error('Error saving Cloudinary settings:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { key, value } = req.body;
    if (!key || !value) return res.status(400).json({ error: 'Missing key or value' });

    await prisma.setting.upsert({
      where: { key },
      update: { value, isSecret: key.includes('KEY') || key.includes('TOKEN') },
      create: { key, value, isSecret: key.includes('KEY') || key.includes('TOKEN') }
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error saving setting:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

export const settingsRouter = router;
