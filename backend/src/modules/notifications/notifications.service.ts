import { NotificationType } from '@prisma/client';
import { prisma } from '../../config/database';

export class NotificationsService {
  /**
   * Get notifications for a user: all unread + last 50
   */
  async getNotifications(userId: string) {
    const [unread, recent] = await Promise.all([
      prisma.notification.findMany({
        where: { userId, isRead: false },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
    ]);

    // Merge and deduplicate
    const seen = new Set<string>();
    const notifications = [];
    for (const n of [...unread, ...recent]) {
      if (!seen.has(n.id)) {
        seen.add(n.id);
        notifications.push(n);
      }
    }

    // Sort by date desc
    notifications.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    const unreadCount = unread.length;

    return { notifications, unreadCount };
  }

  /**
   * Mark a single notification as read
   */
  async markAsRead(notificationId: string, userId: string) {
    const notification = await prisma.notification.findFirst({
      where: { id: notificationId, userId },
    });

    if (!notification) {
      throw new Error('Notificacao nao encontrada');
    }

    return prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true },
    });
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId: string) {
    const result = await prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });

    return { count: result.count };
  }

  /**
   * Create a notification (used by jobs/services)
   */
  async createNotification(
    userId: string,
    data: {
      title: string;
      message: string;
      type?: NotificationType;
      metadata?: Record<string, any>;
    }
  ) {
    return prisma.notification.create({
      data: {
        userId,
        title: data.title,
        message: data.message,
        type: data.type || 'INFO',
        metadata: data.metadata || undefined,
      },
    });
  }

  /**
   * Get unread count for a user
   */
  async getUnreadCount(userId: string) {
    const count = await prisma.notification.count({
      where: { userId, isRead: false },
    });
    return { count };
  }
}

export const notificationsService = new NotificationsService();
