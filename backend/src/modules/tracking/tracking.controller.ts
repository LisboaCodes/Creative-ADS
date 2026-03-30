import { Request, Response } from 'express';
import { ZodError } from 'zod';
import { AuthRequest } from '../auth/auth.middleware';
import { trackingService } from './tracking.service';
import {
  createTrackingLinkSchema,
  updateTrackingLinkSchema,
  createLeadSchema,
  updateLeadSchema,
  webhookLeadSchema,
  dashboardQuerySchema,
} from './tracking.schemas';
import { logger } from '../../utils/logger';
import { AppError } from '../../utils/errors';
import { prisma } from '../../config/database';

export class TrackingController {
  // ─── Tracking Links ─────────────

  async listLinks(req: AuthRequest, res: Response) {
    try {
      if (!req.user) return res.status(401).json({ success: false, error: 'Not authenticated' });
      const links = await trackingService.getLinks(req.user.userId);
      res.json({ success: true, data: links });
    } catch (error: any) {
      if (error instanceof AppError) return res.status(error.statusCode).json({ success: false, error: error.message });
      logger.error('List tracking links error:', error);
      res.status(500).json({ success: false, error: error.message || 'Internal error' });
    }
  }

  async getLinkById(req: AuthRequest, res: Response) {
    try {
      if (!req.user) return res.status(401).json({ success: false, error: 'Not authenticated' });
      const link = await trackingService.getLinkById(req.params.id, req.user.userId);
      res.json({ success: true, data: link });
    } catch (error: any) {
      if (error instanceof AppError) return res.status(error.statusCode).json({ success: false, error: error.message });
      logger.error('Get tracking link error:', error);
      res.status(500).json({ success: false, error: error.message || 'Internal error' });
    }
  }

  async createLink(req: AuthRequest, res: Response) {
    try {
      if (!req.user) return res.status(401).json({ success: false, error: 'Not authenticated' });
      const input = createTrackingLinkSchema.parse(req.body);
      const link = await trackingService.createLink(req.user.userId, input);
      res.status(201).json({ success: true, data: link });
    } catch (error: any) {
      if (error instanceof ZodError) return res.status(422).json({ success: false, error: error.errors });
      if (error instanceof AppError) return res.status(error.statusCode).json({ success: false, error: error.message });
      logger.error('Create tracking link error:', error);
      res.status(500).json({ success: false, error: error.message || 'Internal error' });
    }
  }

  async updateLink(req: AuthRequest, res: Response) {
    try {
      if (!req.user) return res.status(401).json({ success: false, error: 'Not authenticated' });
      const input = updateTrackingLinkSchema.parse(req.body);
      const link = await trackingService.updateLink(req.params.id, req.user.userId, input);
      res.json({ success: true, data: link });
    } catch (error: any) {
      if (error instanceof ZodError) return res.status(422).json({ success: false, error: error.errors });
      if (error instanceof AppError) return res.status(error.statusCode).json({ success: false, error: error.message });
      logger.error('Update tracking link error:', error);
      res.status(500).json({ success: false, error: error.message || 'Internal error' });
    }
  }

  async deleteLink(req: AuthRequest, res: Response) {
    try {
      if (!req.user) return res.status(401).json({ success: false, error: 'Not authenticated' });
      await trackingService.deleteLink(req.params.id, req.user.userId);
      res.json({ success: true, data: { deleted: true } });
    } catch (error: any) {
      if (error instanceof AppError) return res.status(error.statusCode).json({ success: false, error: error.message });
      logger.error('Delete tracking link error:', error);
      res.status(500).json({ success: false, error: error.message || 'Internal error' });
    }
  }

  // ─── Redirect ─────────────

  async handleRedirect(req: Request, res: Response) {
    try {
      const { shortCode } = req.params;
      const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || '';
      const userAgent = req.headers['user-agent'] || '';
      const referer = req.headers['referer'];

      const destinationUrl = await trackingService.recordClick(shortCode, ip, userAgent, referer);

      if (!destinationUrl) {
        return res.status(404).json({ success: false, error: 'Link not found or inactive' });
      }

      res.redirect(302, destinationUrl);
    } catch (error: any) {
      logger.error('Redirect error:', error);
      res.status(500).json({ success: false, error: 'Internal error' });
    }
  }

  // ─── Leads ─────────────

  async listLeads(req: AuthRequest, res: Response) {
    try {
      if (!req.user) return res.status(401).json({ success: false, error: 'Not authenticated' });
      const filters = {
        startDate: req.query.startDate as string | undefined,
        endDate: req.query.endDate as string | undefined,
        source: req.query.source as string | undefined,
        status: req.query.status as string | undefined,
        campaignId: req.query.campaignId as string | undefined,
        search: req.query.search as string | undefined,
      };
      const leads = await trackingService.getLeads(req.user.userId, filters);
      res.json({ success: true, data: leads });
    } catch (error: any) {
      if (error instanceof AppError) return res.status(error.statusCode).json({ success: false, error: error.message });
      logger.error('List leads error:', error);
      res.status(500).json({ success: false, error: error.message || 'Internal error' });
    }
  }

  async getLeadById(req: AuthRequest, res: Response) {
    try {
      if (!req.user) return res.status(401).json({ success: false, error: 'Not authenticated' });
      const lead = await trackingService.getLeadById(req.params.id, req.user.userId);
      res.json({ success: true, data: lead });
    } catch (error: any) {
      if (error instanceof AppError) return res.status(error.statusCode).json({ success: false, error: error.message });
      logger.error('Get lead error:', error);
      res.status(500).json({ success: false, error: error.message || 'Internal error' });
    }
  }

  async createLead(req: AuthRequest, res: Response) {
    try {
      if (!req.user) return res.status(401).json({ success: false, error: 'Not authenticated' });
      const input = createLeadSchema.parse(req.body);
      const lead = await trackingService.createLead(req.user.userId, input);
      res.status(201).json({ success: true, data: lead });
    } catch (error: any) {
      if (error instanceof ZodError) return res.status(422).json({ success: false, error: error.errors });
      if (error instanceof AppError) return res.status(error.statusCode).json({ success: false, error: error.message });
      logger.error('Create lead error:', error);
      res.status(500).json({ success: false, error: error.message || 'Internal error' });
    }
  }

  async updateLead(req: AuthRequest, res: Response) {
    try {
      if (!req.user) return res.status(401).json({ success: false, error: 'Not authenticated' });
      const input = updateLeadSchema.parse(req.body);
      const lead = await trackingService.updateLead(req.params.id, req.user.userId, input);
      res.json({ success: true, data: lead });
    } catch (error: any) {
      if (error instanceof ZodError) return res.status(422).json({ success: false, error: error.errors });
      if (error instanceof AppError) return res.status(error.statusCode).json({ success: false, error: error.message });
      logger.error('Update lead error:', error);
      res.status(500).json({ success: false, error: error.message || 'Internal error' });
    }
  }

  async deleteLead(req: AuthRequest, res: Response) {
    try {
      if (!req.user) return res.status(401).json({ success: false, error: 'Not authenticated' });
      await trackingService.deleteLead(req.params.id, req.user.userId);
      res.json({ success: true, data: { deleted: true } });
    } catch (error: any) {
      if (error instanceof AppError) return res.status(error.statusCode).json({ success: false, error: error.message });
      logger.error('Delete lead error:', error);
      res.status(500).json({ success: false, error: error.message || 'Internal error' });
    }
  }

  // ─── Webhook ─────────────

  async webhookCapture(req: Request, res: Response) {
    try {
      const apiKey = req.query.api_key as string;
      if (!apiKey) {
        return res.status(401).json({ success: false, error: 'API key required' });
      }

      // Find user by API key
      const user = await prisma.user.findFirst({
        where: { trackingApiKey: apiKey },
        select: { id: true },
      });

      if (!user) {
        return res.status(401).json({ success: false, error: 'Invalid API key' });
      }

      const input = webhookLeadSchema.parse(req.body);
      const lead = await trackingService.captureFromWebhook(user.id, input);
      res.status(201).json({ success: true, data: lead });
    } catch (error: any) {
      if (error instanceof ZodError) return res.status(422).json({ success: false, error: error.errors });
      logger.error('Webhook capture error:', error);
      res.status(500).json({ success: false, error: error.message || 'Internal error' });
    }
  }

  // ─── Dashboard ─────────────

  async getDashboard(req: AuthRequest, res: Response) {
    try {
      if (!req.user) return res.status(401).json({ success: false, error: 'Not authenticated' });
      const filters = dashboardQuerySchema.parse(req.query);

      const [stats, timeSeries, bySource] = await Promise.all([
        trackingService.getDashboardStats(req.user.userId, filters),
        trackingService.getLeadsOverTime(req.user.userId, filters),
        trackingService.getLeadsBySource(req.user.userId, filters),
      ]);

      res.json({ success: true, data: { stats, timeSeries, bySource } });
    } catch (error: any) {
      if (error instanceof AppError) return res.status(error.statusCode).json({ success: false, error: error.message });
      logger.error('Dashboard error:', error);
      res.status(500).json({ success: false, error: error.message || 'Internal error' });
    }
  }

  // ─── API Key ─────────────

  async getApiKey(req: AuthRequest, res: Response) {
    try {
      if (!req.user) return res.status(401).json({ success: false, error: 'Not authenticated' });
      const apiKey = await trackingService.getApiKey(req.user.userId);
      res.json({ success: true, data: { apiKey } });
    } catch (error: any) {
      logger.error('Get API key error:', error);
      res.status(500).json({ success: false, error: error.message || 'Internal error' });
    }
  }

  async regenerateApiKey(req: AuthRequest, res: Response) {
    try {
      if (!req.user) return res.status(401).json({ success: false, error: 'Not authenticated' });
      const apiKey = await trackingService.regenerateApiKey(req.user.userId);
      res.json({ success: true, data: { apiKey } });
    } catch (error: any) {
      logger.error('Regenerate API key error:', error);
      res.status(500).json({ success: false, error: error.message || 'Internal error' });
    }
  }
}

export const trackingController = new TrackingController();
