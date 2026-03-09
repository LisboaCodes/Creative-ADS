import { checkAlertsQueue } from '../config/queue';
import { prisma } from '../config/database';
import { notificationsService } from '../modules/notifications/notifications.service';
import { whatsAppNotificationsService } from '../modules/whatsapp/whatsapp-notifications.service';
import { logger } from '../utils/logger';
import { env } from '../config/env';

// Process alert checking
checkAlertsQueue.process('check-alerts', async (job) => {
  logger.info('Running alert checks...');

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  // Get all users with connected platforms
  const users = await prisma.user.findMany({
    where: {
      platforms: { some: { isConnected: true } },
    },
    select: { id: true },
  });

  for (const user of users) {
    try {
      await checkUserAlerts(user.id, thirtyDaysAgo);
    } catch (error: any) {
      logger.error(`Alert check failed for user ${user.id}:`, error.message);
    }
  }

  logger.info(`Alert checks completed for ${users.length} users`);
});

async function checkUserAlerts(userId: string, since: Date) {
  const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);

  // Get active campaigns with recent metrics
  const campaigns = await prisma.campaign.findMany({
    where: {
      status: 'ACTIVE',
      platform: { userId, isConnected: true },
    },
    include: {
      metrics: {
        where: { date: { gte: since } },
        orderBy: { date: 'desc' },
      },
    },
  });

  for (const campaign of campaigns) {
    // ── Zero spend detection: ACTIVE campaign with $0 spend in last 2 days ──
    const recentMetrics = campaign.metrics.filter(m => m.date >= twoDaysAgo);
    const recentSpend = recentMetrics.reduce((s, m) => s + m.spend, 0);

    if (recentMetrics.length > 0 && recentSpend === 0) {
      const isNew = await createAlertIfNew(
        userId,
        `Sem gasto: ${campaign.name}`,
        `A campanha "${campaign.name}" está ATIVA mas não teve nenhum gasto nos últimos 2 dias. Verifique se o orçamento, público ou criativo estão configurados corretamente.`,
        'WARNING',
        `zero-spend-${campaign.id}`,
        { campaignId: campaign.id, alertType: 'ZERO_SPEND' }
      );

      if (isNew) {
        whatsAppNotificationsService.notifyGroups(userId, 'PERFORMANCE_ALERT', {
          campaign: { name: campaign.name, platformId: campaign.platformId },
          alertType: 'ZERO_SPEND',
          metrics: { spend: 0, days: 2 },
        }).catch(err => logger.warn('WhatsApp zero spend alert failed', err));
      }
    }

    if (campaign.metrics.length === 0) continue;

    // Aggregate 30d metrics
    const totalSpend = campaign.metrics.reduce((s, m) => s + m.spend, 0);
    const totalClicks = campaign.metrics.reduce((s, m) => s + Number(m.clicks), 0);
    const totalImpressions = campaign.metrics.reduce((s, m) => s + Number(m.impressions), 0);
    const totalRevenue = campaign.metrics.reduce((s, m) => s + m.revenue, 0);

    if (totalSpend <= 0) continue;

    const ctr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
    const cpc = totalClicks > 0 ? totalSpend / totalClicks : 0;
    const roas = totalSpend > 0 ? totalRevenue / totalSpend : 0;

    // Check for low CTR
    if (ctr < 0.5 && totalImpressions > 1000) {
      const isNew = await createAlertIfNew(
        userId,
        `CTR baixo: ${campaign.name}`,
        `A campanha "${campaign.name}" tem CTR de ${ctr.toFixed(2)}% nos ultimos 30 dias (abaixo de 0.5%). Considere revisar o criativo ou o publico-alvo.`,
        'WARNING',
        `ctr-low-${campaign.id}`,
        { campaignId: campaign.id, alertType: 'CTR_LOW' }
      );

      if (isNew) {
        whatsAppNotificationsService.notifyGroups(userId, 'PERFORMANCE_ALERT', {
          campaign: { name: campaign.name, platformId: campaign.platformId },
          alertType: 'CTR_LOW',
          metrics: { ctr, impressions: totalImpressions, clicks: totalClicks },
        }).catch(err => logger.warn('WhatsApp alert notification failed', err));
      }
    }

    // ── High CPC detection: CPC > R$5 with 50+ clicks ──
    if (cpc > 5 && totalClicks >= 50) {
      const isNew = await createAlertIfNew(
        userId,
        `CPC alto: ${campaign.name}`,
        `A campanha "${campaign.name}" tem CPC de R$${cpc.toFixed(2)} nos últimos 30 dias (acima de R$5,00 com ${totalClicks} cliques). Considere otimizar o público ou os criativos.`,
        'WARNING',
        `cpc-high-${campaign.id}`,
        { campaignId: campaign.id, alertType: 'CPC_HIGH' }
      );

      if (isNew) {
        whatsAppNotificationsService.notifyGroups(userId, 'PERFORMANCE_ALERT', {
          campaign: { name: campaign.name, platformId: campaign.platformId },
          alertType: 'CPC_HIGH',
          metrics: { cpc, clicks: totalClicks, spend: totalSpend },
        }).catch(err => logger.warn('WhatsApp CPC alert failed', err));
      }
    }

    // Check for negative ROAS
    if (roas < 1 && totalSpend > 50) {
      const isNew = await createAlertIfNew(
        userId,
        `ROAS negativo: ${campaign.name}`,
        `A campanha "${campaign.name}" tem ROAS de ${roas.toFixed(2)}x (gasto R$${totalSpend.toFixed(2)}, receita R$${totalRevenue.toFixed(2)}). Considere pausar ou otimizar.`,
        'ERROR',
        `roas-negative-${campaign.id}`,
        { campaignId: campaign.id, alertType: 'ROAS_NEGATIVE' }
      );

      if (isNew) {
        whatsAppNotificationsService.notifyGroups(userId, 'PERFORMANCE_ALERT', {
          campaign: { name: campaign.name, platformId: campaign.platformId },
          alertType: 'ROAS_NEGATIVE',
          metrics: { roas, spend: totalSpend, revenue: totalRevenue },
        }).catch(err => logger.warn('WhatsApp alert notification failed', err));
      }
    }
  }
}

/**
 * Create a notification only if a similar one doesn't exist in the last 24h
 */
async function createAlertIfNew(
  userId: string,
  title: string,
  message: string,
  type: 'INFO' | 'WARNING' | 'SUCCESS' | 'ERROR',
  dedupKey: string,
  metadata?: Record<string, any>
): Promise<boolean> {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  // Check for recent notification with same title to avoid spam
  const existing = await prisma.notification.findFirst({
    where: {
      userId,
      title,
      createdAt: { gte: oneDayAgo },
    },
  });

  if (existing) return false;

  await notificationsService.createNotification(userId, { title, message, type, metadata });
  logger.info(`Alert created for user ${userId}: ${title}`);
  return true;
}

// Notify after sync completes
export async function notifySyncComplete(userId: string, updatedCount: number) {
  if (updatedCount > 0) {
    await notificationsService.createNotification(userId, {
      title: 'Sync concluido',
      message: `${updatedCount} campanhas atualizadas com sucesso.`,
      type: 'SUCCESS',
    });
  }
}

// Schedule recurring alert checks (every 15 minutes)
async function scheduleRecurringAlertChecks() {
  const intervalMatch = env.SYNC_CAMPAIGNS_INTERVAL.match(/^(\d+)(m|h|d)$/);
  if (!intervalMatch) {
    logger.error('Invalid SYNC_CAMPAIGNS_INTERVAL format for alerts');
    return;
  }

  const [, value, unit] = intervalMatch;
  const intervals = {
    m: Number(value) * 60 * 1000,
    h: Number(value) * 60 * 60 * 1000,
    d: Number(value) * 24 * 60 * 60 * 1000,
  };

  const intervalMs = intervals[unit as 'm' | 'h' | 'd'];

  await checkAlertsQueue.add(
    'check-alerts',
    {},
    {
      repeat: { every: intervalMs },
    }
  );

  logger.info(`Scheduled recurring alert checks every ${env.SYNC_CAMPAIGNS_INTERVAL}`);
}

scheduleRecurringAlertChecks().catch((error) => {
  logger.error('Failed to schedule alert checks:', error);
});

logger.info('Check alerts job worker started');
