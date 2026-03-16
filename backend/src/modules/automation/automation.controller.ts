import { Response } from 'express';
import { automationService } from './automation.service';
import { budgetCapService } from './budget-cap.service';
import { abTestService } from './ab-test.service';
import { crossPlatformService } from './cross-platform.service';
import { logger } from '../../utils/logger';
import { AppError } from '../../utils/errors';
import type { AuthRequest } from '../auth/auth.middleware';

export class AutomationController {
  // ─── Rules ─────────────────────────────────

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

  // ─── Budget Caps (F7) ─────────────────────────────────

  async getBudgetCaps(req: AuthRequest, res: Response) {
    try {
      if (!req.user) return res.status(401).json({ success: false, error: 'Not authenticated' });
      const caps = await budgetCapService.getCaps(req.user.userId);
      res.status(200).json({ success: true, data: caps });
    } catch (error: any) {
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({ success: false, error: error.message });
      }
      logger.error('Get budget caps error:', error);
      res.status(500).json({ success: false, error: error.message || 'Internal error' });
    }
  }

  async upsertBudgetCap(req: AuthRequest, res: Response) {
    try {
      if (!req.user) return res.status(401).json({ success: false, error: 'Not authenticated' });
      const cap = await budgetCapService.upsertCap(req.user.userId, req.body);
      res.status(200).json({ success: true, data: cap });
    } catch (error: any) {
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({ success: false, error: error.message });
      }
      logger.error('Upsert budget cap error:', error);
      res.status(500).json({ success: false, error: error.message || 'Internal error' });
    }
  }

  async deleteBudgetCap(req: AuthRequest, res: Response) {
    try {
      if (!req.user) return res.status(401).json({ success: false, error: 'Not authenticated' });
      await budgetCapService.deleteCap(req.user.userId, req.params.id);
      res.status(200).json({ success: true, message: 'Budget cap removido' });
    } catch (error: any) {
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({ success: false, error: error.message });
      }
      logger.error('Delete budget cap error:', error);
      res.status(500).json({ success: false, error: error.message || 'Internal error' });
    }
  }

  // ─── A/B Tests (F2) ─────────────────────────────────

  async getABTests(req: AuthRequest, res: Response) {
    try {
      if (!req.user) return res.status(401).json({ success: false, error: 'Not authenticated' });
      const tests = await abTestService.getTests(req.user.userId);
      res.status(200).json({ success: true, data: tests });
    } catch (error: any) {
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({ success: false, error: error.message });
      }
      logger.error('Get AB tests error:', error);
      res.status(500).json({ success: false, error: error.message || 'Internal error' });
    }
  }

  async createABTest(req: AuthRequest, res: Response) {
    try {
      if (!req.user) return res.status(401).json({ success: false, error: 'Not authenticated' });
      const test = await abTestService.createTest(req.user.userId, req.body);
      res.status(201).json({ success: true, data: test });
    } catch (error: any) {
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({ success: false, error: error.message });
      }
      logger.error('Create AB test error:', error);
      res.status(500).json({ success: false, error: error.message || 'Internal error' });
    }
  }

  async cancelABTest(req: AuthRequest, res: Response) {
    try {
      if (!req.user) return res.status(401).json({ success: false, error: 'Not authenticated' });
      const test = await abTestService.cancelTest(req.user.userId, req.params.id);
      res.status(200).json({ success: true, data: test });
    } catch (error: any) {
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({ success: false, error: error.message });
      }
      logger.error('Cancel AB test error:', error);
      res.status(500).json({ success: false, error: error.message || 'Internal error' });
    }
  }

  // ─── Campaign Schedules ─────────────────────────────────

  async getSchedules(req: AuthRequest, res: Response) {
    try {
      if (!req.user) return res.status(401).json({ success: false, error: 'Not authenticated' });
      const schedules = await automationService.getSchedules(req.user.userId);
      res.status(200).json({ success: true, data: schedules });
    } catch (error: any) {
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({ success: false, error: error.message });
      }
      logger.error('Get schedules error:', error);
      res.status(500).json({ success: false, error: error.message || 'Internal error' });
    }
  }

  async createSchedule(req: AuthRequest, res: Response) {
    try {
      if (!req.user) return res.status(401).json({ success: false, error: 'Not authenticated' });
      const schedule = await automationService.createSchedule(req.user.userId, req.body);
      res.status(201).json({ success: true, data: schedule });
    } catch (error: any) {
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({ success: false, error: error.message });
      }
      logger.error('Create schedule error:', error);
      res.status(500).json({ success: false, error: error.message || 'Internal error' });
    }
  }

  async cancelSchedule(req: AuthRequest, res: Response) {
    try {
      if (!req.user) return res.status(401).json({ success: false, error: 'Not authenticated' });
      const schedule = await automationService.cancelSchedule(req.user.userId, req.params.id);
      res.status(200).json({ success: true, data: schedule });
    } catch (error: any) {
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({ success: false, error: error.message });
      }
      logger.error('Cancel schedule error:', error);
      res.status(500).json({ success: false, error: error.message || 'Internal error' });
    }
  }

  // ─── Cross-Platform Duplication (F9) ─────────────────────────────────

  async duplicateCampaign(req: AuthRequest, res: Response) {
    try {
      if (!req.user) return res.status(401).json({ success: false, error: 'Not authenticated' });
      const draft = await crossPlatformService.duplicateCampaign(req.user.userId, req.body);
      res.status(201).json({ success: true, data: draft });
    } catch (error: any) {
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({ success: false, error: error.message });
      }
      logger.error('Duplicate campaign error:', error);
      res.status(500).json({ success: false, error: error.message || 'Internal error' });
    }
  }
}

export const automationController = new AutomationController();
