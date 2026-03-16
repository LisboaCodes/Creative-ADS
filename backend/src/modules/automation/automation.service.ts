import { prisma } from '../../config/database';
import { logger } from '../../utils/logger';
import { campaignsService } from '../campaigns/campaigns.service';
import { notificationsService } from '../notifications/notifications.service';
import { whatsAppNotificationsService } from '../whatsapp/whatsapp-notifications.service';
import { scheduledPauseQueue } from '../../config/queue';

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
    ruleType?: string;
    metric: string;
    operator: string;
    value: number;
    periodDays?: number;
    conditions?: any[];
    conditionLogic?: string;
    config?: any;
    actionType: string;
    actionValue?: number;
    webhookUrl?: string;
    webhookHeaders?: any;
    applyTo?: string;
    campaignIds?: string[];
    platformTypes?: string[];
  }) {
    return prisma.automationRule.create({
      data: {
        userId,
        name: data.name,
        description: data.description,
        ruleType: data.ruleType || 'simple',
        metric: data.metric,
        operator: data.operator,
        value: data.value,
        periodDays: data.periodDays || 3,
        conditions: data.conditions || undefined,
        conditionLogic: data.conditionLogic || undefined,
        config: data.config || undefined,
        actionType: data.actionType,
        actionValue: data.actionValue,
        webhookUrl: data.webhookUrl,
        webhookHeaders: data.webhookHeaders || undefined,
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
    ruleType: string;
    metric: string;
    operator: string;
    value: number;
    periodDays: number;
    conditions: any[];
    conditionLogic: string;
    config: any;
    actionType: string;
    actionValue: number;
    webhookUrl: string;
    webhookHeaders: any;
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

  // ─── Rule Evaluation Dispatcher ─────────────────────────────────

  private async evaluateRule(rule: any, userId: string) {
    switch (rule.ruleType) {
      case 'compound':
        return this.evaluateCompoundRule(rule, userId);
      case 'scaling':
        return this.evaluateScalingRule(rule, userId);
      case 'dayparting':
        return this.evaluateDaypartingRule(rule, userId);
      case 'anomaly':
        return this.evaluateAnomalyRule(rule, userId);
      case 'auto_restart':
        return this.evaluateAutoRestartRule(rule, userId);
      case 'simple':
      default:
        return this.evaluateSimpleRule(rule, userId);
    }
  }

  // ─── Simple Rule (original logic) ─────────────────────────────────

  private async evaluateSimpleRule(rule: any, userId: string) {
    const campaigns = await this.getCampaignsForRule(rule, userId);
    const triggeredCampaigns: string[] = [];

    for (const campaign of campaigns) {
      if (campaign.metrics.length === 0) continue;

      const metricValue = this.calculateMetric(rule.metric, campaign.metrics);
      if (metricValue === null) continue;

      if (this.compareValue(metricValue, rule.operator, rule.value)) {
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

  // ─── F3: Compound Rules (AND/OR) ─────────────────────────────────

  private async evaluateCompoundRule(rule: any, userId: string) {
    const conditions = (rule.conditions || []) as Array<{
      metric: string; operator: string; value: number; periodDays?: number;
    }>;
    const logic = rule.conditionLogic || 'AND';

    if (conditions.length === 0) {
      return { triggered: false, campaignsEvaluated: 0, campaignsTriggered: [] };
    }

    // Use the max periodDays across all conditions
    const maxPeriod = Math.max(...conditions.map(c => c.periodDays || rule.periodDays || 3));
    const periodStart = new Date(Date.now() - maxPeriod * 24 * 60 * 60 * 1000);

    const campaigns = await this.getCampaignsForRule(rule, userId, periodStart);
    const triggeredCampaigns: string[] = [];

    for (const campaign of campaigns) {
      if (campaign.metrics.length === 0) continue;

      const results = conditions.map(cond => {
        const condPeriodStart = new Date(Date.now() - (cond.periodDays || rule.periodDays || 3) * 24 * 60 * 60 * 1000);
        const filteredMetrics = campaign.metrics.filter((m: any) => m.date >= condPeriodStart);
        const val = this.calculateMetric(cond.metric, filteredMetrics);
        if (val === null) return false;
        return this.compareValue(val, cond.operator, cond.value);
      });

      const conditionMet = logic === 'AND'
        ? results.every(r => r)
        : results.some(r => r);

      if (conditionMet) {
        const primaryMetric = this.calculateMetric(conditions[0].metric, campaign.metrics);
        triggeredCampaigns.push(campaign.id);
        await this.executeAction(rule, campaign, userId, primaryMetric || 0);
      }
    }

    return {
      triggered: triggeredCampaigns.length > 0,
      campaignsEvaluated: campaigns.length,
      campaignsTriggered: triggeredCampaigns,
    };
  }

  // ─── F1: Smart Scaling ─────────────────────────────────

  private async evaluateScalingRule(rule: any, userId: string) {
    const config = (rule.config || {}) as {
      increasePercent?: number;
      maxBudget?: number;
      consecutiveDays?: number;
      cooldownHours?: number;
    };

    const pct = config.increasePercent || 20;
    const maxBudget = config.maxBudget || 10000;
    const consecutiveDays = config.consecutiveDays || 3;
    const cooldownHours = config.cooldownHours || 24;

    // Check cooldown
    if (rule.lastTriggeredAt) {
      const hoursSinceLastTrigger = (Date.now() - new Date(rule.lastTriggeredAt).getTime()) / (1000 * 60 * 60);
      if (hoursSinceLastTrigger < cooldownHours) {
        return { triggered: false, campaignsEvaluated: 0, campaignsTriggered: [], reason: 'cooldown' };
      }
    }

    const campaigns = await this.getCampaignsForRule(rule, userId);
    const triggeredCampaigns: string[] = [];

    for (const campaign of campaigns) {
      if (campaign.metrics.length === 0) continue;
      if (!campaign.dailyBudget || campaign.dailyBudget >= maxBudget) continue;

      // Check if metric condition is met for consecutiveDays in a row
      let streak = 0;
      const sortedMetrics = [...campaign.metrics].sort((a: any, b: any) =>
        new Date(b.date).getTime() - new Date(a.date).getTime()
      );

      // Group by day
      const dayGroups = new Map<string, any[]>();
      for (const m of sortedMetrics) {
        const dayKey = new Date(m.date).toISOString().slice(0, 10);
        if (!dayGroups.has(dayKey)) dayGroups.set(dayKey, []);
        dayGroups.get(dayKey)!.push(m);
      }

      const days = Array.from(dayGroups.entries()).sort((a, b) => b[0].localeCompare(a[0]));

      for (const [, dayMetrics] of days) {
        const val = this.calculateMetric(rule.metric, dayMetrics);
        if (val !== null && this.compareValue(val, rule.operator, rule.value)) {
          streak++;
        } else {
          break;
        }
        if (streak >= consecutiveDays) break;
      }

      if (streak >= consecutiveDays) {
        const currentBudget = campaign.dailyBudget;
        const newBudget = Math.min(maxBudget, Math.round(currentBudget * (1 + pct / 100) * 100) / 100);

        if (newBudget > currentBudget) {
          await campaignsService.updateCampaignBudget(campaign.id, userId, { dailyBudget: newBudget });
          await this.logAudit(userId, 'campaign', campaign.id, 'budget_updated',
            { dailyBudget: currentBudget }, { dailyBudget: newBudget }, 'automation_rule',
            `Smart Scaling "${rule.name}": ${streak} dias consecutivos com ${rule.metric} ${rule.operator} ${rule.value}. Budget: R$${currentBudget} → R$${newBudget}`);
          triggeredCampaigns.push(campaign.id);

          await notificationsService.createNotification(userId, {
            title: `Smart Scaling: ${rule.name}`,
            message: `Campanha "${campaign.name}": budget aumentado de R$${currentBudget} para R$${newBudget} (${streak} dias consecutivos com boa performance)`,
            type: 'SUCCESS',
            metadata: { ruleId: rule.id, campaignId: campaign.id, action: 'smart_scaling' },
          });
        }
      }
    }

    return {
      triggered: triggeredCampaigns.length > 0,
      campaignsEvaluated: campaigns.length,
      campaignsTriggered: triggeredCampaigns,
    };
  }

  // ─── F4: Dayparting ─────────────────────────────────

  private async evaluateDaypartingRule(rule: any, userId: string) {
    const config = (rule.config || {}) as {
      timezone?: string;
      schedule?: Array<{ day: number; startHour: number; endHour: number; active: boolean }>;
    };

    const timezone = config.timezone || 'America/Sao_Paulo';
    const schedule = config.schedule || [];

    if (schedule.length === 0) {
      return { triggered: false, campaignsEvaluated: 0, campaignsTriggered: [] };
    }

    // Get current time in the configured timezone
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: 'numeric',
      hour12: false,
      weekday: 'short',
    });
    const parts = formatter.formatToParts(now);
    const currentHour = Number(parts.find(p => p.type === 'hour')?.value || 0);
    const dayName = parts.find(p => p.type === 'weekday')?.value || '';
    const dayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
    const currentDay = dayMap[dayName] ?? new Date().getDay();

    // Find today's schedule
    const todaySchedule = schedule.find(s => s.day === currentDay);
    const shouldBeActive = todaySchedule?.active &&
      currentHour >= todaySchedule.startHour &&
      currentHour < todaySchedule.endHour;

    // For dayparting, we also need to check PAUSED campaigns (to reactivate them)
    const campaigns = await this.getCampaignsForRule(rule, userId, undefined, true);
    const triggeredCampaigns: string[] = [];

    for (const campaign of campaigns) {
      const isActive = campaign.status === 'ACTIVE';

      if (shouldBeActive && !isActive) {
        // Should be active but is paused → activate
        await campaignsService.updateCampaignStatus(campaign.id, userId, { status: 'ACTIVE' });
        await this.logAudit(userId, 'campaign', campaign.id, 'status_changed',
          { status: 'PAUSED' }, { status: 'ACTIVE' }, 'automation_rule',
          `Dayparting "${rule.name}": ativando campanha (horário ativo: ${todaySchedule?.startHour}h-${todaySchedule?.endHour}h)`);
        triggeredCampaigns.push(campaign.id);
      } else if (!shouldBeActive && isActive) {
        // Should be paused but is active → pause
        await campaignsService.updateCampaignStatus(campaign.id, userId, { status: 'PAUSED' });
        await this.logAudit(userId, 'campaign', campaign.id, 'status_changed',
          { status: 'ACTIVE' }, { status: 'PAUSED' }, 'automation_rule',
          `Dayparting "${rule.name}": pausando campanha (fora do horário ativo)`);
        triggeredCampaigns.push(campaign.id);
      }
    }

    if (triggeredCampaigns.length > 0) {
      const action = shouldBeActive ? 'ativadas' : 'pausadas';
      await notificationsService.createNotification(userId, {
        title: `Dayparting: ${rule.name}`,
        message: `${triggeredCampaigns.length} campanha(s) ${action} pelo horário programado`,
        type: 'INFO',
        metadata: { ruleId: rule.id, action: 'dayparting', shouldBeActive },
      });
    }

    return {
      triggered: triggeredCampaigns.length > 0,
      campaignsEvaluated: campaigns.length,
      campaignsTriggered: triggeredCampaigns,
    };
  }

  // ─── F5: Anomaly Detection ─────────────────────────────────

  private async evaluateAnomalyRule(rule: any, userId: string) {
    const config = (rule.config || {}) as {
      referencePeriodDays?: number;
      deviationPercent?: number;
      direction?: 'up' | 'down' | 'both';
    };

    const refPeriod = config.referencePeriodDays || 30;
    const deviationPct = config.deviationPercent || 50;
    const direction = config.direction || 'both';

    const refStart = new Date(Date.now() - refPeriod * 24 * 60 * 60 * 1000);
    const recentStart = new Date(Date.now() - (rule.periodDays || 3) * 24 * 60 * 60 * 1000);

    const campaigns = await prisma.campaign.findMany({
      where: {
        status: 'ACTIVE',
        platform: { userId, isConnected: true },
        ...(rule.platformTypes?.length ? { platformType: { in: rule.platformTypes } } : {}),
      },
      include: {
        metrics: { where: { date: { gte: refStart } } },
      },
    });

    const triggeredCampaigns: string[] = [];

    for (const campaign of campaigns) {
      if (campaign.metrics.length < 5) continue;

      const refMetrics = campaign.metrics.filter(m => m.date < recentStart);
      const recentMetrics = campaign.metrics.filter(m => m.date >= recentStart);

      if (refMetrics.length === 0 || recentMetrics.length === 0) continue;

      const refValue = this.calculateMetric(rule.metric, refMetrics);
      const recentValue = this.calculateMetric(rule.metric, recentMetrics);

      if (refValue === null || recentValue === null || refValue === 0) continue;

      const deviationActual = ((recentValue - refValue) / refValue) * 100;
      const isAnomaly =
        (direction === 'up' && deviationActual > deviationPct) ||
        (direction === 'down' && deviationActual < -deviationPct) ||
        (direction === 'both' && Math.abs(deviationActual) > deviationPct);

      if (isAnomaly) {
        triggeredCampaigns.push(campaign.id);
        await this.executeAction(rule, campaign, userId, recentValue);

        await notificationsService.createNotification(userId, {
          title: `Anomalia detectada: ${rule.name}`,
          message: `Campanha "${campaign.name}": ${rule.metric} variou ${deviationActual > 0 ? '+' : ''}${deviationActual.toFixed(1)}% em relação à média (ref: ${refValue.toFixed(2)}, atual: ${recentValue.toFixed(2)})`,
          type: 'WARNING',
          metadata: { ruleId: rule.id, campaignId: campaign.id, deviation: deviationActual, action: 'anomaly_detection' },
        });
      }
    }

    return {
      triggered: triggeredCampaigns.length > 0,
      campaignsEvaluated: campaigns.length,
      campaignsTriggered: triggeredCampaigns,
    };
  }

  // ─── F6: Auto-Restart ─────────────────────────────────

  private async evaluateAutoRestartRule(rule: any, userId: string) {
    const config = (rule.config || {}) as {
      waitDays?: number;
      restartMetric?: string;
      restartOperator?: string;
      restartValue?: number;
    };

    const waitDays = config.waitDays || 3;
    const waitMs = waitDays * 24 * 60 * 60 * 1000;

    // Find campaigns paused by automation rules
    const pausedLogs = await prisma.auditLog.findMany({
      where: {
        userId,
        entityType: 'campaign',
        action: 'status_changed',
        source: 'automation_rule',
        newValue: { path: ['status'], equals: 'PAUSED' },
        createdAt: { lte: new Date(Date.now() - waitMs) },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    // Deduplicate by campaign ID (take latest pause per campaign)
    const campaignPauseMap = new Map<string, Date>();
    for (const log of pausedLogs) {
      if (!campaignPauseMap.has(log.entityId)) {
        campaignPauseMap.set(log.entityId, log.createdAt);
      }
    }

    const triggeredCampaigns: string[] = [];

    for (const [campaignId, pausedAt] of campaignPauseMap) {
      // Check campaign is still paused
      const campaign = await prisma.campaign.findFirst({
        where: { id: campaignId, status: 'PAUSED' },
        include: {
          platform: { select: { userId: true, isConnected: true } },
          metrics: {
            where: { date: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
          },
        },
      });

      if (!campaign || campaign.platform.userId !== userId || !campaign.platform.isConnected) continue;

      // If a restart condition is configured, evaluate it
      if (config.restartMetric && config.restartOperator && config.restartValue !== undefined) {
        if (campaign.metrics.length === 0) continue;
        const val = this.calculateMetric(config.restartMetric, campaign.metrics);
        if (val === null) continue;
        if (!this.compareValue(val, config.restartOperator, config.restartValue)) continue;
      }

      // Reactivate
      await campaignsService.updateCampaignStatus(campaignId, userId, { status: 'ACTIVE' });
      await this.logAudit(userId, 'campaign', campaignId, 'status_changed',
        { status: 'PAUSED' }, { status: 'ACTIVE' }, 'automation_rule',
        `Auto-Restart "${rule.name}": reativando após ${waitDays} dias de pausa (pausada em ${pausedAt.toLocaleDateString('pt-BR')})`);
      triggeredCampaigns.push(campaignId);

      await notificationsService.createNotification(userId, {
        title: `Auto-Restart: ${rule.name}`,
        message: `Campanha "${campaign.name || campaignId}" reativada após ${waitDays} dias de pausa`,
        type: 'SUCCESS',
        metadata: { ruleId: rule.id, campaignId, action: 'auto_restart' },
      });
    }

    return {
      triggered: triggeredCampaigns.length > 0,
      campaignsEvaluated: campaignPauseMap.size,
      campaignsTriggered: triggeredCampaigns,
    };
  }

  // ─── Helpers ─────────────────────────────────

  calculateMetric(metric: string, metrics: any[]): number | null {
    if (metrics.length === 0) return null;

    const totalSpend = metrics.reduce((s: number, m: any) => s + m.spend, 0);
    const totalClicks = metrics.reduce((s: number, m: any) => s + Number(m.clicks), 0);
    const totalImpressions = metrics.reduce((s: number, m: any) => s + Number(m.impressions), 0);
    const totalConversions = metrics.reduce((s: number, m: any) => s + m.conversions, 0);
    const totalRevenue = metrics.reduce((s: number, m: any) => s + m.revenue, 0);

    switch (metric) {
      case 'ctr': return totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
      case 'cpc': return totalClicks > 0 ? totalSpend / totalClicks : 0;
      case 'cpm': return totalImpressions > 0 ? (totalSpend / totalImpressions) * 1000 : 0;
      case 'roas': return totalSpend > 0 ? totalRevenue / totalSpend : 0;
      case 'spend': return totalSpend;
      case 'conversions': return totalConversions;
      default: return null;
    }
  }

  compareValue(metricValue: number, operator: string, threshold: number): boolean {
    switch (operator) {
      case 'lt': return metricValue < threshold;
      case 'gt': return metricValue > threshold;
      case 'lte': return metricValue <= threshold;
      case 'gte': return metricValue >= threshold;
      case 'eq': return Math.abs(metricValue - threshold) < 0.01;
      default: return false;
    }
  }

  private async getCampaignsForRule(rule: any, userId: string, periodStartOverride?: Date, includePaused?: boolean) {
    const periodStart = periodStartOverride || new Date(Date.now() - rule.periodDays * 24 * 60 * 60 * 1000);

    const where: any = {
      platform: { userId, isConnected: true },
    };

    if (includePaused) {
      where.status = { in: ['ACTIVE', 'PAUSED'] };
    } else {
      where.status = 'ACTIVE';
    }

    if (rule.applyTo === 'specific' && rule.campaignIds?.length > 0) {
      where.id = { in: rule.campaignIds };
    }

    if (rule.platformTypes && rule.platformTypes.length > 0) {
      where.platformType = { in: rule.platformTypes };
    }

    return prisma.campaign.findMany({
      where,
      include: {
        metrics: { where: { date: { gte: periodStart } } },
      },
    });
  }

  // ─── F10: Webhook Action + existing actions ─────────────────────────────────

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

      case 'webhook':
        await this.executeWebhookAction(rule, campaign, userId, metricValue);
        break;

      case 'notify':
        // Just notify, don't take action
        break;
    }

    // Always create a notification (except webhook which handles its own)
    if (rule.actionType !== 'webhook') {
      await notificationsService.createNotification(userId, {
        title: `Regra ativada: ${rule.name}`,
        message: `Campanha "${campaign.name}": ${description}. Ação: ${rule.actionType}`,
        type: rule.actionType === 'notify' ? 'INFO' : 'WARNING',
        metadata: { ruleId: rule.id, campaignId: campaign.id, action: rule.actionType },
      });
    }

    // WhatsApp notification (fire-and-forget)
    whatsAppNotificationsService.notifyGroups(userId, 'AUTOMATION_TRIGGERED', {
      rule: { name: rule.name },
      campaign: { name: campaign.name, platformId: campaign.platformId },
      action: rule.actionType,
      metricValue,
    }).catch(err => logger.warn('WhatsApp automation notification failed', err));
  }

  // ─── F10: Webhook execution ─────────────────────────────────

  private async executeWebhookAction(rule: any, campaign: any, userId: string, metricValue: number) {
    if (!rule.webhookUrl) {
      logger.warn(`Webhook rule ${rule.id} has no URL configured`);
      return;
    }

    // Basic SSRF protection: block private IPs
    try {
      const url = new URL(rule.webhookUrl);
      const hostname = url.hostname.toLowerCase();
      const blockedPatterns = ['localhost', '127.0.0.1', '0.0.0.0', '10.', '172.16.', '172.17.', '172.18.',
        '172.19.', '172.20.', '172.21.', '172.22.', '172.23.', '172.24.', '172.25.',
        '172.26.', '172.27.', '172.28.', '172.29.', '172.30.', '172.31.', '192.168.', '169.254.', '[::1]'];
      if (blockedPatterns.some(p => hostname.startsWith(p) || hostname === p)) {
        logger.warn(`Webhook blocked for SSRF: ${hostname}`);
        return;
      }
    } catch {
      logger.warn(`Invalid webhook URL: ${rule.webhookUrl}`);
      return;
    }

    const payload = {
      event: 'automation_rule_triggered',
      rule: { id: rule.id, name: rule.name, metric: rule.metric, operator: rule.operator, value: rule.value },
      campaign: { id: campaign.id, name: campaign.name, platformType: campaign.platformType },
      metricValue,
      timestamp: new Date().toISOString(),
    };

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(rule.webhookHeaders || {}),
    };

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(rule.webhookUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      await notificationsService.createNotification(userId, {
        title: `Webhook enviado: ${rule.name}`,
        message: `Campanha "${campaign.name}": webhook enviado (status ${response.status})`,
        type: response.ok ? 'SUCCESS' : 'WARNING',
        metadata: { ruleId: rule.id, campaignId: campaign.id, action: 'webhook', status: response.status },
      });
    } catch (error: any) {
      logger.error(`Webhook failed for rule ${rule.id}:`, error.message);
      await notificationsService.createNotification(userId, {
        title: `Webhook falhou: ${rule.name}`,
        message: `Campanha "${campaign.name}": erro ao enviar webhook - ${error.message}`,
        type: 'ERROR',
        metadata: { ruleId: rule.id, campaignId: campaign.id, action: 'webhook', error: error.message },
      });
    }
  }

  // ─── Campaign Schedules (Pause/Resume) ─────────────────────────────────

  async getSchedules(userId: string) {
    return prisma.campaignSchedule.findMany({
      where: { userId, status: { not: 'cancelled' } },
      include: { campaign: { select: { id: true, name: true, status: true, platformType: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createSchedule(userId: string, input: {
    campaignId: string;
    type: 'once' | 'recurring';
    pauseDuration: number; // minutes
    resumeDuration?: number; // minutes (recurring only)
    maxExecutions?: number;
  }) {
    // Validate campaign belongs to user and is active
    const campaign = await prisma.campaign.findFirst({
      where: {
        id: input.campaignId,
        platform: { userId },
        status: 'ACTIVE',
      },
      include: { platform: true },
    });

    if (!campaign) {
      throw new Error('Campanha não encontrada ou não está ativa');
    }

    // Check no active schedule already exists for this campaign
    const existing = await prisma.campaignSchedule.findFirst({
      where: {
        campaignId: input.campaignId,
        status: { in: ['active', 'paused_waiting'] },
      },
    });

    if (existing) {
      throw new Error('Já existe um agendamento ativo para esta campanha');
    }

    // Create schedule and immediately pause
    const schedule = await prisma.campaignSchedule.create({
      data: {
        userId,
        campaignId: input.campaignId,
        type: input.type,
        pauseDuration: input.pauseDuration,
        resumeDuration: input.type === 'recurring' ? input.resumeDuration : null,
        maxExecutions: input.maxExecutions || null,
        status: 'active',
      },
      include: { campaign: { select: { id: true, name: true, status: true, platformType: true } } },
    });

    // Immediately trigger pause via Bull job (no delay)
    await scheduledPauseQueue.add('pause-campaign', { scheduleId: schedule.id });

    return schedule;
  }

  async cancelSchedule(userId: string, scheduleId: string) {
    const schedule = await prisma.campaignSchedule.findFirst({
      where: { id: scheduleId, userId },
      include: { campaign: { include: { platform: true } } },
    });

    if (!schedule) {
      throw new Error('Agendamento não encontrado');
    }

    if (schedule.status === 'cancelled' || schedule.status === 'completed') {
      throw new Error('Agendamento já finalizado');
    }

    // Remove pending Bull job
    if (schedule.jobId) {
      try {
        const job = await scheduledPauseQueue.getJob(schedule.jobId);
        if (job) await job.remove();
      } catch (err: any) {
        logger.warn(`Failed to remove Bull job ${schedule.jobId}:`, err.message);
      }
    }

    // If campaign was paused by this schedule, reactivate it
    if (schedule.currentAction === 'paused') {
      try {
        await campaignsService.updateCampaignStatus(schedule.campaignId, userId, { status: 'ACTIVE' });
      } catch (err: any) {
        logger.warn(`Failed to reactivate campaign on schedule cancel:`, err.message);
      }
    }

    return prisma.campaignSchedule.update({
      where: { id: scheduleId },
      data: { status: 'cancelled', jobId: null, nextActionAt: null },
      include: { campaign: { select: { id: true, name: true, status: true, platformType: true } } },
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
