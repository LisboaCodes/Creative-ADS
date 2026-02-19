import { syncCampaignsQueue } from '../config/queue';
import { prisma } from '../config/database';
import { platformsService } from '../modules/platforms/platforms.service';
import { logger } from '../utils/logger';
import { env } from '../config/env';

// Process sync job
syncCampaignsQueue.process(async (job) => {
  const { platformId } = job.data;

  logger.info(`Processing sync job for platform: ${platformId}`);

  try {
    await platformsService.syncPlatformCampaigns(platformId);
    logger.info(`Sync completed for platform: ${platformId}`);
  } catch (error: any) {
    logger.error(`Sync failed for platform ${platformId}:`, error);
    throw error; // Bull will retry
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

// Sync all platforms (called by recurring job)
syncCampaignsQueue.process('sync-all-platforms', async (job) => {
  logger.info('Running sync for all connected platforms');

  const platforms = await prisma.platform.findMany({
    where: { isConnected: true },
    select: { id: true },
  });

  logger.info(`Found ${platforms.length} connected platforms`);

  // Add individual sync jobs
  for (const platform of platforms) {
    await syncCampaignsQueue.add('sync-platform', { platformId: platform.id });
  }
});

// Start recurring syncs on server start
scheduleRecurringSyncs().catch((error) => {
  logger.error('Failed to schedule recurring syncs:', error);
});

logger.info('Sync campaigns job worker started');
