import { AIProvider, AIActionType, AIActionStatus } from '@prisma/client';
import { prisma } from '../../config/database';
import { env } from '../../config/env';
import { IAIProvider } from './providers/base.provider';
import { ClaudeProvider } from './providers/claude.provider';
import { OpenAIProvider } from './providers/openai.provider';
import { buildSystemPrompt, buildCampaignFocusContext, buildClientBriefingPrompt, buildAutomationSuggestPrompt } from './ai.prompts';
import { campaignsService } from '../campaigns/campaigns.service';
import { logger } from '../../utils/logger';
import { NotFoundError, ServiceUnavailableError } from '../../utils/errors';
import type { ChatMessageInput } from './ai.schemas';

export class AIService {
  private providers: Map<string, IAIProvider> = new Map();
  // Cache: userId -> { data, timestamp }
  private contextCache: Map<string, { data: any; timestamp: number }> = new Map();
  private static CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private static MAX_HISTORY_MESSAGES = 12; // last 6 pairs (user+assistant)

  constructor() {
    if (env.ANTHROPIC_API_KEY) {
      this.providers.set('CLAUDE', new ClaudeProvider());
    }
    if (env.OPENAI_API_KEY) {
      this.providers.set('OPENAI', new OpenAIProvider());
    }
  }

  private getProvider(provider?: string): IAIProvider {
    const name = provider || env.AI_DEFAULT_PROVIDER;
    const p = this.providers.get(name);
    if (!p) {
      throw new ServiceUnavailableError(
        `Provedor de IA "${name}" nao configurado. Verifique as variaveis de ambiente.`
      );
    }
    return p;
  }

  async chat(userId: string, input: ChatMessageInput) {
    const provider = this.getProvider(input.provider);

    // Get or create conversation
    let conversation;
    if (input.conversationId) {
      conversation = await prisma.aIConversation.findFirst({
        where: { id: input.conversationId, userId },
        include: {
          messages: {
            orderBy: { createdAt: 'desc' },
            take: AIService.MAX_HISTORY_MESSAGES,
          },
        },
      });
      // Reverse back to chronological order
      if (conversation) {
        conversation.messages.reverse();
      }
      if (!conversation) {
        throw new NotFoundError('Conversa nao encontrada');
      }
    } else {
      conversation = await prisma.aIConversation.create({
        data: {
          userId,
          provider: (input.provider || env.AI_DEFAULT_PROVIDER) as AIProvider,
          title: input.message.slice(0, 100),
        },
        include: { messages: true },
      });
    }

    // Save user message
    await prisma.aIMessage.create({
      data: {
        conversationId: conversation.id,
        role: 'user',
        content: input.message,
      },
    });

    // Gather context data (cached for 5 min to avoid redundant DB queries)
    const context = await this.getCachedContext(userId);
    let systemPrompt = buildSystemPrompt(context);

    // Only load campaign focus if message actually references a campaign ID/URL
    const campaignFocusContext = await this.detectAndLoadCampaign(input.message, userId);
    if (campaignFocusContext) {
      systemPrompt += campaignFocusContext;
    }

    // Build messages history - limit to last N messages to control token usage
    const allMessages = [
      ...conversation.messages.map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
      { role: 'user' as const, content: input.message },
    ];
    const messages = allMessages.length > AIService.MAX_HISTORY_MESSAGES
      ? allMessages.slice(-AIService.MAX_HISTORY_MESSAGES)
      : allMessages;

    // Call AI provider
    const response = await provider.chat(messages, systemPrompt);

    // Parse actions from response
    const { text, actions } = this.parseResponse(response.content);

    // Save assistant message
    const assistantMessage = await prisma.aIMessage.create({
      data: {
        conversationId: conversation.id,
        role: 'assistant',
        content: text,
        structuredData: actions.length > 0 ? { actions } : undefined,
      },
    });

    // Save actions to database
    const savedActions = [];
    for (const action of actions) {
      const saved = await prisma.aIAction.create({
        data: {
          conversationId: conversation.id,
          type: action.type as AIActionType,
          campaignId: action.campaignId || null,
          parameters: action.parameters || {},
          reason: action.reason || null,
        },
      });
      savedActions.push(saved);
    }

    // Update conversation title if it's the first message
    if (conversation.messages.length === 0) {
      await prisma.aIConversation.update({
        where: { id: conversation.id },
        data: { title: input.message.slice(0, 100) },
      });
    }

    return {
      conversationId: conversation.id,
      message: {
        id: assistantMessage.id,
        role: 'assistant',
        content: text,
        createdAt: assistantMessage.createdAt,
      },
      actions: savedActions,
    };
  }

  async getConversations(userId: string) {
    return prisma.aIConversation.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        _count: { select: { messages: true, actions: true } },
      },
    });
  }

  async getConversation(conversationId: string, userId: string) {
    const conversation = await prisma.aIConversation.findFirst({
      where: { id: conversationId, userId },
      include: {
        messages: { orderBy: { createdAt: 'asc' } },
        actions: { orderBy: { createdAt: 'asc' } },
      },
    });
    if (!conversation) {
      throw new NotFoundError('Conversa nao encontrada');
    }
    return conversation;
  }

  async getPendingActions(userId: string) {
    return prisma.aIAction.findMany({
      where: {
        status: 'PENDING',
        conversation: { userId },
      },
      include: {
        conversation: {
          select: { id: true, title: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async approveAction(actionId: string, userId: string) {
    const action = await prisma.aIAction.findFirst({
      where: {
        id: actionId,
        status: 'PENDING',
        conversation: { userId },
      },
    });

    if (!action) {
      throw new NotFoundError('Acao nao encontrada ou ja processada');
    }

    // Update status to APPROVED
    await prisma.aIAction.update({
      where: { id: actionId },
      data: { status: 'APPROVED' },
    });

    // Execute the action
    try {
      await this.executeAction(action, userId);
      return prisma.aIAction.update({
        where: { id: actionId },
        data: {
          status: 'EXECUTED',
          executedAt: new Date(),
        },
      });
    } catch (error: any) {
      return prisma.aIAction.update({
        where: { id: actionId },
        data: {
          status: 'FAILED',
          error: error.message,
        },
      });
    }
  }

  async rejectAction(actionId: string, userId: string) {
    const action = await prisma.aIAction.findFirst({
      where: {
        id: actionId,
        status: 'PENDING',
        conversation: { userId },
      },
    });

    if (!action) {
      throw new NotFoundError('Acao nao encontrada ou ja processada');
    }

    return prisma.aIAction.update({
      where: { id: actionId },
      data: { status: 'REJECTED' },
    });
  }

  async bulkApprove(actionIds: string[], userId: string) {
    const results = await Promise.allSettled(
      actionIds.map((id) => this.approveAction(id, userId))
    );

    const successful = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected').length;

    return { total: actionIds.length, successful, failed };
  }

  /**
   * Detect campaign URLs or IDs in user message and load campaign context
   */
  private async detectAndLoadCampaign(message: string, userId: string): Promise<string | null> {
    // Match patterns like /campaigns/ID, campaigns/ID, or standalone CUID-like IDs
    const patterns = [
      /\/campaigns\/([a-z0-9]+)/i,
      /campaigns\/([a-z0-9]+)/i,
      /\b(cm[a-z0-9]{20,30})\b/i, // CUID pattern (starts with 'c', ~25 chars)
    ];

    for (const pattern of patterns) {
      const match = message.match(pattern);
      if (match && match[1]) {
        const campaignId = match[1];
        try {
          const campaign = await campaignsService.getCampaignById(campaignId, userId);
          if (campaign) {
            logger.info(`AI: Detected campaign reference: ${campaignId} -> ${campaign.name}`);
            return buildCampaignFocusContext(campaign);
          }
        } catch {
          // Campaign not found, continue checking other patterns
          logger.debug(`AI: Campaign ID ${campaignId} not found for user`);
        }
      }
    }

    return null;
  }

  private async executeAction(action: any, userId: string) {
    const params = (action.parameters as any) || {};

    switch (action.type) {
      case 'CREATE_CAMPAIGN': {
        let platformId = params.platformId;
        if (!platformId) {
          const platforms = await prisma.platform.findMany({
            where: { userId, isConnected: true },
            take: 1,
          });
          if (platforms.length === 0) throw new Error('Nenhuma plataforma conectada');
          platformId = platforms[0].id;
        }
        await campaignsService.createCampaign(userId, platformId, {
          name: params.name || 'Nova Campanha',
          objective: params.objective || 'OUTCOME_TRAFFIC',
          dailyBudget: params.dailyBudget,
          targeting: params.targeting,
        });
        break;
      }

      case 'PAUSE_CAMPAIGN':
        if (!action.campaignId) throw new Error('Campaign ID nao especificado na acao');
        await campaignsService.updateCampaignStatus(action.campaignId, userId, {
          status: 'PAUSED',
        });
        break;

      case 'ACTIVATE_CAMPAIGN':
        if (!action.campaignId) throw new Error('Campaign ID nao especificado na acao');
        await campaignsService.updateCampaignStatus(action.campaignId, userId, {
          status: 'ACTIVE',
        });
        break;

      case 'UPDATE_BUDGET':
        if (!action.campaignId) throw new Error('Campaign ID nao especificado na acao');
        await campaignsService.updateCampaignBudget(action.campaignId, userId, {
          dailyBudget: params.dailyBudget,
          lifetimeBudget: params.lifetimeBudget,
        });
        break;

      default:
        throw new Error(`Tipo de acao desconhecido: ${action.type}`);
    }
  }

  private parseResponse(content: string): {
    text: string;
    actions: Array<{
      type: string;
      campaignId?: string;
      parameters?: any;
      reason?: string;
    }>;
  } {
    const actionsMatch = content.match(/<actions>([\s\S]*?)<\/actions>/);

    let text = content;
    let actions: any[] = [];

    if (actionsMatch) {
      text = content.replace(/<actions>[\s\S]*?<\/actions>/, '').trim();
      try {
        actions = JSON.parse(actionsMatch[1]);
        if (!Array.isArray(actions)) {
          actions = [];
        }
      } catch {
        actions = [];
      }
    }

    return { text, actions };
  }

  /**
   * Generate a client briefing for a specific platform/account
   */
  async generateClientBriefing(
    userId: string,
    params: { platformId: string; startDate: Date; endDate: Date }
  ) {
    const provider = this.getProvider();

    // Get platform info
    const platform = await prisma.platform.findFirst({
      where: { id: params.platformId, userId },
    });

    if (!platform) {
      throw new NotFoundError('Plataforma nao encontrada');
    }

    // Get campaigns with metrics for the period
    const campaigns = await prisma.campaign.findMany({
      where: {
        platformId: params.platformId,
        platform: { userId },
      },
      include: {
        metrics: {
          where: {
            date: { gte: params.startDate, lte: params.endDate },
          },
        },
      },
    });

    // Aggregate per campaign
    const campaignsData = campaigns.map((c) => {
      const totalSpend = c.metrics.reduce((s, m) => s + m.spend, 0);
      const totalClicks = c.metrics.reduce((s, m) => s + Number(m.clicks), 0);
      const totalImpressions = c.metrics.reduce((s, m) => s + Number(m.impressions), 0);
      const totalConversions = c.metrics.reduce((s, m) => s + m.conversions, 0);
      const totalRevenue = c.metrics.reduce((s, m) => s + m.revenue, 0);

      return {
        name: c.name,
        status: c.status,
        spend: Math.round(totalSpend * 100) / 100,
        clicks: totalClicks,
        impressions: totalImpressions,
        conversions: totalConversions,
        revenue: Math.round(totalRevenue * 100) / 100,
        ctr: totalImpressions > 0 ? Math.round((totalClicks / totalImpressions) * 10000) / 100 : 0,
        roas: totalSpend > 0 ? Math.round((totalRevenue / totalSpend) * 100) / 100 : 0,
      };
    }).filter((c) => c.spend > 0).sort((a, b) => b.spend - a.spend);

    // Overview
    const overview = {
      spend: campaignsData.reduce((s, c) => s + c.spend, 0),
      clicks: campaignsData.reduce((s, c) => s + c.clicks, 0),
      impressions: campaignsData.reduce((s, c) => s + c.impressions, 0),
      conversions: campaignsData.reduce((s, c) => s + c.conversions, 0),
      revenue: campaignsData.reduce((s, c) => s + c.revenue, 0),
    };

    // Build prompt
    const prompt = buildClientBriefingPrompt({
      platformName: platform.name,
      platformType: platform.type,
      period: {
        start: params.startDate.toLocaleDateString('pt-BR'),
        end: params.endDate.toLocaleDateString('pt-BR'),
      },
      campaigns: campaignsData,
      overview,
    });

    // Call AI
    const response = await provider.chat(
      [{ role: 'user', content: prompt }],
      'Voce e um gestor de trafego pago profissional. Responda em Portugues do Brasil.'
    );

    return {
      content: response.content,
      platformName: platform.name,
      campaignCount: campaignsData.length,
    };
  }

  /**
   * Suggest automation rules using AI based on campaign data
   */
  async suggestAutomationRules(userId: string) {
    const provider = this.getProvider();
    const context = await this.getCachedContext(userId);

    // Get existing rules
    const existingRules = await prisma.automationRule.findMany({
      where: { userId, status: { not: 'DELETED' } },
      select: { name: true, ruleType: true, metric: true, operator: true, value: true, actionType: true },
    });

    // Enrich campaigns with CPM
    const campaigns = context.activeCampaignsWithMetrics.map((c: any) => ({
      id: c.id,
      name: c.name,
      status: c.status,
      platformType: c.platformType,
      dailyBudget: c.dailyBudget,
      spend: c.totalSpend,
      clicks: c.totalClicks,
      impressions: c.totalImpressions,
      conversions: c.totalConversions,
      revenue: c.totalRevenue,
      ctr: c.avgCtr,
      cpc: c.avgCpc,
      cpm: c.totalImpressions > 0 ? (c.totalSpend / c.totalImpressions) * 1000 : 0,
      roas: c.avgRoas,
    }));

    const prompt = buildAutomationSuggestPrompt({
      campaigns,
      existingRules: existingRules.map((r) => ({
        name: r.name,
        ruleType: r.ruleType,
        metric: r.metric,
        operator: r.operator,
        value: r.value,
        actionType: r.actionType,
      })),
      metricsOverview: context.metricsOverview,
    });

    const response = await provider.chat(
      [{ role: 'user', content: prompt }],
      'Voce e um especialista em automacao de trafego pago. Retorne APENAS JSON array puro.'
    );

    // Parse JSON from response
    let suggestions: any[] = [];
    try {
      const jsonMatch = response.content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        suggestions = JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      logger.error('Failed to parse AI suggestions JSON:', e);
      suggestions = [];
    }

    // Validate and sanitize
    const validMetrics = ['ctr', 'cpc', 'cpm', 'roas', 'spend', 'conversions'];
    const validOperators = ['lt', 'gt', 'lte', 'gte', 'eq'];
    const validActions = ['pause', 'activate', 'increase_budget', 'decrease_budget', 'notify'];
    const validRuleTypes = ['simple', 'compound', 'scaling', 'anomaly', 'auto_restart'];
    const validApplyTo = ['all', 'active', 'paused', 'specific'];

    suggestions = suggestions
      .filter((s: any) => s && s.name && s.metric && s.operator && s.actionType && typeof s.value === 'number')
      .map((s: any) => ({
        name: String(s.name).slice(0, 100),
        description: String(s.description || '').slice(0, 300),
        reasoning: String(s.reasoning || '').slice(0, 500),
        ruleType: validRuleTypes.includes(s.ruleType) ? s.ruleType : 'simple',
        metric: validMetrics.includes(s.metric) ? s.metric : 'ctr',
        operator: validOperators.includes(s.operator) ? s.operator : 'lt',
        value: Number(s.value),
        periodDays: Number(s.periodDays) || 7,
        actionType: validActions.includes(s.actionType) ? s.actionType : 'notify',
        actionValue: s.actionValue != null ? Number(s.actionValue) : undefined,
        applyTo: validApplyTo.includes(s.applyTo) ? s.applyTo : 'all',
        config: s.config || undefined,
        conditions: s.conditions || undefined,
        conditionLogic: s.conditionLogic || undefined,
      }))
      .slice(0, 8);

    return {
      suggestions,
      campaignCount: campaigns.length,
      existingRulesCount: existingRules.length,
    };
  }

  private async getCachedContext(userId: string) {
    const cached = this.contextCache.get(userId);
    if (cached && Date.now() - cached.timestamp < AIService.CACHE_TTL) {
      return cached.data;
    }
    const data = await this.gatherUserContext(userId);
    this.contextCache.set(userId, { data, timestamp: Date.now() });
    return data;
  }

  private async gatherUserContext(userId: string) {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Get all campaigns with 30d metrics aggregated
    const allCampaigns = await prisma.campaign.findMany({
      where: {
        platform: { userId, isConnected: true },
      },
      include: {
        metrics: {
          where: { date: { gte: thirtyDaysAgo } },
        },
      },
    });

    // Aggregate metrics per campaign
    const campaignsWithAgg = allCampaigns.map((c) => {
      const totalSpend = c.metrics.reduce((s, m) => s + m.spend, 0);
      const totalClicks = c.metrics.reduce((s, m) => s + Number(m.clicks), 0);
      const totalImpressions = c.metrics.reduce((s, m) => s + Number(m.impressions), 0);
      const totalConversions = c.metrics.reduce((s, m) => s + m.conversions, 0);
      const totalRevenue = c.metrics.reduce((s, m) => s + m.revenue, 0);

      return {
        id: c.id,
        name: c.name,
        status: c.status,
        platformType: c.platformType,
        dailyBudget: c.dailyBudget,
        totalSpend: Math.round(totalSpend * 100) / 100,
        totalClicks,
        totalImpressions,
        totalConversions,
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        avgCtr: totalImpressions > 0 ? Math.round((totalClicks / totalImpressions) * 10000) / 100 : 0,
        avgCpc: totalClicks > 0 ? Math.round((totalSpend / totalClicks) * 100) / 100 : 0,
        avgRoas: totalSpend > 0 ? Math.round((totalRevenue / totalSpend) * 100) / 100 : 0,
        hasSpend: totalSpend > 0,
      };
    });

    // Separate campaigns
    const activeCampaignsWithMetrics = campaignsWithAgg
      .filter((c) => c.status === 'ACTIVE' && c.hasSpend)
      .sort((a, b) => b.totalSpend - a.totalSpend);

    const activeCampaignsNoMetrics = campaignsWithAgg
      .filter((c) => c.status === 'ACTIVE' && !c.hasSpend).length;

    const pausedCampaigns = campaignsWithAgg
      .filter((c) => c.status === 'PAUSED').length;

    // Overall metrics
    const metricsAgg = await prisma.metric.aggregate({
      where: {
        campaign: { platform: { userId } },
        date: { gte: thirtyDaysAgo, lte: now },
      },
      _sum: {
        spend: true,
        clicks: true,
        conversions: true,
        revenue: true,
        impressions: true,
      },
      _avg: {
        ctr: true,
        cpc: true,
        roas: true,
      },
    });

    // Platform-level aggregation
    const platformMap = new Map<string, any>();
    for (const c of campaignsWithAgg) {
      if (!c.hasSpend) continue;
      const existing = platformMap.get(c.platformType) || {
        platformType: c.platformType,
        spend: 0,
        clicks: 0,
        conversions: 0,
        revenue: 0,
      };
      existing.spend += c.totalSpend;
      existing.clicks += c.totalClicks;
      existing.conversions += c.totalConversions;
      existing.revenue += c.totalRevenue;
      platformMap.set(c.platformType, existing);
    }

    return {
      metricsOverview: {
        spend: metricsAgg._sum.spend || 0,
        impressions: Number(metricsAgg._sum.impressions || 0),
        clicks: Number(metricsAgg._sum.clicks || 0),
        conversions: metricsAgg._sum.conversions || 0,
        revenue: metricsAgg._sum.revenue || 0,
        ctr: metricsAgg._avg.ctr || 0,
        cpc: metricsAgg._avg.cpc || 0,
        roas: metricsAgg._avg.roas || 0,
      },
      activeCampaignsWithMetrics: activeCampaignsWithMetrics.slice(0, 10),
      activeCampaignsNoMetrics,
      pausedCampaigns,
      totalCampaigns: allCampaigns.length,
      platformSummary: Array.from(platformMap.values()),
    };
  }
}

export const aiService = new AIService();
