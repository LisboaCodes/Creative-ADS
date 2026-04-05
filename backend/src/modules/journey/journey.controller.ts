import { Response } from 'express';
import { ZodError } from 'zod';
import { AuthRequest } from '../auth/auth.middleware';
import { journeyService } from './journey.service';
import {
  createJourneyStageSchema,
  updateJourneyStageSchema,
  reorderStagesSchema,
  moveLeadSchema,
} from './journey.schemas';
import { logger } from '../../utils/logger';
import { AppError } from '../../utils/errors';

export class JourneyController {
  async listStages(req: AuthRequest, res: Response) {
    try {
      if (!req.user) return res.status(401).json({ success: false, error: 'Not authenticated' });
      const stages = await journeyService.getStages(req.user.userId);
      res.json({ success: true, data: stages });
    } catch (error: any) {
      if (error instanceof AppError) return res.status(error.statusCode).json({ success: false, error: error.message });
      logger.error('List journey stages error:', error);
      res.status(500).json({ success: false, error: error.message || 'Internal error' });
    }
  }

  async createStage(req: AuthRequest, res: Response) {
    try {
      if (!req.user) return res.status(401).json({ success: false, error: 'Not authenticated' });
      const input = createJourneyStageSchema.parse(req.body);
      const stage = await journeyService.createStage(req.user.userId, input);
      res.status(201).json({ success: true, data: stage });
    } catch (error: any) {
      if (error instanceof ZodError) return res.status(422).json({ success: false, error: error.errors });
      if (error instanceof AppError) return res.status(error.statusCode).json({ success: false, error: error.message });
      logger.error('Create journey stage error:', error);
      res.status(500).json({ success: false, error: error.message || 'Internal error' });
    }
  }

  async updateStage(req: AuthRequest, res: Response) {
    try {
      if (!req.user) return res.status(401).json({ success: false, error: 'Not authenticated' });
      const input = updateJourneyStageSchema.parse(req.body);
      const stage = await journeyService.updateStage(req.params.id, req.user.userId, input);
      res.json({ success: true, data: stage });
    } catch (error: any) {
      if (error instanceof ZodError) return res.status(422).json({ success: false, error: error.errors });
      if (error instanceof AppError) return res.status(error.statusCode).json({ success: false, error: error.message });
      logger.error('Update journey stage error:', error);
      res.status(500).json({ success: false, error: error.message || 'Internal error' });
    }
  }

  async deleteStage(req: AuthRequest, res: Response) {
    try {
      if (!req.user) return res.status(401).json({ success: false, error: 'Not authenticated' });
      await journeyService.deleteStage(req.params.id, req.user.userId);
      res.json({ success: true, data: { deleted: true } });
    } catch (error: any) {
      if (error instanceof AppError) return res.status(error.statusCode).json({ success: false, error: error.message });
      logger.error('Delete journey stage error:', error);
      res.status(500).json({ success: false, error: error.message || 'Internal error' });
    }
  }

  async reorderStages(req: AuthRequest, res: Response) {
    try {
      if (!req.user) return res.status(401).json({ success: false, error: 'Not authenticated' });
      const input = reorderStagesSchema.parse(req.body);
      const stages = await journeyService.reorderStages(req.user.userId, input);
      res.json({ success: true, data: stages });
    } catch (error: any) {
      if (error instanceof ZodError) return res.status(422).json({ success: false, error: error.errors });
      if (error instanceof AppError) return res.status(error.statusCode).json({ success: false, error: error.message });
      logger.error('Reorder journey stages error:', error);
      res.status(500).json({ success: false, error: error.message || 'Internal error' });
    }
  }

  async moveLeadToStage(req: AuthRequest, res: Response) {
    try {
      if (!req.user) return res.status(401).json({ success: false, error: 'Not authenticated' });
      const input = moveLeadSchema.parse(req.body);
      const result = await journeyService.moveLeadToStage(req.params.leadId, req.user.userId, input);
      res.json({ success: true, data: result });
    } catch (error: any) {
      if (error instanceof ZodError) return res.status(422).json({ success: false, error: error.errors });
      if (error instanceof AppError) return res.status(error.statusCode).json({ success: false, error: error.message });
      logger.error('Move lead to stage error:', error);
      res.status(500).json({ success: false, error: error.message || 'Internal error' });
    }
  }
}

export const journeyController = new JourneyController();
