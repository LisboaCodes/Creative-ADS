import { Response } from 'express';
import { ZodError } from 'zod';
import { AuthRequest } from '../auth/auth.middleware';
import { pixelService } from './pixel.service';
import { createPixelConfigSchema, updatePixelConfigSchema } from './pixel.schemas';
import { logger } from '../../utils/logger';
import { AppError } from '../../utils/errors';

export class PixelController {
  async list(req: AuthRequest, res: Response) {
    try {
      if (!req.user) return res.status(401).json({ success: false, error: 'Not authenticated' });
      const configs = await pixelService.getConfigs(req.user.userId);
      res.json({ success: true, data: configs });
    } catch (error: any) {
      if (error instanceof AppError) return res.status(error.statusCode).json({ success: false, error: error.message });
      logger.error('List pixel configs error:', error);
      res.status(500).json({ success: false, error: error.message || 'Internal error' });
    }
  }

  async create(req: AuthRequest, res: Response) {
    try {
      if (!req.user) return res.status(401).json({ success: false, error: 'Not authenticated' });
      const input = createPixelConfigSchema.parse(req.body);
      const config = await pixelService.createConfig(req.user.userId, input);
      res.status(201).json({ success: true, data: config });
    } catch (error: any) {
      if (error instanceof ZodError) return res.status(422).json({ success: false, error: error.errors });
      if (error instanceof AppError) return res.status(error.statusCode).json({ success: false, error: error.message });
      logger.error('Create pixel config error:', error);
      res.status(500).json({ success: false, error: error.message || 'Internal error' });
    }
  }

  async update(req: AuthRequest, res: Response) {
    try {
      if (!req.user) return res.status(401).json({ success: false, error: 'Not authenticated' });
      const input = updatePixelConfigSchema.parse(req.body);
      const config = await pixelService.updateConfig(req.params.id, req.user.userId, input);
      res.json({ success: true, data: config });
    } catch (error: any) {
      if (error instanceof ZodError) return res.status(422).json({ success: false, error: error.errors });
      if (error instanceof AppError) return res.status(error.statusCode).json({ success: false, error: error.message });
      logger.error('Update pixel config error:', error);
      res.status(500).json({ success: false, error: error.message || 'Internal error' });
    }
  }

  async delete(req: AuthRequest, res: Response) {
    try {
      if (!req.user) return res.status(401).json({ success: false, error: 'Not authenticated' });
      await pixelService.deleteConfig(req.params.id, req.user.userId);
      res.json({ success: true, data: { deleted: true } });
    } catch (error: any) {
      if (error instanceof AppError) return res.status(error.statusCode).json({ success: false, error: error.message });
      logger.error('Delete pixel config error:', error);
      res.status(500).json({ success: false, error: error.message || 'Internal error' });
    }
  }

  async test(req: AuthRequest, res: Response) {
    try {
      if (!req.user) return res.status(401).json({ success: false, error: 'Not authenticated' });
      const result = await pixelService.testPixel(req.params.id, req.user.userId);
      res.json({ success: true, data: result });
    } catch (error: any) {
      if (error instanceof AppError) return res.status(error.statusCode).json({ success: false, error: error.message });
      logger.error('Test pixel error:', error);
      res.status(500).json({ success: false, error: error.message || 'Internal error' });
    }
  }
}

export const pixelController = new PixelController();
