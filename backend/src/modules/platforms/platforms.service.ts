import { PlatformType } from '@prisma/client';
import { prisma } from '../../config/database';
import { encrypt, decrypt } from '../../utils/encryption';
import { logger } from '../../utils/logger';
import { facebookService } from './integrations/facebook.service';
import type { BasePlatformService } from './integrations/base.service';

export class PlatformsService {
  private platformServices: Map<PlatformType, BasePlatformService> = new Map([
    [PlatformType.FACEBOOK, facebookService],
    [PlatformType.INSTAGRAM, facebookService], // Instagram Ads uses Facebook's API
    // [PlatformType.GOOGLE_ADS, googleService],
    // [PlatformType.TIKTOK, tiktokService],
  ]);

  /**
   * Get platform service by type
   */
  private getPlatformService(platformType: PlatformType): BasePlatformService {
    const service = this.platformServices.get(platformType);
    if (!service) {
      throw new Error(`Platform service not implemented: ${platformType}`);
    }
    return service;
  }

  /**
   * Get OAuth authorization URL
   */
  getAuthUrl(platformType: PlatformType, userId: string): string {
    const service = this.getPlatformService(platformType);
    const state = Buffer.from(JSON.stringify({ platformType, userId })).toString('base64');
    return service.getAuthUrl(state);
  }

  /**
   * Connect platform account
   */
  async connectPlatform(userId: string, platformType: PlatformType, code: string, state: string) {
    try {
      // Verify state
      const decodedState = JSON.parse(Buffer.from(state, 'base64').toString());
      if (decodedState.userId !== userId || decodedState.platformType !== platformType) {
        throw new Error('Invalid state parameter');
      }

      // Get platform service
      const service = this.getPlatformService(platformType);

      // Exchange code for tokens
      const { accessToken, refreshToken, expiresAt, externalId } =
        await service.exchangeCodeForTokens(code);

      // Encrypt tokens
      const encryptedAccessToken = encrypt(accessToken);
      const encryptedRefreshToken = refreshToken ? encrypt(refreshToken) : undefined;

      // Check if platform already connected
      const existingPlatform = await prisma.platform.findFirst({
        where: {
          userId,
          type: platformType,
          externalId,
        },
      });

      let platform;

      if (existingPlatform) {
        // Update existing connection
        platform = await prisma.platform.update({
          where: { id: existingPlatform.id },
          data: {
            accessToken: encryptedAccessToken,
            refreshToken: encryptedRefreshToken,
            tokenExpiresAt: expiresAt,
            isConnected: true,
            lastSyncAt: new Date(),
          },
        });
      } else {
        // Create new connection
        platform = await prisma.platform.create({
          data: {
            userId,
            type: platformType,
            name: `${platformType} Account`,
            externalId,
            accessToken: encryptedAccessToken,
            refreshToken: encryptedRefreshToken,
            tokenExpiresAt: expiresAt,
            isConnected: true,
            lastSyncAt: new Date(),
          },
        });
      }

      logger.info(`Platform connected: ${platformType} for user ${userId}`);

      return {
        id: platform.id,
        type: platform.type,
        name: platform.name,
        isConnected: platform.isConnected,
      };
    } catch (error: any) {
      logger.error('Connect platform error:', error);
      throw new Error(error.message || 'Failed to connect platform');
    }
  }

  /**
   * Get all connected platforms for a user
   */
  async getUserPlatforms(userId: string) {
    const platforms = await prisma.platform.findMany({
      where: { userId },
      select: {
        id: true,
        type: true,
        name: true,
        externalId: true,
        isConnected: true,
        lastSyncAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return platforms;
  }

  /**
   * Disconnect platform
   */
  async disconnectPlatform(userId: string, platformId: string) {
    const platform = await prisma.platform.findFirst({
      where: { id: platformId, userId },
    });

    if (!platform) {
      throw new Error('Platform not found');
    }

    await prisma.platform.update({
      where: { id: platformId },
      data: { isConnected: false },
    });

    logger.info(`Platform disconnected: ${platformId}`);

    return { message: 'Platform disconnected successfully' };
  }

  /**
   * Get decrypted access token for a platform
   */
  async getAccessToken(platformId: string): Promise<string> {
    const platform = await prisma.platform.findUnique({
      where: { id: platformId },
    });

    if (!platform) {
      throw new Error('Platform not found');
    }

    if (!platform.isConnected) {
      throw new Error('Platform is not connected');
    }

    // Check if token is expired
    if (platform.tokenExpiresAt && platform.tokenExpiresAt < new Date()) {
      throw new Error('Access token expired');
    }

    return decrypt(platform.accessToken);
  }

  /**
   * Sync campaigns for a platform
   */
  async syncPlatformCampaigns(platformId: string) {
    const platform = await prisma.platform.findUnique({
      where: { id: platformId },
    });

    if (!platform || !platform.isConnected) {
      throw new Error('Platform not found or not connected');
    }

    const service = this.getPlatformService(platform.type);

    // Try to decrypt the access token - if it fails, this is a demo/seed account
    let accessToken: string;
    try {
      accessToken = decrypt(platform.accessToken);
    } catch {
      logger.info(`Platform ${platformId} has non-encrypted token (demo account), skipping external sync`);
      return { synced: 0, metricsSynced: 0, demo: true };
    }

    // Get campaigns from platform
    const campaigns = await service.getCampaigns(accessToken, platform.externalId);

    // Upsert campaigns in database
    for (const campaignData of campaigns) {
      await prisma.campaign.upsert({
        where: {
          platformId_externalId: {
            platformId: platform.id,
            externalId: campaignData.externalId,
          },
        },
        create: {
          platformId: platform.id,
          externalId: campaignData.externalId,
          name: campaignData.name,
          status: campaignData.status,
          dailyBudget: campaignData.dailyBudget,
          lifetimeBudget: campaignData.lifetimeBudget,
          currency: campaignData.currency,
          startDate: campaignData.startDate,
          endDate: campaignData.endDate,
          platformType: platform.type,
        },
        update: {
          name: campaignData.name,
          status: campaignData.status,
          dailyBudget: campaignData.dailyBudget,
          lifetimeBudget: campaignData.lifetimeBudget,
          startDate: campaignData.startDate,
          endDate: campaignData.endDate,
        },
      });
    }

    // Sync metrics for each campaign (last 30 days)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);

    let metricsSynced = 0;

    // Get all campaigns for this platform to sync metrics
    const dbCampaigns = await prisma.campaign.findMany({
      where: { platformId: platform.id },
    });

    for (const campaign of dbCampaigns) {
      try {
        const metricsData = await service.getMetrics(accessToken, campaign.externalId, startDate, endDate);

        for (const metric of metricsData) {
          await prisma.metric.upsert({
            where: {
              campaignId_date: {
                campaignId: campaign.id,
                date: metric.date,
              },
            },
            create: {
              campaignId: campaign.id,
              date: metric.date,
              impressions: metric.impressions,
              reach: metric.reach,
              clicks: metric.clicks,
              spend: metric.spend,
              conversions: metric.conversions,
              revenue: metric.revenue || 0,
              ctr: (metric as any).ctr || 0,
              cpc: (metric as any).cpc || 0,
              cpm: (metric as any).cpm || 0,
              conversionRate: (metric as any).conversionRate || 0,
              roas: (metric as any).roas || 0,
              metadata: metric.metadata || undefined,
            },
            update: {
              impressions: metric.impressions,
              reach: metric.reach,
              clicks: metric.clicks,
              spend: metric.spend,
              conversions: metric.conversions,
              revenue: metric.revenue || 0,
              ctr: (metric as any).ctr || 0,
              cpc: (metric as any).cpc || 0,
              cpm: (metric as any).cpm || 0,
              conversionRate: (metric as any).conversionRate || 0,
              roas: (metric as any).roas || 0,
              metadata: metric.metadata || undefined,
            },
          });
          metricsSynced++;
        }
      } catch (error: any) {
        logger.warn(`Failed to sync metrics for campaign ${campaign.externalId}: ${error.message}`);
      }
    }

    // Update last sync time
    await prisma.platform.update({
      where: { id: platformId },
      data: { lastSyncAt: new Date() },
    });

    logger.info(`Synced ${campaigns.length} campaigns and ${metricsSynced} metrics for platform ${platformId}`);

    return { synced: campaigns.length, metricsSynced };
  }
}

export const platformsService = new PlatformsService();
