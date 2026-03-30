import { PlatformType } from '@prisma/client';
import { prisma } from '../../config/database';
import { encrypt, decrypt } from '../../utils/encryption';
import { logger } from '../../utils/logger';
import { NotFoundError, ServiceUnavailableError } from '../../utils/errors';
import { facebookService } from './integrations/facebook.service';
import { googleAdsService } from './integrations/google.service';
import { tiktokService } from './integrations/tiktok.service';
import { linkedinService } from './integrations/linkedin.service';
import type { BasePlatformService } from './integrations/base.service';
import { whatsAppNotificationsService } from '../whatsapp/whatsapp-notifications.service';
import { notificationsService } from '../notifications/notifications.service';

// Mapping of Facebook effective_status to human-readable reason
const billingReasonMap: Record<string, string> = {
  PENDING_BILLING_INFO: 'Informações de pagamento pendentes',
  CAMPAIGN_PAUSED: 'Pausada pela plataforma',
  ADSET_PAUSED: 'Conjunto de anúncios pausado',
  DISAPPROVED: 'Anúncio reprovado pela plataforma',
  PENDING_REVIEW: 'Em revisão pela plataforma',
};

export class PlatformsService {
  private platformServices = new Map<PlatformType, BasePlatformService>([
    [PlatformType.FACEBOOK, facebookService],
    [PlatformType.INSTAGRAM, facebookService], // Instagram Ads uses Facebook's API
    [PlatformType.GOOGLE_ADS, googleAdsService],
    [PlatformType.TIKTOK, tiktokService],
    [PlatformType.LINKEDIN, linkedinService],
  ]);

  /**
   * Get platform service by type (public alias)
   */
  getServiceForType(platformType: PlatformType): BasePlatformService {
    return this.getPlatformService(platformType);
  }

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
   * Connect platform account (supports multiple logins & ad accounts)
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
      const result = await service.exchangeCodeForTokens(code);
      const { accessToken, refreshToken, expiresAt } = result;

      // Encrypt tokens
      const encryptedAccessToken = encrypt(accessToken);
      const encryptedRefreshToken = refreshToken ? encrypt(refreshToken) : undefined;

      // Get user profile to identify this login (platform-agnostic)
      let platformLoginId: string | undefined;
      let platformMetadata: any = undefined;

      try {
        let profile: { id: string; name: string };
        const resolvedPlatformType = platformType === PlatformType.INSTAGRAM ? PlatformType.FACEBOOK : platformType;

        if (resolvedPlatformType === PlatformType.FACEBOOK) {
          profile = await facebookService.getUserProfile(accessToken);
          const businessManagers = await facebookService.getBusinessManagers(accessToken);
          if (businessManagers.length > 0) {
            platformMetadata = { businessManagers };
          }
        } else if (resolvedPlatformType === PlatformType.GOOGLE_ADS) {
          profile = await googleAdsService.getUserProfile(accessToken);
          // Google Ads metadata: MCC accounts are discovered via listAccessibleCustomers
        } else if (resolvedPlatformType === PlatformType.TIKTOK) {
          profile = await tiktokService.getUserProfile(accessToken);
        } else if (resolvedPlatformType === PlatformType.LINKEDIN) {
          profile = await linkedinService.getUserProfile(accessToken);
        } else {
          profile = { id: result.externalId, name: platformType };
        }

        // Upsert PlatformLogin with generic fields
        const login = await prisma.platformLogin.upsert({
          where: {
            userId_platformType_externalUserId: {
              userId,
              platformType: resolvedPlatformType,
              externalUserId: profile.id,
            },
          },
          create: {
            userId,
            platformType: resolvedPlatformType,
            accessToken: encryptedAccessToken,
            refreshToken: encryptedRefreshToken,
            tokenExpiresAt: expiresAt,
            externalUserId: profile.id,
            externalUserName: profile.name,
            platformMetadata: platformMetadata || undefined,
          },
          update: {
            accessToken: encryptedAccessToken,
            refreshToken: encryptedRefreshToken,
            tokenExpiresAt: expiresAt,
            externalUserName: profile.name,
            platformMetadata: platformMetadata || undefined,
          },
        });

        platformLoginId = login.id;
        logger.info(`PlatformLogin upserted for ${resolvedPlatformType} user ${profile.name} (${profile.id})`);
      } catch (err: any) {
        logger.warn(`Could not create PlatformLogin: ${err.message}`);
      }

      // Determine the list of ad accounts to connect
      const adAccounts = (result as any).adAccounts || [{ id: result.externalId, name: result.externalId }];

      // Build a map of BM → ad accounts for tagging (Facebook-specific)
      const adAccountBMMap = new Map<string, { bmId: string; bmName: string }>();
      const businessManagers = (platformMetadata?.businessManagers as Array<{ id: string; name: string }>) || [];
      if (businessManagers.length > 0 && (platformType === PlatformType.FACEBOOK || platformType === PlatformType.INSTAGRAM)) {
        for (const bm of businessManagers) {
          try {
            const bmAccounts = await facebookService.getBMAdAccounts(accessToken, bm.id);
            for (const acc of bmAccounts) {
              adAccountBMMap.set(acc.id, { bmId: bm.id, bmName: bm.name });
            }
          } catch {
            // skip
          }
        }
      }

      const connectedPlatforms = [];

      for (const account of adAccounts) {
        const bmInfo = adAccountBMMap.get(account.id);

        // Check if platform already connected
        const existingPlatform = await prisma.platform.findFirst({
          where: {
            userId,
            type: platformType,
            externalId: account.id,
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
              name: account.name || `${platformType} - ${account.id}`,
              platformLoginId: platformLoginId || undefined,
              businessManagerId: bmInfo?.bmId || undefined,
              businessManagerName: bmInfo?.bmName || undefined,
            },
          });
        } else {
          // Create new connection
          platform = await prisma.platform.create({
            data: {
              userId,
              type: platformType,
              name: account.name || `${platformType} - ${account.id}`,
              externalId: account.id,
              accessToken: encryptedAccessToken,
              refreshToken: encryptedRefreshToken,
              tokenExpiresAt: expiresAt,
              isConnected: true,
              lastSyncAt: new Date(),
              platformLoginId: platformLoginId || undefined,
              businessManagerId: bmInfo?.bmId || undefined,
              businessManagerName: bmInfo?.bmName || undefined,
            },
          });
        }

        connectedPlatforms.push({
          id: platform.id,
          type: platform.type,
          name: platform.name,
          isConnected: platform.isConnected,
        });
      }

      logger.info(`Connected ${connectedPlatforms.length} ad accounts for ${platformType}, user ${userId}`);

      // Return first for backward compat, but all are connected
      return connectedPlatforms.length === 1
        ? connectedPlatforms[0]
        : { accounts: connectedPlatforms, count: connectedPlatforms.length };
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
        platformLoginId: true,
        businessManagerId: true,
        businessManagerName: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return platforms;
  }

  /**
   * Get all platform logins for a user (with linked account counts)
   */
  async getPlatformLogins(userId: string) {
    const logins = await prisma.platformLogin.findMany({
      where: { userId },
      include: {
        platforms: {
          where: { isConnected: true },
          select: {
            id: true,
            type: true,
            name: true,
            externalId: true,
            isConnected: true,
            lastSyncAt: true,
            businessManagerId: true,
            businessManagerName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return logins.map((login) => ({
      id: login.id,
      platformType: login.platformType,
      externalUserId: login.externalUserId,
      externalUserName: login.externalUserName,
      platformMetadata: login.platformMetadata,
      tokenExpiresAt: login.tokenExpiresAt,
      createdAt: login.createdAt,
      updatedAt: login.updatedAt,
      accountCount: login.platforms.length,
      platforms: login.platforms,
    }));
  }

  /**
   * Get BM detail: ad accounts, pages, and pixels
   */
  async getBMDetail(userId: string, bmId: string) {
    // Find a login that has this BM
    const logins = await prisma.platformLogin.findMany({
      where: { userId },
    });

    let accessToken: string | null = null;
    let loginWithBM: any = null;

    for (const login of logins) {
      const metadata = (login.platformMetadata as any) || {};
      const bms = metadata.businessManagers || [];
      if (bms.some((bm: any) => bm.id === bmId)) {
        try {
          accessToken = decrypt(login.accessToken);
          loginWithBM = login;
          break;
        } catch {
          continue;
        }
      }
    }

    if (!accessToken || !loginWithBM) {
      throw new NotFoundError('Business Manager não encontrado ou sem acesso');
    }

    // Get BM name from the stored data
    const metadata = (loginWithBM.platformMetadata as any) || {};
    const bms = metadata.businessManagers || [];
    const bmInfo = bms.find((bm: any) => bm.id === bmId);

    // Fetch ad accounts, pages, and pixels in parallel
    const [adAccounts, pages, pixels] = await Promise.all([
      facebookService.getBMAdAccounts(accessToken, bmId),
      facebookService.getBMPages(accessToken, bmId),
      facebookService.getBMPixels(accessToken, bmId),
    ]);

    // Match ad accounts with our Platform records
    const platformRecords = await prisma.platform.findMany({
      where: {
        userId,
        businessManagerId: bmId,
        isConnected: true,
      },
      select: {
        id: true,
        name: true,
        externalId: true,
        lastSyncAt: true,
      },
    });

    const enrichedAdAccounts = adAccounts.map((acc) => {
      const platformRecord = platformRecords.find((p) => p.externalId === acc.id);
      return {
        ...acc,
        platformId: platformRecord?.id,
        lastSyncAt: platformRecord?.lastSyncAt,
        isTracked: !!platformRecord,
      };
    });

    return {
      id: bmId,
      name: bmInfo?.name || bmId,
      adAccounts: enrichedAdAccounts,
      pages,
      pixels,
    };
  }

  /**
   * Re-sync a login: rediscover BMs, ad accounts
   */
  async resyncLogin(userId: string, loginId: string) {
    const login = await prisma.platformLogin.findFirst({
      where: { id: loginId, userId },
    });

    if (!login) {
      throw new NotFoundError('Login não encontrado');
    }

    let accessToken: string;
    try {
      accessToken = decrypt(login.accessToken);
    } catch {
      throw new Error('Token inválido. Reconecte a conta.');
    }

    const allAdAccounts: Array<{ id: string; name: string; bmId?: string; bmName?: string }> = [];
    const seenIds = new Set<string>();
    let metadataCount = 0;

    if (login.platformType === PlatformType.FACEBOOK || login.platformType === PlatformType.INSTAGRAM) {
      // Facebook: Rediscover BMs and ad accounts
      const businessManagers = await facebookService.getBusinessManagers(accessToken);
      metadataCount = businessManagers.length;

      await prisma.platformLogin.update({
        where: { id: loginId },
        data: {
          platformMetadata: businessManagers.length > 0 ? { businessManagers } : undefined,
        },
      });

      for (const bm of businessManagers) {
        const bmAccounts = await facebookService.getBMAdAccounts(accessToken, bm.id);
        for (const acc of bmAccounts) {
          if (!seenIds.has(acc.id)) {
            seenIds.add(acc.id);
            allAdAccounts.push({ id: acc.id, name: acc.name, bmId: bm.id, bmName: bm.name });
          }
        }
      }
    } else {
      // For other platforms: re-discover accounts via service
      const service = this.getPlatformService(login.platformType);
      try {
        // Use a dummy exchange to rediscover accounts (won't work without code)
        // Instead, we refresh the token and list existing linked accounts
        if (login.refreshToken) {
          const decryptedRefresh = decrypt(login.refreshToken);
          const newTokens = await service.refreshAccessToken(decryptedRefresh);
          accessToken = newTokens.accessToken;

          const encryptedNewAccess = encrypt(newTokens.accessToken);
          const encryptedNewRefresh = newTokens.refreshToken ? encrypt(newTokens.refreshToken) : login.refreshToken;

          await prisma.platformLogin.update({
            where: { id: loginId },
            data: {
              accessToken: encryptedNewAccess,
              refreshToken: encryptedNewRefresh,
              tokenExpiresAt: newTokens.expiresAt,
            },
          });
        }
      } catch (err: any) {
        logger.warn(`Could not refresh token during resync: ${err.message}`);
      }

      // Get existing linked platforms as the discovered accounts
      const linkedPlatforms = await prisma.platform.findMany({
        where: { platformLoginId: loginId, isConnected: true },
        select: { externalId: true, name: true },
      });

      for (const p of linkedPlatforms) {
        if (!seenIds.has(p.externalId)) {
          seenIds.add(p.externalId);
          allAdAccounts.push({ id: p.externalId, name: p.name });
        }
      }
    }

    const encryptedAccessToken = login.accessToken; // Already encrypted

    // Upsert discovered ad accounts
    let newCount = 0;
    for (const account of allAdAccounts) {
      const existing = await prisma.platform.findFirst({
        where: { userId, type: login.platformType, externalId: account.id },
      });

      if (existing) {
        await prisma.platform.update({
          where: { id: existing.id },
          data: {
            platformLoginId: loginId,
            businessManagerId: account.bmId || undefined,
            businessManagerName: account.bmName || undefined,
            accessToken: encryptedAccessToken,
            isConnected: true,
          },
        });
      } else {
        await prisma.platform.create({
          data: {
            userId,
            type: login.platformType,
            name: account.bmName ? `${account.name} (${account.bmName})` : account.name,
            externalId: account.id,
            accessToken: encryptedAccessToken,
            tokenExpiresAt: login.tokenExpiresAt,
            isConnected: true,
            lastSyncAt: new Date(),
            platformLoginId: loginId,
            businessManagerId: account.bmId || undefined,
            businessManagerName: account.bmName || undefined,
          },
        });
        newCount++;
      }
    }

    logger.info(`Resync login ${loginId}: ${metadataCount} metadata entries, ${allAdAccounts.length} accounts (${newCount} new)`);

    return {
      businessManagers: metadataCount,
      adAccounts: allAdAccounts.length,
      newAccounts: newCount,
    };
  }

  /**
   * Disconnect a login and all associated accounts
   */
  async disconnectLogin(userId: string, loginId: string) {
    const login = await prisma.platformLogin.findFirst({
      where: { id: loginId, userId },
      include: { platforms: { select: { id: true } } },
    });

    if (!login) {
      throw new NotFoundError('Login não encontrado');
    }

    const platformIds = login.platforms.map((p) => p.id);

    if (platformIds.length > 0) {
      // Delete all campaign data linked to these platforms
      const campaignIds = await prisma.campaign.findMany({
        where: { platformId: { in: platformIds } },
        select: { id: true },
      }).then((cs) => cs.map((c) => c.id));

      if (campaignIds.length > 0) {
        // Delete ads → ad sets → creatives → metrics → tags → campaigns (respect FK order)
        const adSetIds = await prisma.adSet.findMany({
          where: { campaignId: { in: campaignIds } },
          select: { id: true },
        }).then((sets) => sets.map((s) => s.id));
        if (adSetIds.length > 0) {
          await prisma.ad.deleteMany({ where: { adSetId: { in: adSetIds } } });
          await prisma.adSet.deleteMany({ where: { id: { in: adSetIds } } });
        }
        await prisma.adCreative.deleteMany({ where: { campaignId: { in: campaignIds } } });
        await prisma.metric.deleteMany({ where: { campaignId: { in: campaignIds } } });
        await prisma.campaignTag.deleteMany({ where: { campaignId: { in: campaignIds } } });
        await prisma.campaign.deleteMany({ where: { id: { in: campaignIds } } });
      }

      // Delete the platforms themselves
      await prisma.platform.deleteMany({ where: { id: { in: platformIds } } });
    }

    // Delete the login record
    await prisma.platformLogin.delete({
      where: { id: loginId },
    });

    logger.info(`Login ${loginId} disconnected and all data deleted: ${platformIds.length} accounts`);

    return {
      message: 'Login desconectado e todos os dados removidos',
      accountsDisconnected: platformIds.length,
    };
  }

  /**
   * Disconnect platform
   */
  async disconnectPlatform(userId: string, platformId: string) {
    const platform = await prisma.platform.findFirst({
      where: { id: platformId, userId },
    });

    if (!platform) {
      throw new NotFoundError('Plataforma não encontrada');
    }

    // Delete all campaign data linked to this platform
    const campaignIds = await prisma.campaign.findMany({
      where: { platformId },
      select: { id: true },
    }).then((cs) => cs.map((c) => c.id));

    if (campaignIds.length > 0) {
      const adSetIds = await prisma.adSet.findMany({
        where: { campaignId: { in: campaignIds } },
        select: { id: true },
      }).then((sets) => sets.map((s) => s.id));
      if (adSetIds.length > 0) {
        await prisma.ad.deleteMany({ where: { adSetId: { in: adSetIds } } });
        await prisma.adSet.deleteMany({ where: { id: { in: adSetIds } } });
      }
      await prisma.adCreative.deleteMany({ where: { campaignId: { in: campaignIds } } });
      await prisma.metric.deleteMany({ where: { campaignId: { in: campaignIds } } });
      await prisma.campaignTag.deleteMany({ where: { campaignId: { in: campaignIds } } });
      await prisma.campaign.deleteMany({ where: { id: { in: campaignIds } } });
    }

    // Delete the platform itself
    await prisma.platform.delete({ where: { id: platformId } });

    logger.info(`Platform ${platformId} deleted with ${campaignIds.length} campaigns`);

    return { message: 'Plataforma e campanhas removidas com sucesso' };
  }

  /**
   * Get pixel info for a platform
   */
  async getPixelInfo(userId: string, platformId: string) {
    const platform = await prisma.platform.findFirst({
      where: { id: platformId, userId },
    });

    if (!platform || !platform.isConnected) {
      throw new NotFoundError('Plataforma não encontrada ou não conectada');
    }

    let accessToken: string;
    try {
      accessToken = decrypt(platform.accessToken);
    } catch {
      return { pixels: [], demo: true };
    }

    if (platform.type === 'FACEBOOK' || platform.type === 'INSTAGRAM') {
      const pixels = await facebookService.getPixels(accessToken, platform.externalId);
      return { pixels };
    }

    return { pixels: [] };
  }

  /**
   * Get Facebook pages for a platform (pages the user administrates)
   */
  async getPages(userId: string, platformId: string) {
    const platform = await prisma.platform.findFirst({
      where: { id: platformId, userId },
    });

    if (!platform || !platform.isConnected) {
      throw new Error('Plataforma não encontrada ou não conectada');
    }

    let accessToken: string;
    try {
      accessToken = decrypt(platform.accessToken);
    } catch {
      return [];
    }

    if (platform.type === 'FACEBOOK' || platform.type === 'INSTAGRAM') {
      const pages = await facebookService.getUserPages(accessToken);
      // Return without the page access token for security
      return pages.map(({ accessToken: _, ...page }) => page);
    }

    return [];
  }

  /**
   * Get recent posts from a Facebook page
   */
  async getPagePosts(userId: string, platformId: string, pageId: string) {
    const platform = await prisma.platform.findFirst({
      where: { id: platformId, userId },
    });

    if (!platform || !platform.isConnected) {
      throw new Error('Plataforma não encontrada ou não conectada');
    }

    let accessToken: string;
    try {
      accessToken = decrypt(platform.accessToken);
    } catch {
      return [];
    }

    if (platform.type === 'FACEBOOK' || platform.type === 'INSTAGRAM') {
      return facebookService.getPagePosts(accessToken, pageId);
    }

    return [];
  }

  /**
   * Get decrypted access token for a platform.
   * If token is expired or about to expire (within 5 min), try to refresh it.
   */
  async getAccessToken(platformId: string): Promise<string> {
    const platform = await prisma.platform.findUnique({
      where: { id: platformId },
    });

    if (!platform) {
      throw new NotFoundError('Plataforma não encontrada');
    }

    if (!platform.isConnected) {
      throw new ServiceUnavailableError('Plataforma não está conectada');
    }

    const fiveMinutesFromNow = new Date(Date.now() + 5 * 60 * 1000);
    const isExpiredOrExpiring =
      platform.tokenExpiresAt && platform.tokenExpiresAt < fiveMinutesFromNow;

    if (isExpiredOrExpiring && platform.refreshToken) {
      try {
        logger.info(`Token expired/expiring for platform ${platformId}, refreshing...`);

        const service = this.getPlatformService(platform.type);
        const decryptedRefreshToken = decrypt(platform.refreshToken);
        const newTokens = await service.refreshAccessToken(decryptedRefreshToken);

        const encryptedAccessToken = encrypt(newTokens.accessToken);
        const encryptedRefreshToken = newTokens.refreshToken
          ? encrypt(newTokens.refreshToken)
          : platform.refreshToken;

        await prisma.platform.update({
          where: { id: platformId },
          data: {
            accessToken: encryptedAccessToken,
            refreshToken: encryptedRefreshToken,
            tokenExpiresAt: newTokens.expiresAt,
          },
        });

        // Also update the PlatformLogin if linked
        if (platform.platformLoginId) {
          await prisma.platformLogin.update({
            where: { id: platform.platformLoginId },
            data: {
              accessToken: encryptedAccessToken,
              refreshToken: encryptedRefreshToken,
              tokenExpiresAt: newTokens.expiresAt,
            },
          });
        }

        logger.info(`Token refreshed successfully for platform ${platformId}`);
        return newTokens.accessToken;
      } catch (error: any) {
        logger.error(`Failed to refresh token for platform ${platformId}:`, error);
        // If refresh fails and token is truly expired, throw
        if (platform.tokenExpiresAt && platform.tokenExpiresAt < new Date()) {
          throw new ServiceUnavailableError(
            'Token expirado e não foi possível renovar. Reconecte a plataforma.'
          );
        }
        // Otherwise, try using the current token (it may still be valid for a few minutes)
      }
    }

    // Token is expired with no refresh token available
    if (platform.tokenExpiresAt && platform.tokenExpiresAt < new Date() && !platform.refreshToken) {
      throw new ServiceUnavailableError(
        'Token expirado. Reconecte a plataforma.'
      );
    }

    try {
      return decrypt(platform.accessToken);
    } catch {
      throw new ServiceUnavailableError(
        'Token inválido ou corrompido. Reconecte a plataforma.'
      );
    }
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
      return { synced: 0, metricsSynced: 0, creativesSynced: 0, demo: true };
    }

    // Get campaigns from platform
    const campaigns = await service.getCampaigns(accessToken, platform.externalId);

    // Find campaigns that the user has locally DELETED — never overwrite them
    const locallyDeletedCampaigns = await prisma.campaign.findMany({
      where: {
        platformId: platform.id,
        status: 'DELETED',
        externalId: { not: null },
      },
      select: { externalId: true },
    });
    const locallyDeletedIds = new Set(locallyDeletedCampaigns.map((c) => c.externalId!));

    // Upsert campaigns in database (skip locally deleted)
    // Track status changes for notifications
    const statusChanges: Array<{
      campaignName: string;
      oldStatus: string;
      newStatus: string;
      originalStatus?: string;
      dailyBudget?: number;
      platformId: string;
    }> = [];

    for (const campaignData of campaigns) {
      // If user deleted this campaign locally, don't re-insert it
      if (locallyDeletedIds.has(campaignData.externalId)) {
        logger.info(`Skipping sync for locally deleted campaign ${campaignData.externalId}`);
        continue;
      }

      // Check for status changes before upsert
      const existingCampaign = await prisma.campaign.findUnique({
        where: {
          platformId_externalId: {
            platformId: platform.id,
            externalId: campaignData.externalId,
          },
        },
        select: { status: true, name: true },
      });

      // Detect status change (only for existing campaigns)
      if (existingCampaign && existingCampaign.status !== campaignData.status) {
        statusChanges.push({
          campaignName: campaignData.name,
          oldStatus: existingCampaign.status,
          newStatus: campaignData.status,
          originalStatus: campaignData.originalStatus,
          dailyBudget: campaignData.dailyBudget,
          platformId: platform.id,
        });
      }

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

    // Send notifications for billing/platform pauses detected during sync
    for (const change of statusChanges) {
      const isBillingPause = change.newStatus === 'PAUSED' && change.originalStatus &&
        ['PENDING_BILLING_INFO', 'CAMPAIGN_PAUSED', 'ADSET_PAUSED', 'DISAPPROVED', 'PENDING_REVIEW'].includes(change.originalStatus);

      if (isBillingPause) {
        const reason = billingReasonMap[change.originalStatus!] || 'Pausada automaticamente pela plataforma';

        // WhatsApp notification (fire-and-forget)
        whatsAppNotificationsService.notifyGroups(platform.userId, 'BILLING_PAUSE', {
          campaign: { name: change.campaignName, platformId: change.platformId, dailyBudget: change.dailyBudget },
          metrics: { reason },
        }).catch(err => logger.warn('WhatsApp billing pause notification failed:', err.message));

        // In-app notification
        notificationsService.createNotification(platform.userId, {
          title: 'Campanha pausada pela plataforma',
          message: `A campanha "${change.campaignName}" foi pausada. Motivo: ${reason}`,
          type: 'WARNING',
          metadata: { campaignName: change.campaignName, reason, originalStatus: change.originalStatus },
        }).catch(err => logger.warn('In-app billing pause notification failed:', err.message));

        logger.info(`Billing pause detected for campaign "${change.campaignName}": ${change.originalStatus}`);
      }
    }

    // Archive campaigns that no longer exist on the platform
    const syncedExternalIds = new Set(campaigns.map((c) => c.externalId));
    const existingCampaigns = await prisma.campaign.findMany({
      where: {
        platformId: platform.id,
        externalId: { not: null },
        status: { notIn: ['ARCHIVED', 'DELETED', 'DRAFT'] },
      },
      select: { id: true, externalId: true, name: true, status: true },
    });

    let archivedCount = 0;
    for (const existing of existingCampaigns) {
      if (existing.externalId && !syncedExternalIds.has(existing.externalId)) {
        await prisma.campaign.update({
          where: { id: existing.id },
          data: { status: 'ARCHIVED' },
        });
        archivedCount++;
        logger.info(`Archived campaign "${existing.name}" (${existing.externalId}) - no longer on platform`);
      }
    }

    // Sync metrics for each campaign using real campaign dates
    let metricsSynced = 0;
    let creativesSynced = 0;

    // Get all campaigns for this platform to sync metrics & creatives (only active ones)
    const dbCampaigns = await prisma.campaign.findMany({
      where: {
        platformId: platform.id,
        status: { notIn: ['ARCHIVED', 'DELETED'] },
      },
    });

    const now = new Date();
    const maxLookbackDays = 90;
    const maxLookbackDate = new Date();
    maxLookbackDate.setDate(maxLookbackDate.getDate() - maxLookbackDays);

    for (const campaign of dbCampaigns) {
      // Skip draft campaigns (no externalId)
      if (!campaign.externalId) continue;

      // Calculate the real date range for this campaign
      let campaignStartDate: Date;
      if (campaign.startDate && campaign.startDate >= maxLookbackDate) {
        campaignStartDate = campaign.startDate;
      } else if (campaign.startDate && campaign.startDate < maxLookbackDate) {
        campaignStartDate = maxLookbackDate; // Cap at 90 days ago
      } else {
        campaignStartDate = new Date();
        campaignStartDate.setDate(campaignStartDate.getDate() - 30); // Default 30d
      }

      let campaignEndDate: Date;
      if (campaign.endDate && campaign.endDate < now) {
        campaignEndDate = campaign.endDate; // Campaign already ended
      } else {
        campaignEndDate = now; // Still running or no end date
      }

      // Sync metrics
      try {
        const metricsData = await service.getMetrics(accessToken, campaign.externalId!, campaignStartDate, campaignEndDate);

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

      // Sync ad creatives
      try {
        const creativesData = await service.getAdCreatives(accessToken, campaign.externalId!);

        for (const creative of creativesData) {
          await prisma.adCreative.upsert({
            where: {
              campaignId_externalId: {
                campaignId: campaign.id,
                externalId: creative.externalId,
              },
            },
            create: {
              campaignId: campaign.id,
              externalId: creative.externalId,
              name: creative.name,
              thumbnailUrl: creative.thumbnailUrl,
              imageUrl: creative.imageUrl,
              body: creative.body,
              title: creative.title,
            },
            update: {
              name: creative.name,
              thumbnailUrl: creative.thumbnailUrl,
              imageUrl: creative.imageUrl,
              body: creative.body,
              title: creative.title,
            },
          });
          creativesSynced++;
        }
      } catch (error: any) {
        logger.warn(`Failed to sync creatives for campaign ${campaign.externalId}: ${error.message}`);
      }
    }

    // Sync Ad Sets and Ads (if service supports it)
    let adSetsSynced = 0;
    let adsSynced = 0;

    if (typeof (service as any).getAdSets === 'function') {
      for (const campaign of dbCampaigns) {
        if (!campaign.externalId) continue;

        try {
          const adSetsData = await (service as any).getAdSets(accessToken, campaign.externalId);

          const syncedAdSetIds = new Set<string>();
          for (const adSetData of adSetsData) {
            const adSet = await prisma.adSet.upsert({
              where: {
                campaignId_externalId: {
                  campaignId: campaign.id,
                  externalId: adSetData.externalId,
                },
              },
              create: {
                campaignId: campaign.id,
                externalId: adSetData.externalId,
                name: adSetData.name,
                status: adSetData.status,
                dailyBudget: adSetData.dailyBudget,
                lifetimeBudget: adSetData.lifetimeBudget,
                targeting: adSetData.targeting,
                optimizationGoal: adSetData.optimizationGoal,
                billingEvent: adSetData.billingEvent,
                startDate: adSetData.startDate,
                endDate: adSetData.endDate,
              },
              update: {
                name: adSetData.name,
                status: adSetData.status,
                dailyBudget: adSetData.dailyBudget,
                lifetimeBudget: adSetData.lifetimeBudget,
                targeting: adSetData.targeting,
                optimizationGoal: adSetData.optimizationGoal,
                billingEvent: adSetData.billingEvent,
                startDate: adSetData.startDate,
                endDate: adSetData.endDate,
              },
            });
            syncedAdSetIds.add(adSet.externalId);
            adSetsSynced++;

            // Sync ads for this ad set
            if (typeof (service as any).getAds === 'function') {
              try {
                const adsData = await (service as any).getAds(accessToken, adSetData.externalId);
                const syncedAdIds = new Set<string>();

                for (const adData of adsData) {
                  // Try to link to existing creative by externalId
                  let creativeId: string | null = null;
                  if (adData.creativeExternalId) {
                    const creative = await prisma.adCreative.findFirst({
                      where: { campaignId: campaign.id, externalId: adData.creativeExternalId },
                      select: { id: true },
                    });
                    creativeId = creative?.id || null;
                  }

                  await prisma.ad.upsert({
                    where: {
                      adSetId_externalId: {
                        adSetId: adSet.id,
                        externalId: adData.externalId,
                      },
                    },
                    create: {
                      adSetId: adSet.id,
                      externalId: adData.externalId,
                      name: adData.name,
                      status: adData.status,
                      creativeId,
                    },
                    update: {
                      name: adData.name,
                      status: adData.status,
                      creativeId,
                    },
                  });
                  syncedAdIds.add(adData.externalId);
                  adsSynced++;
                }

                // Archive ads no longer on platform
                const existingAds = await prisma.ad.findMany({
                  where: { adSetId: adSet.id, status: { notIn: ['ARCHIVED', 'DELETED'] } },
                  select: { id: true, externalId: true },
                });
                for (const existingAd of existingAds) {
                  if (!syncedAdIds.has(existingAd.externalId)) {
                    await prisma.ad.update({ where: { id: existingAd.id }, data: { status: 'ARCHIVED' } });
                  }
                }
              } catch (err: any) {
                logger.warn(`Failed to sync ads for ad set ${adSetData.externalId}: ${err.message}`);
              }
            }
          }

          // Archive ad sets no longer on platform
          const existingAdSets = await prisma.adSet.findMany({
            where: { campaignId: campaign.id, status: { notIn: ['ARCHIVED', 'DELETED'] } },
            select: { id: true, externalId: true },
          });
          for (const existingAdSet of existingAdSets) {
            if (!syncedAdSetIds.has(existingAdSet.externalId)) {
              await prisma.adSet.update({ where: { id: existingAdSet.id }, data: { status: 'ARCHIVED' } });
            }
          }
        } catch (err: any) {
          logger.warn(`Failed to sync ad sets for campaign ${campaign.externalId}: ${err.message}`);
        }
      }
    }

    // Update last sync time
    await prisma.platform.update({
      where: { id: platformId },
      data: { lastSyncAt: new Date() },
    });

    logger.info(
      `Synced ${campaigns.length} campaigns, ${metricsSynced} metrics, ${creativesSynced} creatives, ${adSetsSynced} ad sets, ${adsSynced} ads, ${archivedCount} archived for platform ${platformId}`
    );

    return { synced: campaigns.length, metricsSynced, creativesSynced, adSetsSynced, adsSynced, archivedCount };
  }
}

export const platformsService = new PlatformsService();
