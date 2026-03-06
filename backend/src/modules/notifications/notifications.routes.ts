import { Router } from 'express';
import { authenticate } from '../auth/auth.middleware';
import { notificationsController } from './notifications.controller';

const router = Router();

// All notification routes require authentication
router.use(authenticate);

// List notifications
router.get('/', (req, res) => notificationsController.getNotifications(req, res));

// Get unread count
router.get('/unread-count', (req, res) => notificationsController.getUnreadCount(req, res));

// Mark single notification as read
router.patch('/:id/read', (req, res) => notificationsController.markAsRead(req, res));

// Mark all notifications as read
router.post('/read-all', (req, res) => notificationsController.markAllAsRead(req, res));

export default router;
