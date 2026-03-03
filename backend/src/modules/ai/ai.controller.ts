import { Response } from 'express';
import { AuthRequest } from '../auth/auth.middleware';
import { aiService } from './ai.service';
import { chatMessageSchema, bulkApproveSchema } from './ai.schemas';

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
      return res.status(400).json({
        success: false,
        error: error.message || 'Failed to process message',
      });
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
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch conversations',
      });
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
      return res.status(404).json({
        success: false,
        error: error.message || 'Conversation not found',
      });
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
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch pending actions',
      });
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
      return res.status(400).json({
        success: false,
        error: error.message || 'Failed to approve action',
      });
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
      return res.status(400).json({
        success: false,
        error: error.message || 'Failed to reject action',
      });
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
      return res.status(400).json({
        success: false,
        error: error.message || 'Failed to bulk approve actions',
      });
    }
  }
}

export const aiController = new AIController();
