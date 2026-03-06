import { Response } from 'express';
import multer from 'multer';
import { ZodError } from 'zod';
import { campaignsService } from './campaigns.service';
import { logger } from '../../utils/logger';
import { AppError } from '../../utils/errors';
import type { AuthRequest } from '../auth/auth.middleware';
import {
  campaignFiltersSchema,
  updateCampaignStatusSchema,
  updateCampaignBudgetSchema,
  bulkActionSchema,
  createCampaignSchema,
  aiSuggestSchema,
} from './campaigns.schemas';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 30 * 1024 * 1024 }, // 30MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Apenas imagens e vídeos são permitidos'));
    }
  },
});

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
      if (error instanceof ZodError) {
        return res.status(422).json({ success: false, error: error.errors });
      }
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({ success: false, error: error.message });
      }
      logger.error('Get campaigns error:', error);
      res.status(500).json({ success: false, error: error.message || 'Internal error' });
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
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({ success: false, error: error.message });
      }
      logger.error('Get campaign error:', error);
      res.status(500).json({ success: false, error: error.message || 'Internal error' });
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
      if (error instanceof ZodError) {
        return res.status(422).json({ success: false, error: error.errors });
      }
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({ success: false, error: error.message });
      }
      logger.error('Update campaign status error:', error);
      res.status(500).json({ success: false, error: error.message || 'Internal error' });
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
      if (error instanceof ZodError) {
        return res.status(422).json({ success: false, error: error.errors });
      }
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({ success: false, error: error.message });
      }
      logger.error('Update campaign budget error:', error);
      res.status(500).json({ success: false, error: error.message || 'Internal error' });
    }
  }

  /**
   * POST /api/campaigns
   */
  async createCampaign(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, error: 'Not authenticated' });
      }

      const data = createCampaignSchema.parse(req.body);
      const result = await campaignsService.createCampaign(
        req.user.userId,
        data.platformId,
        data
      );

      res.status(201).json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      if (error instanceof ZodError) {
        return res.status(422).json({ success: false, error: error.errors });
      }
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({ success: false, error: error.message });
      }
      logger.error('Create campaign error:', error);
      res.status(500).json({ success: false, error: error.message || 'Internal error' });
    }
  }

  /**
   * GET /api/campaigns/targeting/search
   */
  async searchTargeting(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, error: 'Not authenticated' });
      }

      const { platformId, q, type, locationTypes } = req.query as { platformId: string; q: string; type?: string; locationTypes?: string };
      if (!platformId || !q) {
        return res.status(400).json({ success: false, error: 'platformId and q are required' });
      }

      const results = await campaignsService.searchTargeting(
        req.user.userId,
        platformId,
        q,
        type,
        locationTypes
      );

      res.status(200).json({
        success: true,
        data: results,
      });
    } catch (error: any) {
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({ success: false, error: error.message });
      }
      logger.error('Search targeting error:', error);
      res.status(500).json({ success: false, error: error.message || 'Internal error' });
    }
  }

  /**
   * POST /api/campaigns/upload-image
   */
  async uploadImage(req: AuthRequest, res: Response) {
    upload.single('image')(req, res, async (err: any) => {
      try {
        if (err) {
          return res.status(400).json({ success: false, error: err.message });
        }

        if (!req.user) {
          return res.status(401).json({ success: false, error: 'Not authenticated' });
        }

        const file = (req as any).file;
        if (!file) {
          return res.status(400).json({ success: false, error: 'Nenhuma imagem enviada' });
        }

        const { platformId } = req.body;
        if (!platformId) {
          return res.status(400).json({ success: false, error: 'platformId é obrigatório' });
        }

        const result = await campaignsService.uploadAdImage(
          req.user.userId,
          platformId,
          file.buffer
        );

        res.status(200).json({
          success: true,
          data: result,
        });
      } catch (error: any) {
        if (error instanceof AppError) {
          return res.status(error.statusCode).json({ success: false, error: error.message });
        }
        logger.error('Upload image error:', error);
        res.status(500).json({ success: false, error: error.message || 'Internal error' });
      }
    });
  }

  /**
   * POST /api/campaigns/ai-suggest
   */
  async aiSuggest(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, error: 'Not authenticated' });
      }

      const data = aiSuggestSchema.parse(req.body);
      const result = await campaignsService.getAISuggestion(
        req.user.userId,
        data.type,
        data.context || {}
      );

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      if (error instanceof ZodError) {
        return res.status(422).json({ success: false, error: error.errors });
      }
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({ success: false, error: error.message });
      }
      logger.error('AI suggest error:', error);
      res.status(500).json({ success: false, error: error.message || 'Internal error' });
    }
  }

  /**
   * POST /api/campaigns/:id/tags
   */
  async addTag(req: AuthRequest, res: Response) {
    try {
      if (!req.user) return res.status(401).json({ success: false, error: 'Not authenticated' });
      const { name, color } = req.body;
      const tag = await campaignsService.addTag(req.user.userId, req.params.id, name, color);
      res.status(201).json({ success: true, data: tag });
    } catch (error: any) {
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({ success: false, error: error.message });
      }
      logger.error('Add tag error:', error);
      res.status(500).json({ success: false, error: error.message || 'Internal error' });
    }
  }

  /**
   * DELETE /api/campaigns/:id/tags/:tagId
   */
  async removeTag(req: AuthRequest, res: Response) {
    try {
      if (!req.user) return res.status(401).json({ success: false, error: 'Not authenticated' });
      await campaignsService.removeTag(req.user.userId, req.params.tagId);
      res.status(200).json({ success: true, message: 'Tag removida' });
    } catch (error: any) {
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({ success: false, error: error.message });
      }
      logger.error('Remove tag error:', error);
      res.status(500).json({ success: false, error: error.message || 'Internal error' });
    }
  }

  /**
   * GET /api/campaigns/audit-log
   */
  async getAuditLog(req: AuthRequest, res: Response) {
    try {
      if (!req.user) return res.status(401).json({ success: false, error: 'Not authenticated' });
      const { entityId } = req.query as { entityId?: string };
      const logs = await campaignsService.getAuditLog(req.user.userId, entityId);
      res.status(200).json({ success: true, data: logs });
    } catch (error: any) {
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({ success: false, error: error.message });
      }
      logger.error('Get audit log error:', error);
      res.status(500).json({ success: false, error: error.message || 'Internal error' });
    }
  }

  /**
   * GET /api/campaigns/forecast
   */
  async getForecast(req: AuthRequest, res: Response) {
    try {
      if (!req.user) return res.status(401).json({ success: false, error: 'Not authenticated' });
      const { campaignId } = req.query as { campaignId?: string };
      const forecast = await campaignsService.getForecast(req.user.userId, campaignId);
      res.status(200).json({ success: true, data: forecast });
    } catch (error: any) {
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({ success: false, error: error.message });
      }
      logger.error('Get forecast error:', error);
      res.status(500).json({ success: false, error: error.message || 'Internal error' });
    }
  }

  /**
   * GET /api/campaigns/insights
   */
  async getProactiveInsights(req: AuthRequest, res: Response) {
    try {
      if (!req.user) return res.status(401).json({ success: false, error: 'Not authenticated' });
      const insights = await campaignsService.getProactiveInsights(req.user.userId);
      res.status(200).json({ success: true, data: insights });
    } catch (error: any) {
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({ success: false, error: error.message });
      }
      logger.error('Get insights error:', error);
      res.status(500).json({ success: false, error: error.message || 'Internal error' });
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
      if (error instanceof ZodError) {
        return res.status(422).json({ success: false, error: error.errors });
      }
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({ success: false, error: error.message });
      }
      logger.error('Bulk action error:', error);
      res.status(500).json({ success: false, error: error.message || 'Internal error' });
    }
  }
}

export const campaignsController = new CampaignsController();
