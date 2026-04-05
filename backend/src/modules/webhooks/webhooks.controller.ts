import { Response } from 'express';
import { ZodError } from 'zod';
import { AuthRequest } from '../auth/auth.middleware';
import { webhooksService } from './webhooks.service';
import { createWebhookEndpointSchema, updateWebhookEndpointSchema } from './webhooks.schemas';
import { logger } from '../../utils/logger';
import { AppError } from '../../utils/errors';

export class WebhooksController {
  async list(req: AuthRequest, res: Response) {
    try {
      if (!req.user) return res.status(401).json({ success: false, error: 'Not authenticated' });
      const endpoints = await webhooksService.getEndpoints(req.user.userId);
      res.json({ success: true, data: endpoints });
    } catch (error: any) {
      if (error instanceof AppError) return res.status(error.statusCode).json({ success: false, error: error.message });
      logger.error('List webhook endpoints error:', error);
      res.status(500).json({ success: false, error: error.message || 'Internal error' });
    }
  }

  async create(req: AuthRequest, res: Response) {
    try {
      if (!req.user) return res.status(401).json({ success: false, error: 'Not authenticated' });
      const input = createWebhookEndpointSchema.parse(req.body);
      const endpoint = await webhooksService.createEndpoint(req.user.userId, input);
      res.status(201).json({ success: true, data: endpoint });
    } catch (error: any) {
      if (error instanceof ZodError) return res.status(422).json({ success: false, error: error.errors });
      if (error instanceof AppError) return res.status(error.statusCode).json({ success: false, error: error.message });
      logger.error('Create webhook endpoint error:', error);
      res.status(500).json({ success: false, error: error.message || 'Internal error' });
    }
  }

  async update(req: AuthRequest, res: Response) {
    try {
      if (!req.user) return res.status(401).json({ success: false, error: 'Not authenticated' });
      const input = updateWebhookEndpointSchema.parse(req.body);
      const endpoint = await webhooksService.updateEndpoint(req.params.id, req.user.userId, input);
      res.json({ success: true, data: endpoint });
    } catch (error: any) {
      if (error instanceof ZodError) return res.status(422).json({ success: false, error: error.errors });
      if (error instanceof AppError) return res.status(error.statusCode).json({ success: false, error: error.message });
      logger.error('Update webhook endpoint error:', error);
      res.status(500).json({ success: false, error: error.message || 'Internal error' });
    }
  }

  async delete(req: AuthRequest, res: Response) {
    try {
      if (!req.user) return res.status(401).json({ success: false, error: 'Not authenticated' });
      await webhooksService.deleteEndpoint(req.params.id, req.user.userId);
      res.json({ success: true, data: { deleted: true } });
    } catch (error: any) {
      if (error instanceof AppError) return res.status(error.statusCode).json({ success: false, error: error.message });
      logger.error('Delete webhook endpoint error:', error);
      res.status(500).json({ success: false, error: error.message || 'Internal error' });
    }
  }

  async test(req: AuthRequest, res: Response) {
    try {
      if (!req.user) return res.status(401).json({ success: false, error: 'Not authenticated' });
      const result = await webhooksService.testEndpoint(req.params.id, req.user.userId);
      res.json({ success: true, data: result });
    } catch (error: any) {
      if (error instanceof AppError) return res.status(error.statusCode).json({ success: false, error: error.message });
      logger.error('Test webhook error:', error);
      res.status(500).json({ success: false, error: error.message || 'Internal error' });
    }
  }

  async deliveries(req: AuthRequest, res: Response) {
    try {
      if (!req.user) return res.status(401).json({ success: false, error: 'Not authenticated' });
      const deliveries = await webhooksService.getDeliveries(req.params.id, req.user.userId);
      res.json({ success: true, data: deliveries });
    } catch (error: any) {
      if (error instanceof AppError) return res.status(error.statusCode).json({ success: false, error: error.message });
      logger.error('Get webhook deliveries error:', error);
      res.status(500).json({ success: false, error: error.message || 'Internal error' });
    }
  }
}

export const webhooksController = new WebhooksController();
