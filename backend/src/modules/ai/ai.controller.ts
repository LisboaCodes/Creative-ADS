import { Response } from 'express';
import { ZodError, z } from 'zod';
import { AuthRequest } from '../auth/auth.middleware';
import { aiService } from './ai.service';
import { logger } from '../../utils/logger';
import { AppError } from '../../utils/errors';
import { chatMessageSchema, bulkApproveSchema } from './ai.schemas';

const briefingSchema = z.object({
  platformId: z.string(),
  startDate: z.string().transform((str) => new Date(str)),
  endDate: z.string().transform((str) => new Date(str)),
});

export class AIController {
  async chat(req: AuthRequest, res: Response) {
    try {
      const parsed = chatMessageSchema.parse(req.body);
      const result = await aiService.chat(req.user!.userId, parsed);

      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      if (error instanceof ZodError) {
        return res.status(422).json({ success: false, error: error.errors });
      }
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({ success: false, error: error.message });
      }
      logger.error('Chat error:', error);
      return res.status(500).json({ success: false, error: error.message || 'Internal error' });
    }
  }

  async getConversations(req: AuthRequest, res: Response) {
    try {
      const conversations = await aiService.getConversations(req.user!.userId);

      return res.status(200).json({
        success: true,
        data: conversations,
      });
    } catch (error: any) {
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({ success: false, error: error.message });
      }
      logger.error('Get conversations error:', error);
      return res.status(500).json({ success: false, error: error.message || 'Internal error' });
    }
  }

  async getConversation(req: AuthRequest, res: Response) {
    try {
      const conversation = await aiService.getConversation(
        req.params.id,
        req.user!.userId
      );

      return res.status(200).json({
        success: true,
        data: conversation,
      });
    } catch (error: any) {
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({ success: false, error: error.message });
      }
      logger.error('Get conversation error:', error);
      return res.status(500).json({ success: false, error: error.message || 'Internal error' });
    }
  }

  async getPendingActions(req: AuthRequest, res: Response) {
    try {
      const actions = await aiService.getPendingActions(req.user!.userId);

      return res.status(200).json({
        success: true,
        data: actions,
      });
    } catch (error: any) {
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({ success: false, error: error.message });
      }
      logger.error('Get pending actions error:', error);
      return res.status(500).json({ success: false, error: error.message || 'Internal error' });
    }
  }

  async approveAction(req: AuthRequest, res: Response) {
    try {
      const action = await aiService.approveAction(
        req.params.id,
        req.user!.userId
      );

      return res.status(200).json({
        success: true,
        data: action,
      });
    } catch (error: any) {
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({ success: false, error: error.message });
      }
      logger.error('Approve action error:', error);
      return res.status(500).json({ success: false, error: error.message || 'Internal error' });
    }
  }

  async rejectAction(req: AuthRequest, res: Response) {
    try {
      const action = await aiService.rejectAction(
        req.params.id,
        req.user!.userId
      );

      return res.status(200).json({
        success: true,
        data: action,
      });
    } catch (error: any) {
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({ success: false, error: error.message });
      }
      logger.error('Reject action error:', error);
      return res.status(500).json({ success: false, error: error.message || 'Internal error' });
    }
  }

  async briefing(req: AuthRequest, res: Response) {
    try {
      const parsed = briefingSchema.parse(req.body);
      const result = await aiService.generateClientBriefing(req.user!.userId, parsed);

      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      if (error instanceof ZodError) {
        return res.status(422).json({ success: false, error: error.errors });
      }
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({ success: false, error: error.message });
      }
      logger.error('Briefing error:', error);
      return res.status(500).json({ success: false, error: error.message || 'Internal error' });
    }
  }

  async suggestAutomations(req: AuthRequest, res: Response) {
    try {
      const result = await aiService.suggestAutomationRules(req.user!.userId);
      return res.status(200).json({ success: true, data: result });
    } catch (error: any) {
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({ success: false, error: error.message });
      }
      logger.error('Suggest automations error:', error);
      return res.status(500).json({ success: false, error: error.message || 'Internal error' });
    }
  }

  async bulkApprove(req: AuthRequest, res: Response) {
    try {
      const parsed = bulkApproveSchema.parse(req.body);
      const result = await aiService.bulkApprove(
        parsed.actionIds,
        req.user!.userId
      );

      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      if (error instanceof ZodError) {
        return res.status(422).json({ success: false, error: error.errors });
      }
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({ success: false, error: error.message });
      }
      logger.error('Bulk approve error:', error);
      return res.status(500).json({ success: false, error: error.message || 'Internal error' });
    }
  }
}

export const aiController = new AIController();
