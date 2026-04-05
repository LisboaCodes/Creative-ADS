import { Response } from 'express';
import { ZodError } from 'zod';
import { AuthRequest } from '../auth/auth.middleware';
import { trackableMessagesService } from './trackable-messages.service';
import { createTrackableMessageSchema, updateTrackableMessageSchema } from './trackable-messages.schemas';
import { logger } from '../../utils/logger';
import { AppError } from '../../utils/errors';

export class TrackableMessagesController {
  async list(req: AuthRequest, res: Response) {
    try {
      if (!req.user) return res.status(401).json({ success: false, error: 'Not authenticated' });
      const messages = await trackableMessagesService.getMessages(req.user.userId);
      res.json({ success: true, data: messages });
    } catch (error: any) {
      if (error instanceof AppError) return res.status(error.statusCode).json({ success: false, error: error.message });
      logger.error('List trackable messages error:', error);
      res.status(500).json({ success: false, error: error.message || 'Internal error' });
    }
  }

  async create(req: AuthRequest, res: Response) {
    try {
      if (!req.user) return res.status(401).json({ success: false, error: 'Not authenticated' });
      const input = createTrackableMessageSchema.parse(req.body);
      const message = await trackableMessagesService.createMessage(req.user.userId, input);
      res.status(201).json({ success: true, data: message });
    } catch (error: any) {
      if (error instanceof ZodError) return res.status(422).json({ success: false, error: error.errors });
      if (error instanceof AppError) return res.status(error.statusCode).json({ success: false, error: error.message });
      logger.error('Create trackable message error:', error);
      res.status(500).json({ success: false, error: error.message || 'Internal error' });
    }
  }

  async update(req: AuthRequest, res: Response) {
    try {
      if (!req.user) return res.status(401).json({ success: false, error: 'Not authenticated' });
      const input = updateTrackableMessageSchema.parse(req.body);
      const message = await trackableMessagesService.updateMessage(req.params.id, req.user.userId, input);
      res.json({ success: true, data: message });
    } catch (error: any) {
      if (error instanceof ZodError) return res.status(422).json({ success: false, error: error.errors });
      if (error instanceof AppError) return res.status(error.statusCode).json({ success: false, error: error.message });
      logger.error('Update trackable message error:', error);
      res.status(500).json({ success: false, error: error.message || 'Internal error' });
    }
  }

  async delete(req: AuthRequest, res: Response) {
    try {
      if (!req.user) return res.status(401).json({ success: false, error: 'Not authenticated' });
      await trackableMessagesService.deleteMessage(req.params.id, req.user.userId);
      res.json({ success: true, data: { deleted: true } });
    } catch (error: any) {
      if (error instanceof AppError) return res.status(error.statusCode).json({ success: false, error: error.message });
      logger.error('Delete trackable message error:', error);
      res.status(500).json({ success: false, error: error.message || 'Internal error' });
    }
  }
}

export const trackableMessagesController = new TrackableMessagesController();
