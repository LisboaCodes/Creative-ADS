import { Response } from 'express';
import { automationService } from './automation.service';
import { logger } from '../../utils/logger';
import { AppError } from '../../utils/errors';
import type { AuthRequest } from '../auth/auth.middleware';

export class AutomationController {
  async getRules(req: AuthRequest, res: Response) {
    try {
      if (!req.user) return res.status(401).json({ success: false, error: 'Not authenticated' });
      const rules = await automationService.getRules(req.user.userId);
      res.status(200).json({ success: true, data: rules });
    } catch (error: any) {
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({ success: false, error: error.message });
      }
      logger.error('Get rules error:', error);
      res.status(500).json({ success: false, error: error.message || 'Internal error' });
    }
  }

  async createRule(req: AuthRequest, res: Response) {
    try {
      if (!req.user) return res.status(401).json({ success: false, error: 'Not authenticated' });
      const rule = await automationService.createRule(req.user.userId, req.body);
      res.status(201).json({ success: true, data: rule });
    } catch (error: any) {
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({ success: false, error: error.message });
      }
      logger.error('Create rule error:', error);
      res.status(500).json({ success: false, error: error.message || 'Internal error' });
    }
  }

  async updateRule(req: AuthRequest, res: Response) {
    try {
      if (!req.user) return res.status(401).json({ success: false, error: 'Not authenticated' });
      const rule = await automationService.updateRule(req.user.userId, req.params.id, req.body);
      res.status(200).json({ success: true, data: rule });
    } catch (error: any) {
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({ success: false, error: error.message });
      }
      logger.error('Update rule error:', error);
      res.status(500).json({ success: false, error: error.message || 'Internal error' });
    }
  }

  async deleteRule(req: AuthRequest, res: Response) {
    try {
      if (!req.user) return res.status(401).json({ success: false, error: 'Not authenticated' });
      await automationService.deleteRule(req.user.userId, req.params.id);
      res.status(200).json({ success: true, message: 'Regra removida' });
    } catch (error: any) {
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({ success: false, error: error.message });
      }
      logger.error('Delete rule error:', error);
      res.status(500).json({ success: false, error: error.message || 'Internal error' });
    }
  }
}

export const automationController = new AutomationController();
