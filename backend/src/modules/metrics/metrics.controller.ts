import { Response } from 'express';
import { metricsService } from './metrics.service';
import { logger } from '../../utils/logger';
import type { AuthRequest } from '../auth/auth.middleware';
import { z } from 'zod';

const metricsFiltersSchema = z.object({
  startDate: z.string().transform((str) => new Date(str)),
  endDate: z.string().transform((str) => new Date(str)),
  platformTypes: z.string().optional().transform((str) => str?.split(',') as any),
});

export class MetricsController {
  /**
   * GET /api/metrics/overview
   */
  async getOverview(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, error: 'Not authenticated' });
      }

      const filters = metricsFiltersSchema.parse(req.query);
      const metrics = await metricsService.getOverviewMetrics(req.user.userId, filters);

      res.status(200).json({
        success: true,
        data: metrics,
      });
    } catch (error: any) {
      logger.error('Get overview metrics error:', error);
      res.status(400).json({
        success: false,
        error: error.message || 'Failed to get metrics',
      });
    }
  }

  /**
   * GET /api/metrics/campaign/:id
   */
  async getCampaignMetrics(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, error: 'Not authenticated' });
      }

      const filters = metricsFiltersSchema.parse(req.query);
      const metrics = await metricsService.getCampaignMetrics(
        req.params.id,
        req.user.userId,
        filters
      );

      res.status(200).json({
        success: true,
        data: metrics,
      });
    } catch (error: any) {
      logger.error('Get campaign metrics error:', error);
      res.status(400).json({
        success: false,
        error: error.message || 'Failed to get campaign metrics',
      });
    }
  }

  /**
   * GET /api/metrics/by-platform
   */
  async getByPlatform(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, error: 'Not authenticated' });
      }

      const filters = metricsFiltersSchema.parse(req.query);
      const metrics = await metricsService.getMetricsByPlatform(req.user.userId, filters);

      res.status(200).json({
        success: true,
        data: metrics,
      });
    } catch (error: any) {
      logger.error('Get metrics by platform error:', error);
      res.status(400).json({
        success: false,
        error: error.message || 'Failed to get metrics by platform',
      });
    }
  }

  /**
   * GET /api/metrics/time-series
   */
  async getTimeSeries(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, error: 'Not authenticated' });
      }

      const filters = {
        ...metricsFiltersSchema.parse(req.query),
        groupBy: (req.query.groupBy as 'day' | 'week' | 'month') || 'day',
      };

      const metrics = await metricsService.getTimeSeriesMetrics(req.user.userId, filters);

      res.status(200).json({
        success: true,
        data: metrics,
      });
    } catch (error: any) {
      logger.error('Get time series metrics error:', error);
      res.status(400).json({
        success: false,
        error: error.message || 'Failed to get time series metrics',
      });
    }
  }
}

export const metricsController = new MetricsController();
