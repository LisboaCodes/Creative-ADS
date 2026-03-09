import { Response } from 'express';
import multer from 'multer';
import { ZodError } from 'zod';
import { campaignsService } from './campaigns.service';
import { logger } from '../../utils/logger';
import { AppError } from '../../utils/errors';
import { whatsAppNotificationsService } from '../whatsapp/whatsapp-notifications.service';
import type { AuthRequest } from '../auth/auth.middleware';
import {
  campaignFiltersSchema,
  updateCampaignStatusSchema,
  updateCampaignBudgetSchema,
  bulkActionSchema,
  createCampaignSchema,
  aiSuggestSchema,
  applyTemplateSchema,
  updateDraftSchema,
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
   * GET /api/campaigns/adsets
   */
  async getAdSets(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, error: 'Not authenticated' });
      }

      const { campaignId, status, search, page, limit } = req.query as any;
      const result = await campaignsService.getAdSets(req.user.userId, {
        campaignId,
        status,
        search,
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
      });

      res.status(200).json({ success: true, data: result });
    } catch (error: any) {
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({ success: false, error: error.message });
      }
      logger.error('Get ad sets error:', error);
      res.status(500).json({ success: false, error: error.message || 'Internal error' });
    }
  }

  /**
   * GET /api/campaigns/ads
   */
  async getAds(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, error: 'Not authenticated' });
      }

      const { adSetId, campaignId, status, search, page, limit } = req.query as any;
      const result = await campaignsService.getAds(req.user.userId, {
        adSetId,
        campaignId,
        status,
        search,
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
      });

      res.status(200).json({ success: true, data: result });
    } catch (error: any) {
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({ success: false, error: error.message });
      }
      logger.error('Get ads error:', error);
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

  /**
   * POST /api/campaigns/:id/publish
   */
  async publishDraft(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, error: 'Not authenticated' });
      }

      const result = await campaignsService.publishDraft(req.user.userId, req.params.id);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({ success: false, error: error.message });
      }
      logger.error('Publish draft error:', error);
      res.status(500).json({ success: false, error: error.message || 'Internal error' });
    }
  }

  /**
   * PUT /api/campaigns/:id/draft
   */
  async updateDraft(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, error: 'Not authenticated' });
      }

      const data = updateDraftSchema.parse(req.body);
      const result = await campaignsService.updateDraft(req.user.userId, req.params.id, data);

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
      logger.error('Update draft error:', error);
      res.status(500).json({ success: false, error: error.message || 'Internal error' });
    }
  }

  /**
   * POST /api/campaigns/apply-template
   */
  async applyTemplate(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, error: 'Not authenticated' });
      }

      const data = applyTemplateSchema.parse(req.body);
      const result = await campaignsService.applyTemplate(req.user.userId, data);

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
      logger.error('Apply template error:', error);
      res.status(500).json({ success: false, error: error.message || 'Internal error' });
    }
  }
  /**
   * POST /api/campaigns/:id/send-client-update
   */
  async sendClientUpdate(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, error: 'Not authenticated' });
      }

      const result = await whatsAppNotificationsService.sendCampaignUpdate(
        req.user.userId,
        req.params.id
      );

      res.status(200).json({
        success: true,
        data: result,
        message: `Atualização enviada para ${result.sent} grupo(s)`,
      });
    } catch (error: any) {
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({ success: false, error: error.message });
      }
      logger.error('Send client update error:', error);
      res.status(500).json({ success: false, error: error.message || 'Erro ao enviar atualização' });
    }
  }
  /**
   * POST /api/campaigns/:id/duplicate - Duplicate campaign to another BM/platform
   */
  async duplicateCampaign(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, error: 'Not authenticated' });
      }

      const { targetPlatformId } = req.body;
      if (!targetPlatformId) {
        return res.status(422).json({ success: false, error: 'targetPlatformId é obrigatório' });
      }

      const duplicate = await campaignsService.duplicateCampaign(
        req.params.id,
        req.user.userId,
        targetPlatformId
      );

      res.status(201).json({ success: true, data: duplicate });
    } catch (error: any) {
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({ success: false, error: error.message });
      }
      logger.error('Duplicate campaign error:', error);
      res.status(500).json({ success: false, error: error.message || 'Erro ao duplicar campanha' });
    }
  }
}

export const campaignsController = new CampaignsController();
