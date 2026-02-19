import { Response } from 'express';
import { campaignsService } from './campaigns.service';
import { logger } from '../../utils/logger';
import type { AuthRequest } from '../auth/auth.middleware';
import {
  campaignFiltersSchema,
  updateCampaignStatusSchema,
  updateCampaignBudgetSchema,
  bulkActionSchema,
} from './campaigns.schemas';

export class CampaignsController {
  /**
   * GET /api/campaigns
   */
  async getCampaigns(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, error: 'Not authenticated' });
      }

      const filters = campaignFiltersSchema.parse(req.query);
      const result = await campaignsService.getCampaigns(req.user.userId, filters);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      logger.error('Get campaigns error:', error);
      res.status(400).json({
        success: false,
        error: error.message || 'Failed to get campaigns',
      });
    }
  }

  /**
   * GET /api/campaigns/:id
   */
  async getCampaignById(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, error: 'Not authenticated' });
      }

      const campaign = await campaignsService.getCampaignById(
        req.params.id,
        req.user.userId
      );

      res.status(200).json({
        success: true,
        data: campaign,
      });
    } catch (error: any) {
      logger.error('Get campaign error:', error);
      res.status(400).json({
        success: false,
        error: error.message || 'Failed to get campaign',
      });
    }
  }

  /**
   * PATCH /api/campaigns/:id/status
   */
  async updateStatus(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, error: 'Not authenticated' });
      }

      const data = updateCampaignStatusSchema.parse(req.body);
      const campaign = await campaignsService.updateCampaignStatus(
        req.params.id,
        req.user.userId,
        data
      );

      res.status(200).json({
        success: true,
        data: campaign,
      });
    } catch (error: any) {
      logger.error('Update campaign status error:', error);
      res.status(400).json({
        success: false,
        error: error.message || 'Failed to update campaign status',
      });
    }
  }

  /**
   * PATCH /api/campaigns/:id/budget
   */
  async updateBudget(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, error: 'Not authenticated' });
      }

      const data = updateCampaignBudgetSchema.parse(req.body);
      const campaign = await campaignsService.updateCampaignBudget(
        req.params.id,
        req.user.userId,
        data
      );

      res.status(200).json({
        success: true,
        data: campaign,
      });
    } catch (error: any) {
      logger.error('Update campaign budget error:', error);
      res.status(400).json({
        success: false,
        error: error.message || 'Failed to update campaign budget',
      });
    }
  }

  /**
   * POST /api/campaigns/bulk-action
   */
  async bulkAction(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, error: 'Not authenticated' });
      }

      const { campaignIds, action } = bulkActionSchema.parse(req.body);
      const result = await campaignsService.bulkAction(
        req.user.userId,
        campaignIds,
        action
      );

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      logger.error('Bulk action error:', error);
      res.status(400).json({
        success: false,
        error: error.message || 'Failed to perform bulk action',
      });
    }
  }
}

export const campaignsController = new CampaignsController();
