import { Response } from 'express';
import { adLibraryService } from './ad-library.service';
import { logger } from '../../utils/logger';
import type { AuthRequest } from '../auth/auth.middleware';
import { z } from 'zod';

const searchSchema = z.object({
  q: z.string().optional(),
  pageId: z.string().optional(),
  country: z.string().default('BR'),
  adType: z.enum(['ALL', 'POLITICAL_AND_ISSUE_ADS']).default('ALL'),
  limit: z.string().transform(Number).default('25'),
  after: z.string().optional(),
});

export class AdLibraryController {
  /**
   * GET /api/ad-library/search
   */
  async search(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, error: 'Not authenticated' });
      }

      const params = searchSchema.parse(req.query);

      const result = await adLibraryService.searchAds(req.user.userId, {
        searchTerms: params.q,
        pageId: params.pageId,
        country: params.country,
        adType: params.adType,
        limit: params.limit,
        after: params.after,
      });

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      logger.error('Ad Library search error:', error);
      res.status(400).json({
        success: false,
        error: error.message || 'Falha ao buscar na Ad Library',
      });
    }
  }
}

export const adLibraryController = new AdLibraryController();
