import { whatsappDailySummaryQueue } from '../config/queue';
import { prisma } from '../config/database';
import { logger } from '../utils/logger';
import { evolutionService } from '../modules/whatsapp/evolution.service';
import { WhatsAppNotificationsService } from '../modules/whatsapp/whatsapp-notifications.service';

const notificationsFormatter = new WhatsAppNotificationsService();

whatsappDailySummaryQueue.process('daily-summary', async (job) => {
  logger.info('Running WhatsApp daily summary...');

  if (!evolutionService.isConfigured()) {
    logger.info('Evolution API not configured, skipping daily summary');
    return;
  }

  const groups = await prisma.whatsAppGroup.findMany({
    where: { isActive: true, notifyDailySummary: true },
  });

  if (groups.length === 0) {
    logger.info('No WhatsApp groups configured for daily summary');
    return;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  let sentCount = 0;

  for (const group of groups) {
    try {
      // Get active campaigns linked to this group's platforms
      const campaigns = await prisma.campaign.findMany({
        where: {
          status: 'ACTIVE',
          platformId: { in: group.platformIds },
          platform: { userId: group.userId, isConnected: true },
        },
        include: {
          metrics: {
            where: { date: { gte: today, lt: tomorrow } },
          },
        },
      });

      if (campaigns.length === 0) continue;

      // Aggregate metrics per campaign
      const campaignSummaries = campaigns
        .map((c) => {
          const spend = c.metrics.reduce((s, m) => s + m.spend, 0);
          const clicks = c.metrics.reduce((s, m) => s + Number(m.clicks), 0);
          const impressions = c.metrics.reduce((s, m) => s + Number(m.impressions), 0);
          const conversions = c.metrics.reduce((s, m) => s + m.conversions, 0);
          const revenue = c.metrics.reduce((s, m) => s + m.revenue, 0);
          return { name: c.name, spend, clicks, impressions, conversions, revenue };
        })
        .filter((c) => c.spend > 0 || c.clicks > 0);

      if (campaignSummaries.length === 0) continue;

      const message = notificationsFormatter.formatDailySummary(today, campaignSummaries);
      await evolutionService.sendTextMessage(group.groupJid, message);
      sentCount++;
    } catch (error: any) {
      logger.error(`Daily summary failed for group ${group.groupJid}:`, error.message);
    }
  }

  logger.info(`WhatsApp daily summary sent to ${sentCount} groups`);
});

// Schedule daily at 20:00 BRT (23:00 UTC)
async function scheduleDailySummary() {
  await whatsappDailySummaryQueue.add(
    'daily-summary',
    {},
    {
      repeat: { cron: '0 23 * * *' }, // 23:00 UTC = 20:00 BRT
    }
  );
  logger.info('Scheduled WhatsApp daily summary at 20:00 BRT');
}

scheduleDailySummary().catch((error) => {
  logger.error('Failed to schedule WhatsApp daily summary:', error);
});

logger.info('WhatsApp daily summary job worker started');
