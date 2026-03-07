import { syncCampaignsQueue } from '../config/queue';
import { prisma } from '../config/database';
import { platformsService } from '../modules/platforms/platforms.service';
import { notificationsService } from '../modules/notifications/notifications.service';
import { logger } from '../utils/logger';
import { env } from '../config/env';

// Process individual platform sync job
syncCampaignsQueue.process('sync-platform', async (job) => {
  const { platformId } = job.data;

  logger.info(`Processing sync job for platform: ${platformId}`);

  try {
    await platformsService.syncPlatformCampaigns(platformId);
    logger.info(`Sync completed for platform: ${platformId}`);
  } catch (error: any) {
    logger.error(`Sync failed for platform ${platformId}:`, {
      message: error.message,
      response: error.response?.data,
      stack: error.stack,
    });
    throw error; // Bull will retry
  }
});

// Sync all platforms (called by recurring job)
syncCampaignsQueue.process('sync-all-platforms', async (job) => {
  logger.info('Running sync for all connected platforms');

  // Only sync FACEBOOK platforms (Instagram uses the same API/ad accounts, syncing both creates duplicates)
  // Also skip demo accounts
  const platforms = await prisma.platform.findMany({
    where: {
      isConnected: true,
      type: 'FACEBOOK',
      NOT: {
        externalId: { startsWith: 'act_fb_' },
      },
    },
    select: { id: true, userId: true },
  });

  logger.info(`Found ${platforms.length} connected Facebook platforms to sync`);

  // Track per-user sync counts
  const userSyncCounts = new Map<string, number>();

  // Add individual sync jobs
  for (const platform of platforms) {
    await syncCampaignsQueue.add('sync-platform', { platformId: platform.id });
    userSyncCounts.set(platform.userId, (userSyncCounts.get(platform.userId) || 0) + 1);
  }

  // Notify users that sync started
  for (const [userId, count] of userSyncCounts) {
    try {
      await notificationsService.createNotification(userId, {
        title: 'Sync concluido',
        message: `${count} plataforma(s) sincronizada(s) com sucesso.`,
        type: 'SUCCESS',
      });
    } catch (error: any) {
      logger.error(`Failed to create sync notification for user ${userId}:`, error.message);
    }
  }
});

// Schedule recurring sync for all connected platforms
async function scheduleRecurringSyncs() {
  // Parse interval (e.g., "15m" -> 15 minutes)
  const intervalMatch = env.SYNC_CAMPAIGNS_INTERVAL.match(/^(\d+)(m|h|d)$/);
  if (!intervalMatch) {
    logger.error('Invalid SYNC_CAMPAIGNS_INTERVAL format');
    return;
  }

  const [, value, unit] = intervalMatch;
  const intervals = {
    m: Number(value) * 60 * 1000, // minutes to ms
    h: Number(value) * 60 * 60 * 1000, // hours to ms
    d: Number(value) * 24 * 60 * 60 * 1000, // days to ms
  };

  const intervalMs = intervals[unit as 'm' | 'h' | 'd'];

  // Add repeatable job
  await syncCampaignsQueue.add(
    'sync-all-platforms',
    {},
    {
      repeat: {
        every: intervalMs,
      },
    }
  );

  logger.info(`Scheduled recurring sync every ${env.SYNC_CAMPAIGNS_INTERVAL}`);
}

// Start recurring syncs on server start
scheduleRecurringSyncs().catch((error) => {
  logger.error('Failed to schedule recurring syncs:', error);
});

logger.info('Sync campaigns job worker started');
