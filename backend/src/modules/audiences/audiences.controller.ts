import { Response } from 'express';
import { ZodError } from 'zod';
import { audiencesService } from './audiences.service';
import { createAudienceSchema, updateAudienceSchema } from './audiences.schemas';
import { logger } from '../../utils/logger';
import { AppError } from '../../utils/errors';
import type { AuthRequest } from '../auth/auth.middleware';

class AudiencesController {
  async list(req: AuthRequest, res: Response) {
    try {
      if (!req.user) return res.status(401).json({ success: false, error: 'Not authenticated' });
      const audiences = await audiencesService.getAudiences(req.user.userId);
      res.status(200).json({ success: true, data: audiences });
    } catch (error: any) {
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({ success: false, error: error.message });
      }
      logger.error('List audiences error:', error);
      res.status(500).json({ success: false, error: error.message || 'Internal error' });
    }
  }

  async getById(req: AuthRequest, res: Response) {
    try {
      if (!req.user) return res.status(401).json({ success: false, error: 'Not authenticated' });
      const audience = await audiencesService.getAudienceById(req.params.id, req.user.userId);
      res.status(200).json({ success: true, data: audience });
    } catch (error: any) {
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({ success: false, error: error.message });
      }
      logger.error('Get audience error:', error);
      res.status(500).json({ success: false, error: error.message || 'Internal error' });
    }
  }

  async create(req: AuthRequest, res: Response) {
    try {
      if (!req.user) return res.status(401).json({ success: false, error: 'Not authenticated' });
      const input = createAudienceSchema.parse(req.body);
      const audience = await audiencesService.createAudience(req.user.userId, input);
      res.status(201).json({ success: true, data: audience });
    } catch (error: any) {
      if (error instanceof ZodError) {
        return res.status(422).json({ success: false, error: error.errors[0]?.message || 'Dados inválidos' });
      }
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({ success: false, error: error.message });
      }
      logger.error('Create audience error:', error);
      res.status(500).json({ success: false, error: error.message || 'Internal error' });
    }
  }

  async update(req: AuthRequest, res: Response) {
    try {
      if (!req.user) return res.status(401).json({ success: false, error: 'Not authenticated' });
      const input = updateAudienceSchema.parse(req.body);
      const audience = await audiencesService.updateAudience(req.params.id, req.user.userId, input);
      res.status(200).json({ success: true, data: audience });
    } catch (error: any) {
      if (error instanceof ZodError) {
        return res.status(422).json({ success: false, error: error.errors[0]?.message || 'Dados inválidos' });
      }
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({ success: false, error: error.message });
      }
      logger.error('Update audience error:', error);
      res.status(500).json({ success: false, error: error.message || 'Internal error' });
    }
  }

  async delete(req: AuthRequest, res: Response) {
    try {
      if (!req.user) return res.status(401).json({ success: false, error: 'Not authenticated' });
      await audiencesService.deleteAudience(req.params.id, req.user.userId);
      res.status(200).json({ success: true, message: 'Público removido' });
    } catch (error: any) {
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({ success: false, error: error.message });
      }
      logger.error('Delete audience error:', error);
      res.status(500).json({ success: false, error: error.message || 'Internal error' });
    }
  }

  async refreshSize(req: AuthRequest, res: Response) {
    try {
      if (!req.user) return res.status(401).json({ success: false, error: 'Not authenticated' });
      const audience = await audiencesService.refreshAudienceSize(req.params.id, req.user.userId);
      res.status(200).json({ success: true, data: audience });
    } catch (error: any) {
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({ success: false, error: error.message });
      }
      logger.error('Refresh audience size error:', error);
      res.status(500).json({ success: false, error: error.message || 'Internal error' });
    }
  }

  async listForPlatform(req: AuthRequest, res: Response) {
    try {
      if (!req.user) return res.status(401).json({ success: false, error: 'Not authenticated' });
      const audiences = await audiencesService.getAudiencesForPlatform(req.user.userId, req.params.platformId);
      res.status(200).json({ success: true, data: audiences });
    } catch (error: any) {
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({ success: false, error: error.message });
      }
      logger.error('List audiences for platform error:', error);
      res.status(500).json({ success: false, error: error.message || 'Internal error' });
    }
  }
}

export const audiencesController = new AudiencesController();
