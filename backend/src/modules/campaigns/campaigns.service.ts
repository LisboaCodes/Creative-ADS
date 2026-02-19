import { CampaignStatus, PlatformType } from '@prisma/client';
import { prisma } from '../../config/database';
import { cache } from '../../config/redis';
import { env } from '../../config/env';
import { platformsService } from '../platforms/platforms.service';
import { facebookService } from '../platforms/integrations/facebook.service';
import type { UpdateCampaignStatusInput, UpdateCampaignBudgetInput } from './campaigns.schemas';

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
      page?: number;
      limit?: number;
    }
  ) {
    const { platformType, status, search, page = 1, limit = 20 } = filters;

    const where: any = {
      platform: {
        userId,
        isConnected: true,
      },
    };

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

    const [campaigns, total] = await Promise.all([
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
          metrics: {
            orderBy: { date: 'desc' },
            take: 1,
          },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.campaign.count({ where }),
    ]);

    return {
      campaigns,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
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
      },
    });

    if (!campaign) {
      throw new Error('Campaign not found');
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
      throw new Error('Campaign not found');
    }

    // Update on platform
    if (data.status === 'ACTIVE' || data.status === 'PAUSED') {
      const accessToken = await platformsService.getAccessToken(campaign.platformId);

      // Get platform service
      let service;
      switch (campaign.platformType) {
        case 'FACEBOOK':
        case 'INSTAGRAM':
          service = facebookService;
          break;
        default:
          throw new Error('Platform not supported');
      }

      await service.updateCampaignStatus(campaign.externalId, accessToken, data.status);
    }

    // Update in database
    const updated = await prisma.campaign.update({
      where: { id: campaignId },
      data: { status: data.status },
    });

    // Clear cache
    await cache.delPattern(`campaigns:${userId}:*`);

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
      throw new Error('Campaign not found');
    }

    // Update on platform
    const accessToken = await platformsService.getAccessToken(campaign.platformId);

    let service;
    switch (campaign.platformType) {
      case 'FACEBOOK':
      case 'INSTAGRAM':
        service = facebookService;
        break;
      default:
        throw new Error('Platform not supported');
    }

    await service.updateCampaignBudget(campaign.externalId, accessToken, {
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

    // Clear cache
    await cache.delPattern(`campaigns:${userId}:*`);

    return updated;
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
      throw new Error('No campaigns found');
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
