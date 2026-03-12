import { prisma } from '../../config/database';
import { logger } from '../../utils/logger';
import { notificationsService } from '../notifications/notifications.service';

export class CrossPlatformService {
  /**
   * Check for high-performing campaigns and suggest cross-platform duplication.
   * Called once per day from check-alerts job.
   */
  async checkAndSuggest(userId: string) {
    // Only suggest once per day
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentSuggestion = await prisma.notification.findFirst({
      where: {
        userId,
        title: { startsWith: 'Sugestão cross-platform' },
        createdAt: { gte: oneDayAgo },
      },
    });
    if (recentSuggestion) return;

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const campaigns = await prisma.campaign.findMany({
      where: {
        status: 'ACTIVE',
        platform: { userId, isConnected: true },
      },
      include: {
        metrics: { where: { date: { gte: sevenDaysAgo } } },
        platform: { select: { type: true, name: true } },
      },
    });

    // Get user's connected platform types
    const connectedPlatforms = await prisma.platform.findMany({
      where: { userId, isConnected: true },
      select: { type: true },
    });
    const connectedTypes = new Set(connectedPlatforms.map(p => p.type));

    for (const campaign of campaigns) {
      const spend = campaign.metrics.reduce((s, m) => s + m.spend, 0);
      const revenue = campaign.metrics.reduce((s, m) => s + m.revenue, 0);
      const roas = spend > 0 ? revenue / spend : 0;

      // Suggest duplication if ROAS > 3x and spend > $50
      if (roas >= 3 && spend >= 50) {
        // Find platforms where this campaign doesn't exist yet
        const otherPlatforms = Array.from(connectedTypes).filter(t => t !== campaign.platformType);

        if (otherPlatforms.length > 0) {
          await notificationsService.createNotification(userId, {
            title: `Sugestão cross-platform: ${campaign.name}`,
            message: `A campanha "${campaign.name}" (${campaign.platform.type}) tem ROAS de ${roas.toFixed(1)}x nos últimos 7 dias. Considere duplicá-la para: ${otherPlatforms.join(', ')}.`,
            type: 'INFO',
            metadata: {
              action: 'cross_platform_suggestion',
              campaignId: campaign.id,
              campaignName: campaign.name,
              sourcePlatform: campaign.platformType,
              targetPlatforms: otherPlatforms,
              roas,
              spend: Math.round(spend * 100) / 100,
            },
          });
        }
      }
    }
  }

  /**
   * Duplicate a campaign to another platform (creates a DRAFT).
   */
  async duplicateCampaign(userId: string, data: {
    sourceCampaignId: string;
    targetPlatformId: string;
  }) {
    const sourceCampaign = await prisma.campaign.findFirst({
      where: { id: data.sourceCampaignId, platform: { userId } },
      include: { platform: true },
    });

    if (!sourceCampaign) throw new Error('Campanha de origem não encontrada');

    const targetPlatform = await prisma.platform.findFirst({
      where: { id: data.targetPlatformId, userId },
    });

    if (!targetPlatform) throw new Error('Plataforma de destino não encontrada');

    // Create draft campaign on target platform
    const draft = await prisma.campaign.create({
      data: {
        name: `[Cópia] ${sourceCampaign.name}`,
        status: 'DRAFT',
        platformType: targetPlatform.type,
        platformId: targetPlatform.id,
        dailyBudget: sourceCampaign.dailyBudget,
        lifetimeBudget: sourceCampaign.lifetimeBudget,
        currency: sourceCampaign.currency,
        draftData: {
          duplicatedFrom: {
            campaignId: sourceCampaign.id,
            campaignName: sourceCampaign.name,
            platformType: sourceCampaign.platformType,
          },
          originalBudget: sourceCampaign.dailyBudget,
        },
      },
    });

    await notificationsService.createNotification(userId, {
      title: `Campanha duplicada como rascunho`,
      message: `"${sourceCampaign.name}" foi duplicada para ${targetPlatform.type} como rascunho. Edite e publique quando estiver pronta.`,
      type: 'SUCCESS',
      metadata: { action: 'campaign_duplicated', sourceId: sourceCampaign.id, draftId: draft.id },
    });

    return draft;
  }
}

export const crossPlatformService = new CrossPlatformService();
