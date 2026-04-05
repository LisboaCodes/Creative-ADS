import { prisma } from '../../config/database';
import { webhookDispatchQueue } from '../../config/queue';
import { logger } from '../../utils/logger';
import type { WebhookEventType } from '@prisma/client';

interface WebhookPayload {
  event: WebhookEventType;
  data: Record<string, any>;
  userId: string;
}

export class WebhookDispatcherService {
  /**
   * Finds all active webhook endpoints for the user that listen for
   * the given event type, and enqueues a dispatch job for each.
   */
  async dispatch(payload: WebhookPayload): Promise<number> {
    const endpoints = await prisma.webhookEndpoint.findMany({
      where: {
        userId: payload.userId,
        isActive: true,
        events: { has: payload.event },
      },
    });

    if (endpoints.length === 0) {
      logger.debug(`No active webhook endpoints for event ${payload.event} (user ${payload.userId})`);
      return 0;
    }

    let queued = 0;
    for (const endpoint of endpoints) {
      await webhookDispatchQueue.add('dispatch', {
        endpointId: endpoint.id,
        url: endpoint.url,
        secret: endpoint.secret,
        event: payload.event,
        payload: payload.data,
        retryCount: endpoint.retryCount,
        timeoutMs: endpoint.timeoutMs,
      });
      queued++;
    }

    logger.info(`Queued ${queued} webhook dispatches for event ${payload.event}`);
    return queued;
  }
}

export const webhookDispatcherService = new WebhookDispatcherService();
