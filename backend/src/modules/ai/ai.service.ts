import { AIProvider, AIActionType, AIActionStatus } from '@prisma/client';
import { prisma } from '../../config/database';
import { env } from '../../config/env';
import { IAIProvider } from './providers/base.provider';
import { ClaudeProvider } from './providers/claude.provider';
import { OpenAIProvider } from './providers/openai.provider';
import { buildSystemPrompt } from './ai.prompts';
import { campaignsService } from '../campaigns/campaigns.service';
import type { ChatMessageInput } from './ai.schemas';

export class AIService {
  private providers: Map<string, IAIProvider> = new Map();

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
      throw new Error(
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
          messages: { orderBy: { createdAt: 'asc' } },
        },
      });
      if (!conversation) {
        throw new Error('Conversa nao encontrada');
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

    // Gather context data
    const context = await this.gatherUserContext(userId);
    const systemPrompt = buildSystemPrompt(context);

    // Build messages history
    const messages = [
      ...conversation.messages.map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
      { role: 'user' as const, content: input.message },
    ];

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
      throw new Error('Conversa nao encontrada');
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
      throw new Error('Acao nao encontrada ou ja processada');
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
      throw new Error('Acao nao encontrada ou ja processada');
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

  private async executeAction(action: any, userId: string) {
    if (!action.campaignId) {
      throw new Error('Campaign ID nao especificado na acao');
    }

    const params = (action.parameters as any) || {};

    switch (action.type) {
      case 'PAUSE_CAMPAIGN':
        await campaignsService.updateCampaignStatus(action.campaignId, userId, {
          status: 'PAUSED',
        });
        break;

      case 'ACTIVATE_CAMPAIGN':
        await campaignsService.updateCampaignStatus(action.campaignId, userId, {
          status: 'ACTIVE',
        });
        break;

      case 'UPDATE_BUDGET':
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

  private async gatherUserContext(userId: string) {
    // Get campaigns with metrics
    const campaignsData = await campaignsService.getCampaigns(userId, {
      limit: 50,
    });

    // Get overview metrics
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const metricsAgg = await prisma.metric.aggregate({
      where: {
        campaign: {
          platform: { userId },
        },
        date: {
          gte: thirtyDaysAgo,
          lte: now,
        },
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

    // Get by platform
    const platformMetrics = await prisma.metric.groupBy({
      by: ['campaignId'],
      where: {
        campaign: {
          platform: { userId },
        },
        date: {
          gte: thirtyDaysAgo,
          lte: now,
        },
      },
      _sum: {
        spend: true,
        clicks: true,
        conversions: true,
      },
    });

    // Map campaigns by platform for aggregation
    const campaignPlatformMap = new Map<string, string>();
    for (const c of campaignsData.campaigns) {
      campaignPlatformMap.set(c.id, c.platformType);
    }

    const platformSummary = new Map<string, any>();
    for (const pm of platformMetrics) {
      const platformType = campaignPlatformMap.get(pm.campaignId);
      if (!platformType) continue;

      const existing = platformSummary.get(platformType) || {
        platformType,
        spend: 0,
        clicks: 0,
        conversions: 0,
      };
      existing.spend += pm._sum.spend || 0;
      existing.clicks += Number(pm._sum.clicks || 0);
      existing.conversions += pm._sum.conversions || 0;
      platformSummary.set(platformType, existing);
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
      campaigns: campaignsData.campaigns,
      platformSummary: Array.from(platformSummary.values()),
    };
  }
}

export const aiService = new AIService();
