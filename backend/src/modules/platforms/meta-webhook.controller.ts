import crypto from 'crypto';
import { Request, Response } from 'express';
import { env } from '../../config/env';
import { incomingMessageQueue } from '../../config/queue';
import { logger } from '../../utils/logger';

/**
 * Handles Meta platform webhooks for Instagram DM and Messenger.
 * Public endpoints - no auth required.
 * Uses X-Hub-Signature-256 for verification.
 */
class MetaWebhookController {
  /**
   * GET /meta/webhook - Webhook verification (required by Meta)
   */
  verify(req: Request, res: Response): void {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode === 'subscribe' && token === env.META_WEBHOOK_VERIFY_TOKEN) {
      logger.info('Meta webhook verified successfully');
      res.status(200).send(challenge);
      return;
    }

    logger.warn('Meta webhook verification failed');
    res.status(403).json({ error: 'Verification failed' });
  }

  /**
   * POST /meta/webhook - Receive events from Instagram/Messenger
   */
  async handleEvent(req: Request, res: Response): Promise<void> {
    // Verify X-Hub-Signature-256 if we have the app secret
    if (env.FACEBOOK_APP_SECRET) {
      const signature = req.headers['x-hub-signature-256'] as string;
      if (!signature) {
        res.status(401).json({ error: 'Missing signature' });
        return;
      }

      const rawBody = JSON.stringify(req.body);
      const expectedSig = 'sha256=' + crypto
        .createHmac('sha256', env.FACEBOOK_APP_SECRET)
        .update(rawBody)
        .digest('hex');

      if (signature !== expectedSig) {
        logger.warn('Meta webhook signature mismatch');
        res.status(401).json({ error: 'Invalid signature' });
        return;
      }
    }

    // Always respond 200 quickly to Meta
    res.status(200).json({ received: true });

    try {
      const body = req.body;
      const object = body.object; // "instagram" or "page" (Messenger)

      if (!body.entry || !Array.isArray(body.entry)) return;

      for (const entry of body.entry) {
        const messaging = entry.messaging || entry.messages || [];

        for (const event of messaging) {
          if (!event.message || !event.message.text) continue;

          const senderId = event.sender?.id;
          const messageText = event.message.text;
          const messageId = event.message.mid || `${object}_${senderId}_${Date.now()}`;

          let channel: 'INSTAGRAM' | 'MESSENGER';
          if (object === 'instagram') {
            channel = 'INSTAGRAM';
          } else {
            channel = 'MESSENGER';
          }

          await incomingMessageQueue.add('process', {
            channel,
            externalId: messageId,
            phone: null,
            senderName: null,
            senderId,
            content: messageText,
            pageId: entry.id,
            rawPayload: event,
            receivedAt: new Date().toISOString(),
          });

          logger.info(`${channel} message queued from sender ${senderId}`);
        }
      }
    } catch (error) {
      logger.error('Meta webhook processing error:', error);
    }
  }
}

export const metaWebhookController = new MetaWebhookController();
