import { Response } from 'express';
import { ZodError } from 'zod';
import { AuthRequest } from '../auth/auth.middleware';
import { conversionEventsService } from './conversion-events.service';
import { createConversionEventSchema, updateConversionEventSchema } from './conversion-events.schemas';
import { logger } from '../../utils/logger';
import { AppError } from '../../utils/errors';

export class ConversionEventsController {
  async list(req: AuthRequest, res: Response) {
    try {
      if (!req.user) return res.status(401).json({ success: false, error: 'Not authenticated' });
      const events = await conversionEventsService.getEvents(req.user.userId);
      res.json({ success: true, data: events });
    } catch (error: any) {
      if (error instanceof AppError) return res.status(error.statusCode).json({ success: false, error: error.message });
      logger.error('List conversion events error:', error);
      res.status(500).json({ success: false, error: error.message || 'Internal error' });
    }
  }

  async create(req: AuthRequest, res: Response) {
    try {
      if (!req.user) return res.status(401).json({ success: false, error: 'Not authenticated' });
      const input = createConversionEventSchema.parse(req.body);
      const event = await conversionEventsService.createEvent(req.user.userId, input);
      res.status(201).json({ success: true, data: event });
    } catch (error: any) {
      if (error instanceof ZodError) return res.status(422).json({ success: false, error: error.errors });
      if (error instanceof AppError) return res.status(error.statusCode).json({ success: false, error: error.message });
      logger.error('Create conversion event error:', error);
      res.status(500).json({ success: false, error: error.message || 'Internal error' });
    }
  }

  async update(req: AuthRequest, res: Response) {
    try {
      if (!req.user) return res.status(401).json({ success: false, error: 'Not authenticated' });
      const input = updateConversionEventSchema.parse(req.body);
      const event = await conversionEventsService.updateEvent(req.params.id, req.user.userId, input);
      res.json({ success: true, data: event });
    } catch (error: any) {
      if (error instanceof ZodError) return res.status(422).json({ success: false, error: error.errors });
      if (error instanceof AppError) return res.status(error.statusCode).json({ success: false, error: error.message });
      logger.error('Update conversion event error:', error);
      res.status(500).json({ success: false, error: error.message || 'Internal error' });
    }
  }

  async delete(req: AuthRequest, res: Response) {
    try {
      if (!req.user) return res.status(401).json({ success: false, error: 'Not authenticated' });
      await conversionEventsService.deleteEvent(req.params.id, req.user.userId);
      res.json({ success: true, data: { deleted: true } });
    } catch (error: any) {
      if (error instanceof AppError) return res.status(error.statusCode).json({ success: false, error: error.message });
      logger.error('Delete conversion event error:', error);
      res.status(500).json({ success: false, error: error.message || 'Internal error' });
    }
  }

  async test(req: AuthRequest, res: Response) {
    try {
      if (!req.user) return res.status(401).json({ success: false, error: 'Not authenticated' });
      const result = await conversionEventsService.testEvent(req.params.id, req.user.userId);
      res.json({ success: true, data: result });
    } catch (error: any) {
      if (error instanceof AppError) return res.status(error.statusCode).json({ success: false, error: error.message });
      logger.error('Test conversion event error:', error);
      res.status(500).json({ success: false, error: error.message || 'Internal error' });
    }
  }
}

export const conversionEventsController = new ConversionEventsController();
