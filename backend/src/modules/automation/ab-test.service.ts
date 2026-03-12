import { prisma } from '../../config/database';
import { logger } from '../../utils/logger';
import { campaignsService } from '../campaigns/campaigns.service';
import { notificationsService } from '../notifications/notifications.service';
import { automationService } from './automation.service';

export class ABTestService {
  async getTests(userId: string) {
    return prisma.aBTest.findMany({
      where: { userId },
      orderBy: { startedAt: 'desc' },
    });
  }

  async getTestById(userId: string, testId: string) {
    const test = await prisma.aBTest.findFirst({
      where: { id: testId, userId },
    });
    if (!test) throw new Error('Teste A/B não encontrado');
    return test;
  }

  async createTest(userId: string, data: {
    name: string;
    campaignIds: string[];
    metric: string;
    evaluationDays?: number;
    totalDailyBudget?: number;
  }) {
    if (data.campaignIds.length < 2) {
      throw new Error('Selecione pelo menos 2 campanhas para o teste A/B');
    }

    // Verify campaigns belong to user
    const campaigns = await prisma.campaign.findMany({
      where: {
        id: { in: data.campaignIds },
        platform: { userId },
      },
    });

    if (campaigns.length !== data.campaignIds.length) {
      throw new Error('Uma ou mais campanhas não foram encontradas');
    }

    const evaluationDays = data.evaluationDays || 7;
    const evaluateAt = new Date(Date.now() + evaluationDays * 24 * 60 * 60 * 1000);

    // Distribute budget equally if totalDailyBudget is set
    if (data.totalDailyBudget) {
      const budgetPerCampaign = Math.round((data.totalDailyBudget / campaigns.length) * 100) / 100;
      for (const campaign of campaigns) {
        await campaignsService.updateCampaignBudget(campaign.id, userId, { dailyBudget: budgetPerCampaign });
      }
    }

    return prisma.aBTest.create({
      data: {
        userId,
        name: data.name,
        campaignIds: data.campaignIds,
        metric: data.metric,
        evaluationDays,
        totalDailyBudget: data.totalDailyBudget,
        evaluateAt,
      },
    });
  }

  async cancelTest(userId: string, testId: string) {
    const test = await prisma.aBTest.findFirst({
      where: { id: testId, userId },
    });
    if (!test) throw new Error('Teste A/B não encontrado');

    return prisma.aBTest.update({
      where: { id: testId },
      data: { status: 'CANCELLED', completedAt: new Date() },
    });
  }

  /**
   * Evaluate all A/B tests that are due - called by check-alerts job
   */
  async evaluateDueTests() {
    const dueTests = await prisma.aBTest.findMany({
      where: {
        status: 'RUNNING',
        evaluateAt: { lte: new Date() },
      },
    });

    for (const test of dueTests) {
      try {
        await this.evaluateTest(test);
      } catch (error: any) {
        logger.error(`A/B test ${test.id} evaluation failed:`, error.message);
      }
    }
  }

  private async evaluateTest(test: any) {
    const periodStart = new Date(test.startedAt);

    // Get metrics for all campaigns in the test
    const campaigns = await prisma.campaign.findMany({
      where: { id: { in: test.campaignIds } },
      include: {
        metrics: { where: { date: { gte: periodStart } } },
      },
    });

    // Calculate metric for each campaign
    const results = campaigns.map(c => {
      const metricValue = automationService.calculateMetric(test.metric, c.metrics);
      const spend = c.metrics.reduce((s: number, m: any) => s + m.spend, 0);
      return {
        campaignId: c.id,
        campaignName: c.name,
        metricValue: metricValue ?? 0,
        spend: Math.round(spend * 100) / 100,
      };
    });

    // Determine winner: highest metric value for 'roas', 'ctr', 'conversions'; lowest for 'cpc', 'cpm', 'spend'
    const lowerIsBetter = ['cpc', 'cpm', 'spend'].includes(test.metric);
    const sorted = [...results].sort((a, b) =>
      lowerIsBetter ? a.metricValue - b.metricValue : b.metricValue - a.metricValue
    );

    const winner = sorted[0];
    const losers = sorted.slice(1);

    // Pause losers
    for (const loser of losers) {
      try {
        await campaignsService.updateCampaignStatus(loser.campaignId, test.userId, { status: 'PAUSED' });
      } catch (error: any) {
        logger.warn(`Failed to pause loser campaign ${loser.campaignId}:`, error.message);
      }
    }

    // Reallocate budget to winner
    if (test.totalDailyBudget && winner) {
      try {
        await campaignsService.updateCampaignBudget(winner.campaignId, test.userId, { dailyBudget: test.totalDailyBudget });
      } catch (error: any) {
        logger.warn(`Failed to reallocate budget to winner:`, error.message);
      }
    }

    // Update test
    await prisma.aBTest.update({
      where: { id: test.id },
      data: {
        status: 'COMPLETED',
        winnerId: winner?.campaignId,
        results: { rankings: sorted, metric: test.metric },
        completedAt: new Date(),
      },
    });

    // Notify user
    await notificationsService.createNotification(test.userId, {
      title: `Teste A/B concluído: ${test.name}`,
      message: `Vencedor: "${winner?.campaignName}" (${test.metric}: ${winner?.metricValue.toFixed(2)}). ${losers.length} campanha(s) perdedora(s) pausada(s).`,
      type: 'SUCCESS',
      metadata: { action: 'ab_test_completed', testId: test.id, winnerId: winner?.campaignId, results: sorted },
    });
  }
}

export const abTestService = new ABTestService();
