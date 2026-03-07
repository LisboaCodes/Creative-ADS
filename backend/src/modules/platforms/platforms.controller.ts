import { Response } from 'express';
import { platformsService } from './platforms.service';
import { logger } from '../../utils/logger';
import { AppError } from '../../utils/errors';
import type { AuthRequest } from '../auth/auth.middleware';
import { PlatformType } from '@prisma/client';
import { prisma } from '../../config/database';
import { cache } from '../../config/redis';

export class PlatformsController {
  /**
   * GET /api/platforms
   */
  async getUserPlatforms(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, error: 'Not authenticated' });
      }

      const platforms = await platformsService.getUserPlatforms(req.user.userId);

      res.status(200).json({
        success: true,
        data: platforms,
      });
    } catch (error: any) {
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({ success: false, error: error.message });
      }
      logger.error('Get platforms error:', error);
      res.status(500).json({ success: false, error: error.message || 'Internal error' });
    }
  }

  /**
   * GET /api/platforms/logins
   */
  async getPlatformLogins(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, error: 'Not authenticated' });
      }

      const logins = await platformsService.getPlatformLogins(req.user.userId);

      res.status(200).json({
        success: true,
        data: logins,
      });
    } catch (error: any) {
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({ success: false, error: error.message });
      }
      logger.error('Get platform logins error:', error);
      res.status(500).json({ success: false, error: error.message || 'Internal error' });
    }
  }

  /**
   * POST /api/platforms/logins/:loginId/sync
   */
  async resyncLogin(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, error: 'Not authenticated' });
      }

      const { loginId } = req.params;
      const result = await platformsService.resyncLogin(req.user.userId, loginId);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({ success: false, error: error.message });
      }
      logger.error('Resync login error:', error);
      res.status(500).json({ success: false, error: error.message || 'Internal error' });
    }
  }

  /**
   * DELETE /api/platforms/logins/:loginId
   */
  async disconnectLogin(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, error: 'Not authenticated' });
      }

      const { loginId } = req.params;
      const result = await platformsService.disconnectLogin(req.user.userId, loginId);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({ success: false, error: error.message });
      }
      logger.error('Disconnect login error:', error);
      res.status(500).json({ success: false, error: error.message || 'Internal error' });
    }
  }

  /**
   * GET /api/platforms/bm/:bmId
   */
  async getBMDetail(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, error: 'Not authenticated' });
      }

      const { bmId } = req.params;
      const result = await platformsService.getBMDetail(req.user.userId, bmId);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({ success: false, error: error.message });
      }
      logger.error('Get BM detail error:', error);
      res.status(500).json({ success: false, error: error.message || 'Internal error' });
    }
  }

  /**
   * GET /api/platforms/:type/connect
   */
  async getAuthUrl(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, error: 'Not authenticated' });
      }

      const platformType = req.params.type.toUpperCase() as PlatformType;

      const authUrl = platformsService.getAuthUrl(platformType, req.user.userId);

      res.status(200).json({
        success: true,
        data: { authUrl },
      });
    } catch (error: any) {
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({ success: false, error: error.message });
      }
      logger.error('Get auth URL error:', error);
      res.status(500).json({ success: false, error: error.message || 'Internal error' });
    }
  }

  /**
   * GET /api/platforms/:type/callback
   */
  async handleCallback(req: AuthRequest, res: Response) {
    try {
      const { code, state } = req.query;

      if (!code || !state) {
        return res.status(400).json({
          success: false,
          error: 'Missing code or state parameter',
        });
      }

      // Decode state to get user ID and platform type
      const decodedState = JSON.parse(
        Buffer.from(state as string, 'base64').toString()
      );

      const result = await platformsService.connectPlatform(
        decodedState.userId,
        decodedState.platformType,
        code as string,
        state as string
      );

      // Redirect to frontend with success
      res.redirect(`${process.env.FRONTEND_URL}/platforms?success=true`);
    } catch (error: any) {
      logger.error('OAuth callback error:', error);
      // Redirect to frontend with error
      res.redirect(`${process.env.FRONTEND_URL}/platforms?error=${encodeURIComponent(error.message)}`);
    }
  }

  /**
   * DELETE /api/platforms/:id
   */
  async disconnectPlatform(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, error: 'Not authenticated' });
      }

      const { id } = req.params;

      await platformsService.disconnectPlatform(req.user.userId, id);

      res.status(200).json({
        success: true,
        message: 'Platform disconnected successfully',
      });
    } catch (error: any) {
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({ success: false, error: error.message });
      }
      logger.error('Disconnect platform error:', error);
      res.status(500).json({ success: false, error: error.message || 'Internal error' });
    }
  }

  /**
   * GET /api/platforms/:id/pixels
   */
  async getPixels(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, error: 'Not authenticated' });
      }

      const { id } = req.params;
      const result = await platformsService.getPixelInfo(req.user.userId, id);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({ success: false, error: error.message });
      }
      logger.error('Get pixels error:', error);
      res.status(500).json({ success: false, error: error.message || 'Internal error' });
    }
  }

  /**
   * GET /api/platforms/:id/pages
   */
  async getPages(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, error: 'Not authenticated' });
      }

      const { id } = req.params;
      const pages = await platformsService.getPages(req.user.userId, id);

      res.status(200).json({
        success: true,
        data: pages,
      });
    } catch (error: any) {
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({ success: false, error: error.message });
      }
      logger.error('Get pages error:', error);
      res.status(500).json({ success: false, error: error.message || 'Internal error' });
    }
  }

  /**
   * GET /api/platforms/:id/pages/:pageId/posts
   */
  async getPagePosts(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, error: 'Not authenticated' });
      }

      const { id, pageId } = req.params;
      const posts = await platformsService.getPagePosts(req.user.userId, id, pageId);

      res.status(200).json({
        success: true,
        data: posts,
      });
    } catch (error: any) {
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({ success: false, error: error.message });
      }
      logger.error('Get page posts error:', error);
      res.status(500).json({ success: false, error: error.message || 'Internal error' });
    }
  }

  /**
   * POST /api/platforms/:id/sync
   */
  async syncPlatform(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, error: 'Not authenticated' });
      }

      const { id } = req.params;

      const result = await platformsService.syncPlatformCampaigns(id);

      // Clear campaigns cache so new data appears immediately
      await cache.delPattern(`campaigns:${req.user.userId}:*`);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({ success: false, error: error.message });
      }
      logger.error('Sync platform error:', error);
      res.status(500).json({ success: false, error: error.message || 'Internal error' });
    }
  }

  /**
   * POST /api/platforms/sync-all
   */
  async syncAllPlatforms(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, error: 'Not authenticated' });
      }

      const userId = req.user.userId;

      // Only sync FACEBOOK platforms (Instagram uses the same API/accounts, avoid double sync)
      // Also skip demo accounts (externalId starting with act_fb_, ig_, gads_, tt_)
      const platforms = await prisma.platform.findMany({
        where: {
          userId,
          isConnected: true,
          type: 'FACEBOOK',
          NOT: {
            externalId: { startsWith: 'act_fb_' },
          },
        },
        select: { id: true, name: true, type: true, externalId: true },
      });

      if (platforms.length === 0) {
        return res.status(200).json({
          success: true,
          data: { platforms: 0 },
          message: 'Nenhuma plataforma conectada',
        });
      }

      // Respond immediately, sync in background
      res.status(200).json({
        success: true,
        data: { platforms: platforms.length },
        message: `Sincronizando ${platforms.length} conta(s) de anúncio... As campanhas aparecerão em alguns segundos.`,
      });

      // Run sync in background (fire-and-forget)
      (async () => {
        let totalCampaigns = 0;
        let totalMetrics = 0;

        for (const platform of platforms) {
          try {
            const result = await platformsService.syncPlatformCampaigns(platform.id);
            totalCampaigns += result.synced;
            totalMetrics += result.metricsSynced;
          } catch (err: any) {
            logger.warn(`Sync failed for platform ${platform.name}: ${err.message}`);
          }
        }

        // Instagram uses the same Facebook API/accounts - no need to sync separately
        // Instagram campaigns are already included in the Facebook sync

        // Clear campaigns cache after all syncs complete
        await cache.delPattern(`campaigns:${userId}:*`);

        logger.info(`Sync-all completed for user ${userId}: ${totalCampaigns} campaigns, ${totalMetrics} metrics`);
      })().catch(err => logger.error('Background sync-all error:', err));
    } catch (error: any) {
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({ success: false, error: error.message });
      }
      logger.error('Sync all platforms error:', error);
      res.status(500).json({ success: false, error: error.message || 'Internal error' });
    }
  }
}

export const platformsController = new PlatformsController();
