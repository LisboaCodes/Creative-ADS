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

// Sync all logins (called by the recurring job).
// Runs a FULL sync per login: rediscovers BMs/accounts AND syncs campaigns +
// metrics. This way new accounts/campaigns show up automatically, with no click.
syncCampaignsQueue.process('sync-all-platforms', async () => {
  logger.info('Auto-sync: running full sync for all Facebook logins');

  const logins = await prisma.platformLogin.findMany({
    where: { platformType: 'FACEBOOK' },
    select: { id: true, userId: true },
  });

  logger.info(`Auto-sync: found ${logins.length} Facebook login(s)`);

  // Track per-user totals for a summary notification
  const userTotals = new Map<string, { campaigns: number; failed: number }>();

  for (const login of logins) {
    try {
      const result = await platformsService.syncLoginFull(login.userId, login.id);
      const totals = userTotals.get(login.userId) || { campaigns: 0, failed: 0 };
      totals.campaigns += result.campaignsSynced;
      totals.failed += result.failedAccounts.length;
      userTotals.set(login.userId, totals);
    } catch (error: any) {
      logger.error(`Auto-sync failed for login ${login.id}: ${error.message}`);
    }
  }

  for (const [userId, totals] of userTotals) {
    try {
      await notificationsService.createNotification(userId, {
        title: 'Sincronização automática concluída',
        message:
          totals.failed > 0
            ? `${totals.campaigns} campanha(s) atualizada(s). ${totals.failed} conta(s) falharam — verifique a conexão.`
            : `${totals.campaigns} campanha(s) atualizada(s).`,
        type: totals.failed > 0 ? 'WARNING' : 'SUCCESS',
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
