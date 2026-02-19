import { Response } from 'express';
import { platformsService } from './platforms.service';
import { logger } from '../../utils/logger';
import type { AuthRequest } from '../auth/auth.middleware';
import { PlatformType } from '@prisma/client';

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
      logger.error('Get platforms error:', error);
      res.status(400).json({
        success: false,
        error: error.message || 'Failed to get platforms',
      });
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
      logger.error('Get auth URL error:', error);
      res.status(400).json({
        success: false,
        error: error.message || 'Failed to get auth URL',
      });
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
      logger.error('Disconnect platform error:', error);
      res.status(400).json({
        success: false,
        error: error.message || 'Failed to disconnect platform',
      });
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

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      logger.error('Sync platform error:', error);
      res.status(400).json({
        success: false,
        error: error.message || 'Failed to sync platform',
      });
    }
  }
}

export const platformsController = new PlatformsController();
