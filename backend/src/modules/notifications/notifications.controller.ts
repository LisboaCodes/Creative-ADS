import { Response } from 'express';
import { AuthRequest } from '../auth/auth.middleware';
import { notificationsService } from './notifications.service';
import { logger } from '../../utils/logger';
import { AppError } from '../../utils/errors';

export class NotificationsController {
  async getNotifications(req: AuthRequest, res: Response) {
    try {
      const result = await notificationsService.getNotifications(req.user!.userId);

      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({ success: false, error: error.message });
      }
      logger.error('Get notifications error:', error);
      return res.status(500).json({ success: false, error: error.message || 'Internal error' });
    }
  }

  async markAsRead(req: AuthRequest, res: Response) {
    try {
      const notification = await notificationsService.markAsRead(
        req.params.id,
        req.user!.userId
      );

      return res.status(200).json({
        success: true,
        data: notification,
      });
    } catch (error: any) {
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({ success: false, error: error.message });
      }
      logger.error('Mark as read error:', error);
      return res.status(500).json({ success: false, error: error.message || 'Internal error' });
    }
  }

  async markAllAsRead(req: AuthRequest, res: Response) {
    try {
      const result = await notificationsService.markAllAsRead(req.user!.userId);

      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({ success: false, error: error.message });
      }
      logger.error('Mark all as read error:', error);
      return res.status(500).json({ success: false, error: error.message || 'Internal error' });
    }
  }

  async getUnreadCount(req: AuthRequest, res: Response) {
    try {
      const result = await notificationsService.getUnreadCount(req.user!.userId);

      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({ success: false, error: error.message });
      }
      logger.error('Get unread count error:', error);
      return res.status(500).json({ success: false, error: error.message || 'Internal error' });
    }
  }
}

export const notificationsController = new NotificationsController();
