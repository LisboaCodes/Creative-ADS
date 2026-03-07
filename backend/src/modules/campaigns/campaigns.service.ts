import { CampaignStatus, Prisma, PlatformType } from '@prisma/client';
import { prisma } from '../../config/database';
import { cache } from '../../config/redis';
import { env } from '../../config/env';
import { logger } from '../../utils/logger';
import { NotFoundError, ValidationError, ServiceUnavailableError } from '../../utils/errors';
import { platformsService } from '../platforms/platforms.service';
import { facebookService } from '../platforms/integrations/facebook.service';
import { ClaudeProvider } from '../ai/providers/claude.provider';
import { OpenAIProvider } from '../ai/providers/openai.provider';
import type { IAIProvider } from '../ai/providers/base.provider';
import type { UpdateCampaignStatusInput, UpdateCampaignBudgetInput, ApplyTemplateInput } from './campaigns.schemas';
import { whatsAppNotificationsService } from '../whatsapp/whatsapp-notifications.service';

export class CampaignsService {
  /**
   * Get campaigns for a user with filters
   */
  async getCampaigns(
    userId: string,
    filters: {
      platformType?: string;
      status?: CampaignStatus;
      search?: string;
      platformId?: string;
      hasSpend?: string;
      page?: number;
      limit?: number;
    }
  ) {
    const { platformType, status, search, platformId, hasSpend, page = 1, limit = 20 } = filters;

    // Check cache first (60s TTL)
    const cacheKey = `campaigns:${userId}:${JSON.stringify(filters)}`;
    const cached = await cache.get(cacheKey);
    if (cached) return cached;

    const where: any = {
      platform: {
        userId,
        isConnected: true,
      },
    };

    if (platformId) {
      where.platformId = platformId;
    }

    if (platformType) {
      where.platformType = platformType as PlatformType;
    }

    if (status) {
      where.status = status;
    }

    if (search) {
      where.name = {
        contains: search,
        mode: 'insensitive',
      };
    }

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // Use groupBy aggregation instead of loading all metric rows (N+1 fix)
    const [campaigns, total, metricsAgg] = await Promise.all([
      prisma.campaign.findMany({
        where,
        include: {
          platform: {
            select: {
              id: true,
              type: true,
              name: true,
            },
          },
        },
      }),
      prisma.campaign.count({ where }),
      prisma.metric.groupBy({
        by: ['campaignId'],
        where: {
          date: { gte: thirtyDaysAgo },
          campaign: where,
        },
        _sum: {
          spend: true,
          clicks: true,
          impressions: true,
          conversions: true,
          revenue: true,
        },
      }),
    ]);

    // Build metrics lookup map from aggregated results
    const metricsMap = new Map(
      metricsAgg.map((agg) => [agg.campaignId, agg._sum])
    );

    // Build 30d aggregation from pre-computed sums (no per-row iteration)
    const campaignsWithAgg = campaigns.map((campaign) => {
      const sums = metricsMap.get(campaign.id);
      const totalSpend = sums?.spend || 0;
      const totalClicks = Number(sums?.clicks || 0);
      const totalImpressions = Number(sums?.impressions || 0);
      const totalConversions = sums?.conversions || 0;
      const totalRevenue = sums?.revenue || 0;
      const avgCtr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
      const avgCpc = totalClicks > 0 ? totalSpend / totalClicks : 0;
      const avgRoas = totalSpend > 0 ? totalRevenue / totalSpend : 0;

      return {
        ...campaign,
        aggregated30d: {
          totalSpend: Math.round(totalSpend * 100) / 100,
          totalClicks,
          totalImpressions,
          totalConversions,
          totalRevenue: Math.round(totalRevenue * 100) / 100,
          avgCtr: Math.round(avgCtr * 100) / 100,
          avgCpc: Math.round(avgCpc * 100) / 100,
          avgRoas: Math.round(avgRoas * 100) / 100,
          hasSpend: totalSpend > 0,
        },
      };
    });

    // Deduplicate campaigns by externalId (same campaign can appear under FACEBOOK and INSTAGRAM)
    const seen = new Map<string, typeof campaignsWithAgg[0]>();
    for (const c of campaignsWithAgg) {
      const key = c.externalId || c.id; // Drafts have no externalId, use id
      const existing = seen.get(key);
      if (!existing) {
        seen.set(key, c);
      } else {
        // Keep the one with more spend, merge metrics
        if (c.aggregated30d.totalSpend > existing.aggregated30d.totalSpend) {
          seen.set(key, c);
        }
      }
    }
    const dedupedCampaigns = Array.from(seen.values());

    // Count campaigns by status and spend (before hasSpend filter, for tab counts)
    const statusCounts: Record<string, number> = {};
    for (const c of dedupedCampaigns) {
      statusCounts[c.status] = (statusCounts[c.status] || 0) + 1;
    }
    const activeWithSpend = dedupedCampaigns.filter((c) => c.status === 'ACTIVE' && c.aggregated30d.hasSpend).length;
    const activeNoSpend = dedupedCampaigns.filter((c) => c.status === 'ACTIVE' && !c.aggregated30d.hasSpend).length;
    const withSpend = dedupedCampaigns.filter((c) => c.aggregated30d.hasSpend).length;
    const withoutSpend = dedupedCampaigns.filter((c) => !c.aggregated30d.hasSpend).length;

    // Apply hasSpend post-filter
    let filteredCampaigns = dedupedCampaigns;
    if (hasSpend === 'true') {
      filteredCampaigns = dedupedCampaigns.filter((c) => c.aggregated30d.hasSpend);
    } else if (hasSpend === 'false') {
      filteredCampaigns = dedupedCampaigns.filter((c) => !c.aggregated30d.hasSpend);
    }

    // Sort: ACTIVE first, then by spend desc, then PAUSED, then DRAFT, then ARCHIVED/DELETED
    const statusOrder: Record<string, number> = { ACTIVE: 0, PAUSED: 1, DRAFT: 2, ARCHIVED: 3, DELETED: 4 };
    filteredCampaigns.sort((a, b) => {
      const statusA = statusOrder[a.status] ?? 4;
      const statusB = statusOrder[b.status] ?? 4;
      if (statusA !== statusB) return statusA - statusB;
      // Within same status, sort by spend desc
      if (a.aggregated30d.hasSpend && !b.aggregated30d.hasSpend) return -1;
      if (!a.aggregated30d.hasSpend && b.aggregated30d.hasSpend) return 1;
      return b.aggregated30d.totalSpend - a.aggregated30d.totalSpend;
    });

    // Apply pagination after sorting
    const paginatedCampaigns = filteredCampaigns.slice((page - 1) * limit, page * limit);

    const result = {
      campaigns: paginatedCampaigns,
      pagination: {
        page,
        limit,
        total: filteredCampaigns.length,
        totalPages: Math.ceil(filteredCampaigns.length / limit),
      },
      summary: {
        withSpend,
        withoutSpend,
        activeWithSpend,
        activeNoSpend,
        statusCounts,
      },
    };

    // Cache for 60 seconds
    await cache.set(cacheKey, result, 60);

    return result;
  }

  /**
   * Get campaign by ID
   */
  async getCampaignById(campaignId: string, userId: string) {
    const campaign = await prisma.campaign.findFirst({
      where: {
        id: campaignId,
        platform: {
          userId,
        },
      },
      include: {
        platform: true,
        metrics: {
          orderBy: { date: 'desc' },
          take: 30, // Last 30 days
        },
        adCreatives: true,
        tags: true,
      },
    });

    if (!campaign) {
      throw new NotFoundError('Campanha não encontrada');
    }

    return campaign;
  }

  /**
   * Update campaign status
   */
  async updateCampaignStatus(
    campaignId: string,
    userId: string,
    data: UpdateCampaignStatusInput
  ) {
    const campaign = await prisma.campaign.findFirst({
      where: {
        id: campaignId,
        platform: {
          userId,
        },
      },
      include: { platform: true },
    });

    if (!campaign) {
      throw new NotFoundError('Campanha não encontrada');
    }

    // Update on platform via platform-agnostic service (skip for drafts)
    if ((data.status === 'ACTIVE' || data.status === 'PAUSED') && campaign.externalId) {
      const accessToken = await platformsService.getAccessToken(campaign.platformId);
      const service = platformsService.getServiceForType(campaign.platformType);
      await service.updateCampaignStatus(accessToken, campaign.externalId, data.status);
    }

    // Update in database
    const updated = await prisma.campaign.update({
      where: { id: campaignId },
      data: { status: data.status },
    });

    // Clear caches
    await cache.delPattern(`campaigns:${userId}:*`);
    this.invalidateAIContextCache(userId);

    // WhatsApp notification (fire-and-forget)
    whatsAppNotificationsService.notifyGroups(userId, 'STATUS_CHANGE', {
      campaign: { name: campaign.name, platformId: campaign.platformId, platformType: campaign.platformType },
      oldStatus: campaign.status,
      newStatus: data.status,
    }).catch(err => logger.warn('WhatsApp notification failed', err));

    return updated;
  }

  /**
   * Update campaign budget
   */
  async updateCampaignBudget(
    campaignId: string,
    userId: string,
    data: UpdateCampaignBudgetInput
  ) {
    const campaign = await prisma.campaign.findFirst({
      where: {
        id: campaignId,
        platform: {
          userId,
        },
      },
      include: { platform: true },
    });

    if (!campaign) {
      throw new NotFoundError('Campanha não encontrada');
    }

    if (!campaign.externalId) {
      throw new ValidationError('Não é possível atualizar orçamento de rascunho na plataforma');
    }

    // Update on platform via platform-agnostic service
    const accessToken = await platformsService.getAccessToken(campaign.platformId);
    const service = platformsService.getServiceForType(campaign.platformType);

    await service.updateCampaignBudget(accessToken, campaign.externalId, {
      daily: data.dailyBudget,
      lifetime: data.lifetimeBudget,
    });

    // Update in database
    const updated = await prisma.campaign.update({
      where: { id: campaignId },
      data: {
        dailyBudget: data.dailyBudget,
        lifetimeBudget: data.lifetimeBudget,
      },
    });

    // Clear caches
    await cache.delPattern(`campaigns:${userId}:*`);
    this.invalidateAIContextCache(userId);

    // WhatsApp notification (fire-and-forget)
    whatsAppNotificationsService.notifyGroups(userId, 'BUDGET_CHANGE', {
      campaign: { name: campaign.name, platformId: campaign.platformId, platformType: campaign.platformType },
      oldBudget: campaign.dailyBudget || 0,
      newBudget: data.dailyBudget || campaign.dailyBudget || 0,
    }).catch(err => logger.warn('WhatsApp notification failed', err));

    return updated;
  }

  /**
   * Invalidate AI context cache for a user so AI uses fresh data
   */
  private invalidateAIContextCache(userId: string) {
    try {
      const { aiService } = require('../ai/ai.service');
      if (aiService && (aiService as any).contextCache) {
        (aiService as any).contextCache.delete(userId);
        logger.debug(`AI context cache invalidated for user ${userId}`);
      }
    } catch {
      // AI service not available, ignore
    }
  }

  /**
   * Create a new campaign on a platform (or save as draft)
   */
  async createCampaign(
    userId: string,
    platformId: string,
    data: {
      name: string;
      objective: string;
      dailyBudget?: number;
      lifetimeBudget?: number;
      startDate?: string;
      endDate?: string;
      saveAsDraft?: boolean;
      targeting?: any;
      creative?: {
        pageId: string;
        message?: string;
        headline?: string;
        description?: string;
        linkUrl?: string;
        callToAction?: string;
        imageUrl?: string;
        imageHash?: string;
        useExistingPost?: boolean;
        postId?: string;
      };
    }
  ) {
    // Verify platform belongs to user
    const platform = await prisma.platform.findFirst({
      where: { id: platformId, userId },
    });

    if (!platform || !platform.isConnected) {
      throw new NotFoundError('Plataforma não encontrada ou não conectada');
    }

    // ─── DRAFT MODE: save locally without calling platform API ───
    if (data.saveAsDraft) {
      const dbCampaign = await prisma.$transaction(async (tx) => {
        const campaign = await tx.campaign.create({
          data: {
            platformId: platform.id,
            externalId: null,
            name: data.name,
            status: 'DRAFT',
            dailyBudget: data.dailyBudget,
            lifetimeBudget: data.lifetimeBudget,
            currency: 'BRL',
            startDate: data.startDate ? new Date(data.startDate) : undefined,
            endDate: data.endDate ? new Date(data.endDate) : undefined,
            platformType: platform.type,
            draftData: {
              objective: data.objective,
              targeting: data.targeting,
              creative: data.creative,
            },
          },
        });

        await tx.auditLog.create({
          data: {
            userId,
            entityType: 'campaign',
            entityId: campaign.id,
            action: 'DRAFT_CREATED',
            newValue: { name: data.name, objective: data.objective },
            source: 'manual',
            description: `Rascunho "${data.name}" salvo`,
          },
        });

        return campaign;
      });

      await cache.delPattern(`campaigns:${userId}:*`);

      return {
        campaign: dbCampaign,
        externalIds: { campaignId: null, adSetId: undefined, adId: undefined },
      };
    }

    // ─── PUBLISH MODE: create on platform ───
    const accessToken = await platformsService.getAccessToken(platformId);

    // All steps in a try block - if any external API call fails, we clean up
    let campaignResult: { id: string };
    let adSetId: string | undefined;
    let adId: string | undefined;

    // Step 1: Create campaign on the platform
    campaignResult = await facebookService.createCampaign(accessToken, platform.externalId, {
      name: data.name,
      objective: data.objective,
      dailyBudget: data.dailyBudget,
      lifetimeBudget: data.lifetimeBudget,
      status: 'PAUSED', // Always start paused for safety
    });

    try {
      // Step 2: Create ad set with targeting
      if (data.targeting) {
        const adSetResult = await facebookService.createAdSet(accessToken, {
          name: `${data.name} - Conjunto`,
          campaignId: campaignResult.id,
          targeting: data.targeting,
          dailyBudget: data.dailyBudget,
          startTime: data.startDate,
          endTime: data.endDate,
        });
        adSetId = adSetResult.id;
      }

      // Step 3: Create creative and ad
      if (data.creative && adSetId) {
        const creativeResult = await facebookService.createAdCreative(
          accessToken,
          platform.externalId,
          {
            name: `${data.name} - Criativo`,
            pageId: data.creative.pageId,
            message: data.creative.message,
            headline: data.creative.headline,
            description: data.creative.description,
            linkUrl: data.creative.linkUrl,
            callToAction: data.creative.callToAction,
            imageHash: data.creative.imageHash,
          }
        );

        const adResult = await facebookService.createAd(accessToken, {
          name: `${data.name} - Anúncio`,
          adSetId,
          creativeId: creativeResult.id,
          status: 'PAUSED',
        });
        adId = adResult.id;
      }
    } catch (error: any) {
      // If ad set or creative creation fails, the campaign still exists on the platform
      // Log but don't prevent saving the campaign to our DB
      logger.warn(`Partial campaign creation for ${campaignResult.id}: ${error.message}`);
    }

    // Step 4: Save campaign to our database (atomic with Prisma transaction)
    const dbCampaign = await prisma.$transaction(async (tx) => {
      const campaign = await tx.campaign.create({
        data: {
          platformId: platform.id,
          externalId: campaignResult.id,
          name: data.name,
          status: 'PAUSED',
          dailyBudget: data.dailyBudget,
          lifetimeBudget: data.lifetimeBudget,
          currency: 'BRL',
          startDate: data.startDate ? new Date(data.startDate) : undefined,
          endDate: data.endDate ? new Date(data.endDate) : undefined,
          platformType: platform.type,
        },
      });

      // Create audit log entry
      await tx.auditLog.create({
        data: {
          userId,
          entityType: 'campaign',
          entityId: campaign.id,
          action: 'CREATE',
          newValue: { name: data.name, objective: data.objective, adSetId, adId },
          source: 'manual',
          description: `Campanha "${data.name}" criada`,
        },
      });

      return campaign;
    });

    // Clear caches (campaigns + AI context)
    await cache.delPattern(`campaigns:${userId}:*`);
    this.invalidateAIContextCache(userId);

    // WhatsApp notification (fire-and-forget)
    whatsAppNotificationsService.notifyGroups(userId, 'CAMPAIGN_CREATED', {
      campaign: { name: data.name, platformId: platform.id, platformType: platform.type },
    }).catch(err => logger.warn('WhatsApp notification failed', err));

    return {
      campaign: dbCampaign,
      externalIds: {
        campaignId: campaignResult.id,
        adSetId,
        adId,
      },
    };
  }

  /**
   * Publish a draft campaign to the platform
   */
  async publishDraft(userId: string, campaignId: string) {
    const campaign = await prisma.campaign.findFirst({
      where: { id: campaignId, platform: { userId }, status: 'DRAFT' },
      include: { platform: true },
    });

    if (!campaign) {
      throw new NotFoundError('Rascunho não encontrado');
    }

    const draftData = campaign.draftData as any;
    if (!draftData) {
      throw new ValidationError('Dados do rascunho estão vazios');
    }

    const accessToken = await platformsService.getAccessToken(campaign.platformId);
    const service = platformsService.getServiceForType(campaign.platformType);

    // Create campaign on platform
    const campaignResult = await (service as any).createCampaign(
      accessToken,
      campaign.platform.externalId,
      {
        name: campaign.name,
        objective: draftData.objective,
        dailyBudget: campaign.dailyBudget,
        lifetimeBudget: campaign.lifetimeBudget,
        status: 'PAUSED',
      }
    );

    let adSetId: string | undefined;
    let adId: string | undefined;

    try {
      // Create ad set if targeting exists
      if (draftData.targeting) {
        const adSetResult = await facebookService.createAdSet(accessToken, {
          name: `${campaign.name} - Conjunto`,
          campaignId: campaignResult.id,
          targeting: draftData.targeting,
          dailyBudget: campaign.dailyBudget ?? undefined,
          startTime: campaign.startDate?.toISOString(),
          endTime: campaign.endDate?.toISOString(),
        });
        adSetId = adSetResult.id;
      }

      // Create creative and ad
      if (draftData.creative && adSetId) {
        const creativeResult = await facebookService.createAdCreative(
          accessToken,
          campaign.platform!.externalId,
          {
            name: `${campaign.name} - Criativo`,
            pageId: draftData.creative.pageId,
            message: draftData.creative.message,
            headline: draftData.creative.headline,
            description: draftData.creative.description,
            linkUrl: draftData.creative.linkUrl,
            callToAction: draftData.creative.callToAction,
            imageHash: draftData.creative.imageHash,
          }
        );

        const adResult = await facebookService.createAd(accessToken, {
          name: `${campaign.name} - Anúncio`,
          adSetId,
          creativeId: creativeResult.id,
          status: 'PAUSED',
        });
        adId = adResult.id;
      }
    } catch (error: any) {
      logger.warn(`Partial draft publish for ${campaignResult.id}: ${error.message}`);
    }

    // Update campaign in DB
    const updated = await prisma.$transaction(async (tx) => {
      const updatedCampaign = await tx.campaign.update({
        where: { id: campaignId },
        data: {
          externalId: campaignResult.id,
          status: 'PAUSED',
          draftData: Prisma.DbNull, // Clear draft data
        },
      });

      await tx.auditLog.create({
        data: {
          userId,
          entityType: 'campaign',
          entityId: campaignId,
          action: 'DRAFT_PUBLISHED',
          newValue: { externalId: campaignResult.id, adSetId, adId },
          source: 'manual',
          description: `Rascunho "${campaign.name}" publicado`,
        },
      });

      return updatedCampaign;
    });

    await cache.delPattern(`campaigns:${userId}:*`);
    this.invalidateAIContextCache(userId);

    // WhatsApp notification (fire-and-forget)
    whatsAppNotificationsService.notifyGroups(userId, 'CAMPAIGN_CREATED', {
      campaign: { name: campaign.name, platformId: campaign.platformId, platformType: campaign.platformType },
    }).catch(err => logger.warn('WhatsApp notification failed', err));

    return { campaign: updated, externalIds: { campaignId: campaignResult.id, adSetId, adId } };
  }

  /**
   * Update a draft campaign
   */
  async updateDraft(
    userId: string,
    campaignId: string,
    data: {
      name?: string;
      objective?: string;
      dailyBudget?: number;
      lifetimeBudget?: number;
      startDate?: string;
      endDate?: string;
      targeting?: any;
      creative?: any;
    }
  ) {
    const campaign = await prisma.campaign.findFirst({
      where: { id: campaignId, platform: { userId }, status: 'DRAFT' },
    });

    if (!campaign) {
      throw new NotFoundError('Rascunho não encontrado');
    }

    const currentDraftData = (campaign.draftData as any) || {};
    const updatedDraftData = {
      ...currentDraftData,
      ...(data.objective && { objective: data.objective }),
      ...(data.targeting && { targeting: data.targeting }),
      ...(data.creative && { creative: data.creative }),
    };

    const updated = await prisma.campaign.update({
      where: { id: campaignId },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.dailyBudget !== undefined && { dailyBudget: data.dailyBudget }),
        ...(data.lifetimeBudget !== undefined && { lifetimeBudget: data.lifetimeBudget }),
        ...(data.startDate && { startDate: new Date(data.startDate) }),
        ...(data.endDate && { endDate: new Date(data.endDate) }),
        draftData: updatedDraftData,
      },
    });

    await cache.delPattern(`campaigns:${userId}:*`);

    return updated;
  }

  /**
   * Apply a campaign template - creates full campaign structure on platform
   */
  async applyTemplate(userId: string, data: ApplyTemplateInput) {
    // 1. Fetch template
    const template = await prisma.campaignTemplate.findUnique({
      where: { id: data.templateId },
    });
    if (!template) {
      throw new NotFoundError('Template não encontrado');
    }

    // 2. Verify platform
    const platform = await prisma.platform.findFirst({
      where: { id: data.platformId, userId, isConnected: true },
    });
    if (!platform) {
      throw new NotFoundError('Plataforma não encontrada ou não conectada');
    }

    const accessToken = await platformsService.getAccessToken(data.platformId);
    const campaignSetup = template.campaignSetup as any;

    // 3. Create campaign on platform
    const campaignResult = await facebookService.createCampaign(
      accessToken,
      platform.externalId,
      {
        name: data.campaignName,
        objective: campaignSetup.optimizationGoal || 'OUTCOME_SALES',
        dailyBudget: data.budgetType === 'daily' ? data.budget : undefined,
        lifetimeBudget: data.budgetType === 'lifetime' ? data.budget : undefined,
        status: 'PAUSED',
      }
    );

    let adSetId: string | undefined;
    let adId: string | undefined;

    try {
      // 4. Create ad set with targeting
      const templateTargeting = (template.adSetSetup as any)?.targeting || {};
      const userTargeting = data.targeting || {};

      const targeting: any = {};
      if (userTargeting.geoLocations) {
        targeting.geoLocations = userTargeting.geoLocations;
      }
      if (userTargeting.ageMin || templateTargeting.ageMin) {
        targeting.ageMin = userTargeting.ageMin || templateTargeting.ageMin;
      }
      if (userTargeting.ageMax || templateTargeting.ageMax) {
        targeting.ageMax = userTargeting.ageMax || templateTargeting.ageMax;
      }
      if (userTargeting.genders?.length) {
        targeting.genders = userTargeting.genders;
      }
      if (userTargeting.interests?.length) {
        targeting.interests = userTargeting.interests;
      }

      const adSetResult = await facebookService.createAdSet(accessToken, {
        name: `${data.campaignName} - Conjunto`,
        campaignId: campaignResult.id,
        targeting,
        dailyBudget: data.budgetType === 'daily' ? data.budget : undefined,
      });
      adSetId = adSetResult.id;

      // 5. Create creative and ad if provided
      if (data.creative && data.pageId && adSetId) {
        const creativeResult = await facebookService.createAdCreative(
          accessToken,
          platform.externalId,
          {
            name: `${data.campaignName} - Criativo`,
            pageId: data.pageId,
            message: data.creative.primaryText,
            headline: data.creative.headline,
            description: data.creative.description,
            linkUrl: data.websiteUrl,
            callToAction: data.creative.cta,
            imageHash: data.creative.imageHash,
          }
        );

        const adResult = await facebookService.createAd(accessToken, {
          name: `${data.campaignName} - Anúncio`,
          adSetId,
          creativeId: creativeResult.id,
          status: 'PAUSED',
        });
        adId = adResult.id;
      }
    } catch (error: any) {
      logger.warn(`Partial template apply for ${campaignResult.id}: ${error.message}`);
    }

    // 6. Save to DB
    const dbCampaign = await prisma.$transaction(async (tx) => {
      const campaign = await tx.campaign.create({
        data: {
          platformId: platform.id,
          externalId: campaignResult.id,
          name: data.campaignName,
          status: 'PAUSED',
          dailyBudget: data.budgetType === 'daily' ? data.budget : undefined,
          lifetimeBudget: data.budgetType === 'lifetime' ? data.budget : undefined,
          currency: 'BRL',
          platformType: platform.type,
        },
      });

      await tx.auditLog.create({
        data: {
          userId,
          entityType: 'campaign',
          entityId: campaign.id,
          action: 'TEMPLATE_APPLIED',
          newValue: { templateId: data.templateId, templateName: template.name, adSetId, adId },
          source: 'manual',
          description: `Campanha "${data.campaignName}" criada a partir do template "${template.name}"`,
        },
      });

      return campaign;
    });

    await cache.delPattern(`campaigns:${userId}:*`);
    this.invalidateAIContextCache(userId);

    // WhatsApp notification (fire-and-forget)
    whatsAppNotificationsService.notifyGroups(userId, 'CAMPAIGN_CREATED', {
      campaign: { name: data.campaignName, platformId: platform.id, platformType: platform.type },
    }).catch(err => logger.warn('WhatsApp notification failed', err));

    return {
      campaign: dbCampaign,
      externalIds: { campaignId: campaignResult.id, adSetId, adId },
      template: { id: template.id, name: template.name },
    };
  }

  /**
   * Upload an ad image to the platform
   */
  async uploadAdImage(userId: string, platformId: string, imageBuffer: Buffer) {
    const platform = await prisma.platform.findFirst({
      where: { id: platformId, userId },
    });

    if (!platform || !platform.isConnected) {
      throw new NotFoundError('Plataforma não encontrada ou não conectada');
    }

    const accessToken = await platformsService.getAccessToken(platformId);
    const imageBase64 = imageBuffer.toString('base64');

    const result = await facebookService.uploadImage(accessToken, platform.externalId, imageBase64);
    return { imageHash: result.hash, imageUrl: result.url };
  }

  /**
   * Search targeting options (interests or geolocations)
   */
  async searchTargeting(userId: string, platformId: string, query: string, type?: string, locationTypes?: string) {
    const platform = await prisma.platform.findFirst({
      where: { id: platformId, userId },
    });

    if (!platform || !platform.isConnected) {
      throw new NotFoundError('Plataforma não encontrada ou não conectada');
    }

    const accessToken = await platformsService.getAccessToken(platformId);

    if (type === 'adgeolocation') {
      return facebookService.searchGeoLocations(accessToken, query, locationTypes || 'city');
    }

    return facebookService.getTargetingOptions(accessToken, query);
  }

  /**
   * Get AI suggestion with enriched user context
   */
  async getAISuggestion(
    userId: string,
    type: 'names' | 'audience' | 'budget' | 'copy',
    context: {
      campaignName?: string;
      objective?: string;
      platformId?: string;
      budgetType?: string;
      interests?: string[];
    }
  ) {
    // Gather user data for context
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const campaigns = await prisma.campaign.findMany({
      where: { platform: { userId, isConnected: true } },
      include: {
        metrics: { where: { date: { gte: thirtyDaysAgo } } },
      },
    });

    const campaignsWithAgg = campaigns.map((c) => {
      const totalSpend = c.metrics.reduce((s, m) => s + m.spend, 0);
      const totalClicks = c.metrics.reduce((s, m) => s + Number(m.clicks), 0);
      const totalImpressions = c.metrics.reduce((s, m) => s + Number(m.impressions), 0);
      const totalConversions = c.metrics.reduce((s, m) => s + m.conversions, 0);
      const totalRevenue = c.metrics.reduce((s, m) => s + m.revenue, 0);
      return {
        name: c.name,
        status: c.status,
        totalSpend: Math.round(totalSpend * 100) / 100,
        totalClicks,
        totalImpressions,
        totalConversions,
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        avgCtr: totalImpressions > 0 ? Math.round((totalClicks / totalImpressions) * 10000) / 100 : 0,
        avgCpc: totalClicks > 0 ? Math.round((totalSpend / totalClicks) * 100) / 100 : 0,
        avgRoas: totalSpend > 0 ? Math.round((totalRevenue / totalSpend) * 100) / 100 : 0,
      };
    });

    const activeCampaigns = campaignsWithAgg.filter((c) => c.totalSpend > 0);
    const topCampaigns = [...activeCampaigns].sort((a, b) => b.avgRoas - a.avgRoas).slice(0, 5);

    // Build type-specific prompt
    let prompt: string;

    switch (type) {
      case 'names': {
        const existingNames = campaigns.slice(0, 10).map((c) => c.name).join(', ');
        prompt = `Voce e um especialista em marketing digital. O usuario tem estas campanhas: ${existingNames || 'nenhuma ainda'}.
Sugira 5 nomes criativos para uma nova campanha${context.objective ? ` com objetivo "${context.objective}"` : ''}.
Responda APENAS em JSON valido, sem markdown, no formato:
{"names": ["Nome 1", "Nome 2", "Nome 3", "Nome 4", "Nome 5"]}`;
        break;
      }

      case 'audience': {
        const topAudiences = topCampaigns.map((c) => `${c.name} (ROAS: ${c.avgRoas}x, CTR: ${c.avgCtr}%)`).join('; ');
        prompt = `Voce e um especialista em segmentacao de publico para Facebook/Instagram Ads.
Campanhas de melhor performance do usuario: ${topAudiences || 'sem dados ainda'}.
Campanha atual: "${context.campaignName || 'Nova campanha'}", objetivo: ${context.objective || 'trafego'}.
Sugira 6 interesses de publico-alvo para segmentacao.
Responda APENAS em JSON valido, sem markdown, no formato:
{"interests": ["Interesse 1", "Interesse 2", "Interesse 3", "Interesse 4", "Interesse 5", "Interesse 6"]}`;
        break;
      }

      case 'budget': {
        const avgSpend = activeCampaigns.length > 0
          ? activeCampaigns.reduce((s, c) => s + c.totalSpend, 0) / activeCampaigns.length
          : 0;
        const avgCpc = activeCampaigns.length > 0
          ? activeCampaigns.reduce((s, c) => s + c.avgCpc, 0) / activeCampaigns.length
          : 0;
        prompt = `Voce e um especialista em orcamento de midia paga.
Dados reais do usuario (30 dias): gasto medio por campanha R$${avgSpend.toFixed(2)}, CPC medio R$${avgCpc.toFixed(2)}, ${activeCampaigns.length} campanhas ativas.
Nova campanha: "${context.campaignName || 'Nova campanha'}", objetivo: ${context.objective || 'trafego'}, tipo orcamento: ${context.budgetType || 'diario'}.
Sugira o orcamento ideal em Reais com justificativa curta.
Responda APENAS em JSON valido, sem markdown, no formato:
{"dailyBudget": 50.00, "justification": "Justificativa aqui"}`;
        break;
      }

      case 'copy': {
        const bestCreatives = topCampaigns.slice(0, 3).map((c) => c.name).join(', ');
        prompt = `Voce e um copywriter especialista em anuncios de Facebook/Instagram Ads.
Melhores campanhas do usuario: ${bestCreatives || 'sem dados'}.
Campanha: "${context.campaignName || 'Nova campanha'}", objetivo: ${context.objective || 'trafego'}.
Crie um anuncio completo. O texto principal deve ter no maximo 125 caracteres, titulo maximo 40 caracteres, descricao maximo 30 caracteres.
Responda APENAS em JSON valido, sem markdown, no formato:
{"message": "Texto principal aqui", "headline": "Titulo aqui", "description": "Descricao aqui"}`;
        break;
      }
    }

    // Get AI provider
    let provider: IAIProvider;
    if (env.ANTHROPIC_API_KEY) {
      provider = new ClaudeProvider();
    } else if (env.OPENAI_API_KEY) {
      provider = new OpenAIProvider();
    } else {
      throw new ServiceUnavailableError('Nenhum provedor de IA configurado');
    }

    const response = await provider.chat(
      [{ role: 'user', content: prompt }],
      'Responda APENAS em JSON valido, sem markdown. PT-BR.'
    );

    // Try to parse JSON from response
    try {
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return { raw: response.content };
    } catch {
      logger.warn('Failed to parse AI suggestion JSON, returning raw');
      return { raw: response.content };
    }
  }

  // ─── Tags ───────────────────────────────────────────────────────────

  async addTag(userId: string, campaignId: string, name: string, color?: string) {
    // Verify campaign belongs to user
    const campaign = await prisma.campaign.findFirst({
      where: { id: campaignId, platform: { userId } },
    });
    if (!campaign) throw new NotFoundError('Campanha não encontrada');

    return prisma.campaignTag.create({
      data: { campaignId, userId, name, color: color || '#6B7280' },
    });
  }

  async removeTag(userId: string, tagId: string) {
    const tag = await prisma.campaignTag.findFirst({
      where: { id: tagId, userId },
    });
    if (!tag) throw new NotFoundError('Tag não encontrada');

    return prisma.campaignTag.delete({ where: { id: tagId } });
  }

  async getTagsForCampaign(campaignId: string) {
    return prisma.campaignTag.findMany({ where: { campaignId } });
  }

  async getUserTags(userId: string) {
    const tags = await prisma.campaignTag.findMany({
      where: { userId },
      distinct: ['name'],
      select: { name: true, color: true },
    });
    return tags;
  }

  // ─── Audit Log ─────────────────────────────────────────────────────

  async getAuditLog(userId: string, entityId?: string, limit?: number) {
    return prisma.auditLog.findMany({
      where: {
        userId,
        ...(entityId ? { entityId } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: limit || 50,
    });
  }

  async createAuditEntry(userId: string, data: {
    entityType: string;
    entityId: string;
    action: string;
    oldValue?: any;
    newValue?: any;
    source?: string;
    description?: string;
  }) {
    return prisma.auditLog.create({
      data: {
        userId,
        entityType: data.entityType,
        entityId: data.entityId,
        action: data.action,
        oldValue: data.oldValue,
        newValue: data.newValue,
        source: data.source || 'manual',
        description: data.description,
      },
    });
  }

  // ─── Health Score ──────────────────────────────────────────────────

  calculateHealthScore(campaign: {
    metrics: Array<{ spend: number; clicks: bigint | number; impressions: bigint | number; conversions: number; revenue: number; ctr: number; cpc: number; roas: number; date: Date }>;
    dailyBudget?: number | null;
    status: string;
  }): { score: number; level: 'excellent' | 'good' | 'warning' | 'critical'; factors: Array<{ name: string; score: number; detail: string }> } {
    if (!campaign.metrics || campaign.metrics.length === 0) {
      return { score: 0, level: 'critical', factors: [{ name: 'Sem dados', score: 0, detail: 'Nenhuma métrica disponível' }] };
    }

    const factors: Array<{ name: string; score: number; detail: string }> = [];

    const totalSpend = campaign.metrics.reduce((s, m) => s + m.spend, 0);
    const totalClicks = campaign.metrics.reduce((s, m) => s + Number(m.clicks), 0);
    const totalImpressions = campaign.metrics.reduce((s, m) => s + Number(m.impressions), 0);
    const totalRevenue = campaign.metrics.reduce((s, m) => s + m.revenue, 0);

    // 1. CTR Score (0-25 points)
    const ctr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
    let ctrScore = 0;
    if (ctr >= 2) ctrScore = 25;
    else if (ctr >= 1.5) ctrScore = 20;
    else if (ctr >= 1) ctrScore = 15;
    else if (ctr >= 0.5) ctrScore = 10;
    else ctrScore = 5;
    factors.push({ name: 'CTR', score: ctrScore, detail: `${ctr.toFixed(2)}% ${ctr >= 1.5 ? '(bom)' : ctr >= 0.5 ? '(médio)' : '(baixo)'}` });

    // 2. CPC Score (0-25 points)
    const cpc = totalClicks > 0 ? totalSpend / totalClicks : 0;
    let cpcScore = 0;
    if (cpc > 0 && cpc <= 1) cpcScore = 25;
    else if (cpc <= 2) cpcScore = 20;
    else if (cpc <= 3) cpcScore = 15;
    else if (cpc <= 5) cpcScore = 10;
    else cpcScore = 5;
    factors.push({ name: 'CPC', score: cpcScore, detail: `R$${cpc.toFixed(2)} ${cpc <= 2 ? '(bom)' : cpc <= 5 ? '(médio)' : '(alto)'}` });

    // 3. ROAS Score (0-25 points)
    const roas = totalSpend > 0 ? totalRevenue / totalSpend : 0;
    let roasScore = 0;
    if (roas >= 4) roasScore = 25;
    else if (roas >= 3) roasScore = 20;
    else if (roas >= 2) roasScore = 15;
    else if (roas >= 1) roasScore = 10;
    else if (totalRevenue === 0 && totalSpend > 0) roasScore = 12; // No revenue tracking
    else roasScore = 5;
    factors.push({ name: 'ROAS', score: roasScore, detail: roas > 0 ? `${roas.toFixed(2)}x` : 'N/A' });

    // 4. Trend Score (0-25 points) - are metrics improving?
    let trendScore = 12; // neutral default
    if (campaign.metrics.length >= 6) {
      const midpoint = Math.floor(campaign.metrics.length / 2);
      const sortedMetrics = [...campaign.metrics].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      const firstHalf = sortedMetrics.slice(0, midpoint);
      const secondHalf = sortedMetrics.slice(midpoint);

      const firstCtr = firstHalf.reduce((s, m) => s + Number(m.impressions), 0) > 0
        ? (firstHalf.reduce((s, m) => s + Number(m.clicks), 0) / firstHalf.reduce((s, m) => s + Number(m.impressions), 0)) * 100
        : 0;
      const secondCtr = secondHalf.reduce((s, m) => s + Number(m.impressions), 0) > 0
        ? (secondHalf.reduce((s, m) => s + Number(m.clicks), 0) / secondHalf.reduce((s, m) => s + Number(m.impressions), 0)) * 100
        : 0;

      if (secondCtr > firstCtr * 1.1) trendScore = 25;
      else if (secondCtr > firstCtr) trendScore = 20;
      else if (secondCtr > firstCtr * 0.9) trendScore = 12;
      else trendScore = 5;
    }
    factors.push({ name: 'Tendência', score: trendScore, detail: trendScore >= 20 ? 'Melhorando' : trendScore >= 12 ? 'Estável' : 'Piorando' });

    const totalScore = factors.reduce((s, f) => s + f.score, 0);
    let level: 'excellent' | 'good' | 'warning' | 'critical';
    if (totalScore >= 80) level = 'excellent';
    else if (totalScore >= 60) level = 'good';
    else if (totalScore >= 40) level = 'warning';
    else level = 'critical';

    return { score: totalScore, level, factors };
  }

  // ─── Forecast ──────────────────────────────────────────────────────

  async getForecast(userId: string, campaignId?: string) {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const where: any = {
      campaign: { platform: { userId, isConnected: true } },
      date: { gte: thirtyDaysAgo },
    };
    if (campaignId) where.campaign.id = campaignId;

    const metrics = await prisma.metric.findMany({ where, orderBy: { date: 'asc' } });

    if (metrics.length < 7) return null;

    const totalSpend = metrics.reduce((s, m) => s + m.spend, 0);
    const totalClicks = metrics.reduce((s, m) => s + Number(m.clicks), 0);
    const totalConversions = metrics.reduce((s, m) => s + m.conversions, 0);
    const totalRevenue = metrics.reduce((s, m) => s + m.revenue, 0);
    const days = metrics.length;

    const avgDailySpend = totalSpend / days;
    const avgDailyClicks = totalClicks / days;
    const avgDailyConversions = totalConversions / days;
    const avgDailyRevenue = totalRevenue / days;
    const avgCpc = totalClicks > 0 ? totalSpend / totalClicks : 0;
    const avgCvr = totalClicks > 0 ? totalConversions / totalClicks : 0;

    return {
      basedOnDays: days,
      daily: {
        spend: Math.round(avgDailySpend * 100) / 100,
        clicks: Math.round(avgDailyClicks),
        conversions: Math.round(avgDailyConversions * 100) / 100,
        revenue: Math.round(avgDailyRevenue * 100) / 100,
      },
      projected30d: {
        spend: Math.round(avgDailySpend * 30 * 100) / 100,
        clicks: Math.round(avgDailyClicks * 30),
        conversions: Math.round(avgDailyConversions * 30),
        revenue: Math.round(avgDailyRevenue * 30 * 100) / 100,
        roas: avgDailySpend > 0 ? Math.round((avgDailyRevenue / avgDailySpend) * 100) / 100 : 0,
      },
      costPer: {
        click: Math.round(avgCpc * 100) / 100,
        conversion: avgDailyConversions > 0 ? Math.round((avgDailySpend / avgDailyConversions) * 100) / 100 : 0,
      },
      conversionRate: Math.round(avgCvr * 10000) / 100,
    };
  }

  // ─── Proactive AI Insights ────────────────────────────────────────

  async getProactiveInsights(userId: string) {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const campaigns = await prisma.campaign.findMany({
      where: { platform: { userId, isConnected: true }, status: 'ACTIVE' },
      include: {
        metrics: { where: { date: { gte: thirtyDaysAgo } }, orderBy: { date: 'asc' } },
      },
    });

    const insights: Array<{ type: 'opportunity' | 'warning' | 'info'; title: string; description: string; campaignId?: string; campaignName?: string }> = [];

    for (const campaign of campaigns) {
      if (campaign.metrics.length === 0) continue;

      const totalSpend = campaign.metrics.reduce((s, m) => s + m.spend, 0);
      const totalClicks = campaign.metrics.reduce((s, m) => s + Number(m.clicks), 0);
      const totalImpressions = campaign.metrics.reduce((s, m) => s + Number(m.impressions), 0);
      const totalRevenue = campaign.metrics.reduce((s, m) => s + m.revenue, 0);

      if (totalSpend <= 0) continue;

      const ctr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
      const roas = totalSpend > 0 ? totalRevenue / totalSpend : 0;

      // Check for high ROAS - opportunity to scale
      if (roas > 4) {
        insights.push({
          type: 'opportunity',
          title: `Escale "${campaign.name}"`,
          description: `ROAS de ${roas.toFixed(1)}x nos últimos 30 dias. Considere aumentar o orçamento para maximizar retorno.`,
          campaignId: campaign.id,
          campaignName: campaign.name,
        });
      }

      // Check for CTR drop in last 7 days
      const recentMetrics = campaign.metrics.filter((m) => new Date(m.date) >= sevenDaysAgo);
      const olderMetrics = campaign.metrics.filter((m) => new Date(m.date) < sevenDaysAgo);

      if (recentMetrics.length >= 3 && olderMetrics.length >= 7) {
        const recentImpressions = recentMetrics.reduce((s, m) => s + Number(m.impressions), 0);
        const recentClicks = recentMetrics.reduce((s, m) => s + Number(m.clicks), 0);
        const olderImpressions = olderMetrics.reduce((s, m) => s + Number(m.impressions), 0);
        const olderClicks = olderMetrics.reduce((s, m) => s + Number(m.clicks), 0);

        const recentCtr = recentImpressions > 0 ? (recentClicks / recentImpressions) * 100 : 0;
        const olderCtr = olderImpressions > 0 ? (olderClicks / olderImpressions) * 100 : 0;

        if (olderCtr > 0 && recentCtr < olderCtr * 0.7) {
          insights.push({
            type: 'warning',
            title: `CTR em queda: "${campaign.name}"`,
            description: `CTR caiu de ${olderCtr.toFixed(2)}% para ${recentCtr.toFixed(2)}% nos últimos 7 dias (-${Math.round((1 - recentCtr / olderCtr) * 100)}%).`,
            campaignId: campaign.id,
            campaignName: campaign.name,
          });
        }
      }

      // Negative ROAS warning
      if (roas < 1 && roas > 0 && totalSpend > 100) {
        insights.push({
          type: 'warning',
          title: `ROAS negativo: "${campaign.name}"`,
          description: `Gastou R$${totalSpend.toFixed(2)} mas gerou apenas R$${totalRevenue.toFixed(2)} em receita (ROAS ${roas.toFixed(2)}x).`,
          campaignId: campaign.id,
          campaignName: campaign.name,
        });
      }
    }

    // Unused budget insight
    const pausedWithBudget = await prisma.campaign.findMany({
      where: { platform: { userId, isConnected: true }, status: 'PAUSED', dailyBudget: { gt: 0 } },
    });
    if (pausedWithBudget.length > 0) {
      const totalUnused = pausedWithBudget.reduce((s, c) => s + (c.dailyBudget || 0), 0);
      insights.push({
        type: 'info',
        title: `R$${totalUnused.toFixed(2)}/dia em campanhas pausadas`,
        description: `Você tem ${pausedWithBudget.length} campanhas pausadas com orçamento configurado.`,
      });
    }

    return insights.slice(0, 10); // Max 10 insights
  }

  /**
   * Bulk action on campaigns
   */
  async bulkAction(userId: string, campaignIds: string[], action: string) {
    const campaigns = await prisma.campaign.findMany({
      where: {
        id: { in: campaignIds },
        platform: {
          userId,
        },
      },
    });

    if (campaigns.length === 0) {
      throw new NotFoundError('Nenhuma campanha encontrada');
    }

    const statusMap: Record<string, CampaignStatus> = {
      pause: 'PAUSED',
      activate: 'ACTIVE',
      archive: 'ARCHIVED',
    };

    const newStatus = statusMap[action];

    // Update all campaigns
    const results = await Promise.allSettled(
      campaigns.map((campaign) =>
        this.updateCampaignStatus(campaign.id, userId, { status: newStatus })
      )
    );

    const successful = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected').length;

    return {
      total: campaigns.length,
      successful,
      failed,
    };
  }
}

export const campaignsService = new CampaignsService();
