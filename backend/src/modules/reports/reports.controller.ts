import { Response } from 'express';
import { ZodError } from 'zod';
import { AuthRequest } from '../auth/auth.middleware';
import { reportsService } from './reports.service';
import { generateReportSchema } from './reports.schemas';
import { logger } from '../../utils/logger';
import { AppError } from '../../utils/errors';

export class ReportsController {
  /**
   * POST /api/reports - Generate a new report
   */
  async generate(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, error: 'Not authenticated' });
      }

      const input = generateReportSchema.parse(req.body);
      const result = await reportsService.generateReport(req.user.userId, input);

      res.status(201).json({
        success: true,
        data: result.report,
      });
    } catch (error: any) {
      if (error instanceof ZodError) {
        return res.status(422).json({ success: false, error: error.errors });
      }
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({ success: false, error: error.message });
      }
      logger.error('Generate report error:', error);
      res.status(500).json({ success: false, error: error.message || 'Internal error' });
    }
  }

  /**
   * GET /api/reports - List all reports
   */
  async list(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, error: 'Not authenticated' });
      }

      const reports = await reportsService.getReports(req.user.userId);

      res.status(200).json({
        success: true,
        data: reports,
      });
    } catch (error: any) {
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({ success: false, error: error.message });
      }
      logger.error('List reports error:', error);
      res.status(500).json({ success: false, error: error.message || 'Internal error' });
    }
  }

  /**
   * GET /api/reports/:id - Get a single report
   */
  async getById(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, error: 'Not authenticated' });
      }

      const report = await reportsService.getReportById(req.params.id, req.user.userId);

      res.status(200).json({
        success: true,
        data: report,
      });
    } catch (error: any) {
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({ success: false, error: error.message });
      }
      logger.error('Get report error:', error);
      res.status(500).json({ success: false, error: error.message || 'Internal error' });
    }
  }

  /**
   * DELETE /api/reports/:id - Delete a report
   */
  async delete(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, error: 'Not authenticated' });
      }

      await reportsService.deleteReport(req.params.id, req.user.userId);

      res.status(200).json({
        success: true,
        data: { deleted: true },
      });
    } catch (error: any) {
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({ success: false, error: error.message });
      }
      logger.error('Delete report error:', error);
      res.status(500).json({ success: false, error: error.message || 'Internal error' });
    }
  }

  /**
   * GET /api/reports/:id/html - Get report as standalone HTML
   */
  async getHtml(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, error: 'Not authenticated' });
      }

      const html = await reportsService.getReportHtml(req.params.id, req.user.userId);

      res.setHeader('Content-Type', 'text/html');
      res.send(html);
    } catch (error: any) {
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({ success: false, error: error.message });
      }
      logger.error('Get report HTML error:', error);
      res.status(500).json({ success: false, error: error.message || 'Internal error' });
    }
  }
}

export const reportsController = new ReportsController();
