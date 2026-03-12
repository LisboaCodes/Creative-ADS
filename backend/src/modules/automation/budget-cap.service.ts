import { prisma } from '../../config/database';
import { logger } from '../../utils/logger';
import { campaignsService } from '../campaigns/campaigns.service';
import { notificationsService } from '../notifications/notifications.service';

export class BudgetCapService {
  async getCaps(userId: string) {
    return prisma.platformBudgetCap.findMany({
      where: { userId },
      orderBy: { platformType: 'asc' },
    });
  }

  async upsertCap(userId: string, data: {
    platformType: string;
    dailyCapAmount?: number | null;
    weeklyCapAmount?: number | null;
    isActive?: boolean;
  }) {
    return prisma.platformBudgetCap.upsert({
      where: {
        userId_platformType: {
          userId,
          platformType: data.platformType as any,
        },
      },
      create: {
        userId,
        platformType: data.platformType as any,
        dailyCapAmount: data.dailyCapAmount,
        weeklyCapAmount: data.weeklyCapAmount,
        isActive: data.isActive ?? true,
      },
      update: {
        dailyCapAmount: data.dailyCapAmount,
        weeklyCapAmount: data.weeklyCapAmount,
        isActive: data.isActive,
      },
    });
  }

  async deleteCap(userId: string, capId: string) {
    const cap = await prisma.platformBudgetCap.findFirst({
      where: { id: capId, userId },
    });
    if (!cap) throw new Error('Budget cap não encontrado');

    await prisma.platformBudgetCap.delete({ where: { id: capId } });
    return { deleted: true };
  }

  /**
   * Check and enforce budget caps for a user - called by check-alerts job
   */
  async checkAndEnforceCaps(userId: string) {
    const caps = await prisma.platformBudgetCap.findMany({
      where: { userId, isActive: true },
    });

    if (caps.length === 0) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const startOfWeek = new Date(today);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay()); // Sunday

    for (const cap of caps) {
      try {
        // Reset daily spend if new day
        if (!cap.lastResetDay || cap.lastResetDay < today) {
          await prisma.platformBudgetCap.update({
            where: { id: cap.id },
            data: { currentDailySpend: 0, lastResetDay: today },
          });
          cap.currentDailySpend = 0;
        }

        // Reset weekly spend if new week
        if (!cap.lastResetWeek || cap.lastResetWeek < startOfWeek) {
          await prisma.platformBudgetCap.update({
            where: { id: cap.id },
            data: { currentWeeklySpend: 0, lastResetWeek: startOfWeek },
          });
          cap.currentWeeklySpend = 0;
        }

        // Calculate actual spend for today
        const todaySpend = await prisma.metric.aggregate({
          where: {
            date: { gte: today },
            campaign: {
              platformType: cap.platformType,
              platform: { userId, isConnected: true },
            },
          },
          _sum: { spend: true },
        });

        const dailySpend = todaySpend._sum.spend || 0;

        // Calculate actual spend for this week
        const weekSpend = await prisma.metric.aggregate({
          where: {
            date: { gte: startOfWeek },
            campaign: {
              platformType: cap.platformType,
              platform: { userId, isConnected: true },
            },
          },
          _sum: { spend: true },
        });

        const weeklySpend = weekSpend._sum.spend || 0;

        // Update tracked spend
        await prisma.platformBudgetCap.update({
          where: { id: cap.id },
          data: { currentDailySpend: dailySpend, currentWeeklySpend: weeklySpend },
        });

        // Check if daily cap exceeded
        const dailyExceeded = cap.dailyCapAmount && dailySpend > cap.dailyCapAmount;
        const weeklyExceeded = cap.weeklyCapAmount && weeklySpend > cap.weeklyCapAmount;

        if (dailyExceeded || weeklyExceeded) {
          await this.pauseWorstCampaigns(userId, cap.platformType, dailyExceeded ? 'daily' : 'weekly',
            dailyExceeded ? dailySpend : weeklySpend, dailyExceeded ? cap.dailyCapAmount! : cap.weeklyCapAmount!);
        }
      } catch (error: any) {
        logger.error(`Budget cap check failed for ${cap.platformType}:`, error.message);
      }
    }
  }

  private async pauseWorstCampaigns(userId: string, platformType: string, capType: string, currentSpend: number, capAmount: number) {
    // Get active campaigns for this platform, ordered by worst ROAS
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const campaigns = await prisma.campaign.findMany({
      where: {
        status: 'ACTIVE',
        platformType: platformType as any,
        platform: { userId, isConnected: true },
      },
      include: {
        metrics: { where: { date: { gte: sevenDaysAgo } } },
      },
    });

    // Sort by ROAS ascending (worst first)
    const ranked = campaigns.map(c => {
      const spend = c.metrics.reduce((s, m) => s + m.spend, 0);
      const revenue = c.metrics.reduce((s, m) => s + m.revenue, 0);
      const roas = spend > 0 ? revenue / spend : 0;
      return { campaign: c, spend, roas };
    }).sort((a, b) => a.roas - b.roas);

    // Pause worst campaigns until under cap
    let remaining = currentSpend;
    const paused: string[] = [];

    for (const { campaign, spend } of ranked) {
      if (remaining <= capAmount) break;

      await campaignsService.updateCampaignStatus(campaign.id, userId, { status: 'PAUSED' });
      await prisma.auditLog.create({
        data: {
          userId,
          entityType: 'campaign',
          entityId: campaign.id,
          action: 'status_changed',
          oldValue: { status: 'ACTIVE' },
          newValue: { status: 'PAUSED' },
          source: 'automation_rule',
          description: `Budget cap ${capType}: ${platformType} gastou R$${currentSpend.toFixed(2)} (limite: R$${capAmount.toFixed(2)})`,
        },
      });

      remaining -= spend;
      paused.push(campaign.name);
    }

    if (paused.length > 0) {
      await notificationsService.createNotification(userId, {
        title: `Limite de orçamento atingido: ${platformType}`,
        message: `${capType === 'daily' ? 'Diário' : 'Semanal'}: R$${currentSpend.toFixed(2)} / R$${capAmount.toFixed(2)}. ${paused.length} campanha(s) pausada(s): ${paused.join(', ')}`,
        type: 'WARNING',
        metadata: { action: 'budget_cap', platformType, capType, paused },
      });
    }
  }
}

export const budgetCapService = new BudgetCapService();
