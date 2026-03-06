import { Request, Response } from 'express';
import { campaignLibraryService } from './campaign-library.service';
import { logger } from '../../utils/logger';
import { AppError } from '../../utils/errors';

export class CampaignLibraryController {
  async getTemplates(req: Request, res: Response) {
    try {
      const { niche, platform, objective, category, difficulty, search, year, page, limit } = req.query as Record<string, string>;

      const result = await campaignLibraryService.getTemplates({
        niche,
        platform,
        objective,
        category,
        difficulty,
        search,
        year: year ? Number(year) : undefined,
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
      });

      res.status(200).json({ success: true, data: result });
    } catch (error: any) {
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({ success: false, error: error.message });
      }
      logger.error('Get campaign templates error:', error);
      res.status(500).json({ success: false, error: error.message || 'Internal error' });
    }
  }

  async getTemplateById(req: Request, res: Response) {
    try {
      const template = await campaignLibraryService.getTemplateById(req.params.id);
      res.status(200).json({ success: true, data: template });
    } catch (error: any) {
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({ success: false, error: error.message });
      }
      logger.error('Get campaign template error:', error);
      res.status(500).json({ success: false, error: error.message || 'Internal error' });
    }
  }

  async getOverview(req: Request, res: Response) {
    try {
      const overview = await campaignLibraryService.getOverview();
      res.status(200).json({ success: true, data: overview });
    } catch (error: any) {
      logger.error('Get campaign library overview error:', error);
      res.status(500).json({ success: false, error: error.message || 'Internal error' });
    }
  }
}

export const campaignLibraryController = new CampaignLibraryController();
