import { prisma } from '../../config/database';
import { logger } from '../../utils/logger';
import { campaignsService } from '../campaigns/campaigns.service';
import { notificationsService } from '../notifications/notifications.service';

export class AutomationService {
  async getRules(userId: string) {
    return prisma.automationRule.findMany({
      where: { userId, status: { not: 'DELETED' } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createRule(userId: string, data: {
    name: string;
    description?: string;
    metric: string;
    operator: string;
    value: number;
    periodDays?: number;
    actionType: string;
    actionValue?: number;
    applyTo?: string;
    campaignIds?: string[];
    platformTypes?: string[];
  }) {
    return prisma.automationRule.create({
      data: {
        userId,
        name: data.name,
        description: data.description,
        metric: data.metric,
        operator: data.operator,
        value: data.value,
        periodDays: data.periodDays || 3,
        actionType: data.actionType,
        actionValue: data.actionValue,
        applyTo: data.applyTo || 'all',
        campaignIds: data.campaignIds || [],
        platformTypes: (data.platformTypes || []) as any,
      },
    });
  }

  async updateRule(userId: string, ruleId: string, data: Partial<{
    name: string;
    description: string;
    status: 'ACTIVE' | 'PAUSED' | 'DELETED';
    metric: string;
    operator: string;
    value: number;
    periodDays: number;
    actionType: string;
    actionValue: number;
    applyTo: string;
    campaignIds: string[];
  }>) {
    const rule = await prisma.automationRule.findFirst({
      where: { id: ruleId, userId },
    });
    if (!rule) throw new Error('Regra não encontrada');

    return prisma.automationRule.update({
      where: { id: ruleId },
      data: data as any,
    });
  }

  async deleteRule(userId: string, ruleId: string) {
    const rule = await prisma.automationRule.findFirst({
      where: { id: ruleId, userId },
    });
    if (!rule) throw new Error('Regra não encontrada');

    return prisma.automationRule.update({
      where: { id: ruleId },
      data: { status: 'DELETED' },
    });
  }

  /**
   * Execute all active rules for a user - called by check-alerts job
   */
  async executeRulesForUser(userId: string) {
    const rules = await prisma.automationRule.findMany({
      where: { userId, status: 'ACTIVE' },
    });

    if (rules.length === 0) return { executed: 0, triggered: 0 };

    let triggered = 0;

    for (const rule of rules) {
      try {
        const result = await this.evaluateRule(rule, userId);

        await prisma.automationRule.update({
          where: { id: rule.id },
          data: {
            lastRunAt: new Date(),
            ...(result.triggered ? {
              lastTriggeredAt: new Date(),
              triggerCount: { increment: 1 },
              executionLog: result,
            } : {}),
          },
        });

        if (result.triggered) triggered++;
      } catch (error: any) {
        logger.error(`Rule ${rule.id} execution failed:`, error.message);
      }
    }

    return { executed: rules.length, triggered };
  }

  private async evaluateRule(rule: any, userId: string) {
    const periodStart = new Date(Date.now() - rule.periodDays * 24 * 60 * 60 * 1000);

    // Get campaigns this rule applies to
    const where: any = {
      status: 'ACTIVE',
      platform: { userId, isConnected: true },
    };

    if (rule.applyTo === 'specific' && rule.campaignIds.length > 0) {
      where.id = { in: rule.campaignIds };
    }

    if (rule.platformTypes && rule.platformTypes.length > 0) {
      where.platformType = { in: rule.platformTypes };
    }

    const campaigns = await prisma.campaign.findMany({
      where,
      include: {
        metrics: { where: { date: { gte: periodStart } } },
      },
    });

    const triggeredCampaigns: string[] = [];

    for (const campaign of campaigns) {
      if (campaign.metrics.length === 0) continue;

      const totalSpend = campaign.metrics.reduce((s, m) => s + m.spend, 0);
      const totalClicks = campaign.metrics.reduce((s, m) => s + Number(m.clicks), 0);
      const totalImpressions = campaign.metrics.reduce((s, m) => s + Number(m.impressions), 0);
      const totalConversions = campaign.metrics.reduce((s, m) => s + m.conversions, 0);
      const totalRevenue = campaign.metrics.reduce((s, m) => s + m.revenue, 0);

      // Calculate the metric value
      let metricValue: number;
      switch (rule.metric) {
        case 'ctr': metricValue = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0; break;
        case 'cpc': metricValue = totalClicks > 0 ? totalSpend / totalClicks : 0; break;
        case 'cpm': metricValue = totalImpressions > 0 ? (totalSpend / totalImpressions) * 1000 : 0; break;
        case 'roas': metricValue = totalSpend > 0 ? totalRevenue / totalSpend : 0; break;
        case 'spend': metricValue = totalSpend; break;
        case 'conversions': metricValue = totalConversions; break;
        default: continue;
      }

      // Evaluate condition
      let conditionMet = false;
      switch (rule.operator) {
        case 'lt': conditionMet = metricValue < rule.value; break;
        case 'gt': conditionMet = metricValue > rule.value; break;
        case 'lte': conditionMet = metricValue <= rule.value; break;
        case 'gte': conditionMet = metricValue >= rule.value; break;
        case 'eq': conditionMet = Math.abs(metricValue - rule.value) < 0.01; break;
      }

      if (conditionMet) {
        triggeredCampaigns.push(campaign.id);
        await this.executeAction(rule, campaign, userId, metricValue);
      }
    }

    return {
      triggered: triggeredCampaigns.length > 0,
      campaignsEvaluated: campaigns.length,
      campaignsTriggered: triggeredCampaigns,
    };
  }

  private async executeAction(rule: any, campaign: any, userId: string, metricValue: number) {
    const description = `Regra "${rule.name}": ${rule.metric} = ${metricValue.toFixed(2)} (condição: ${rule.operator} ${rule.value})`;

    switch (rule.actionType) {
      case 'pause':
        await campaignsService.updateCampaignStatus(campaign.id, userId, { status: 'PAUSED' });
        await this.logAudit(userId, 'campaign', campaign.id, 'status_changed',
          { status: 'ACTIVE' }, { status: 'PAUSED' }, 'automation_rule', description);
        break;

      case 'activate':
        await campaignsService.updateCampaignStatus(campaign.id, userId, { status: 'ACTIVE' });
        await this.logAudit(userId, 'campaign', campaign.id, 'status_changed',
          { status: 'PAUSED' }, { status: 'ACTIVE' }, 'automation_rule', description);
        break;

      case 'increase_budget': {
        const pct = rule.actionValue || 20;
        const currentBudget = campaign.dailyBudget || 0;
        const newBudget = Math.round(currentBudget * (1 + pct / 100) * 100) / 100;
        if (currentBudget > 0) {
          await campaignsService.updateCampaignBudget(campaign.id, userId, { dailyBudget: newBudget });
          await this.logAudit(userId, 'campaign', campaign.id, 'budget_updated',
            { dailyBudget: currentBudget }, { dailyBudget: newBudget }, 'automation_rule', description);
        }
        break;
      }

      case 'decrease_budget': {
        const pct = rule.actionValue || 20;
        const currentBudget = campaign.dailyBudget || 0;
        const newBudget = Math.max(1, Math.round(currentBudget * (1 - pct / 100) * 100) / 100);
        if (currentBudget > 0) {
          await campaignsService.updateCampaignBudget(campaign.id, userId, { dailyBudget: newBudget });
          await this.logAudit(userId, 'campaign', campaign.id, 'budget_updated',
            { dailyBudget: currentBudget }, { dailyBudget: newBudget }, 'automation_rule', description);
        }
        break;
      }

      case 'notify':
        // Just notify, don't take action
        break;
    }

    // Always create a notification
    await notificationsService.createNotification(userId, {
      title: `Regra ativada: ${rule.name}`,
      message: `Campanha "${campaign.name}": ${description}. Ação: ${rule.actionType}`,
      type: rule.actionType === 'notify' ? 'INFO' : 'WARNING',
      metadata: { ruleId: rule.id, campaignId: campaign.id, action: rule.actionType },
    });
  }

  private async logAudit(
    userId: string, entityType: string, entityId: string,
    action: string, oldValue: any, newValue: any, source: string, description: string
  ) {
    await prisma.auditLog.create({
      data: { userId, entityType, entityId, action, oldValue, newValue, source, description },
    });
  }
}

export const automationService = new AutomationService();
