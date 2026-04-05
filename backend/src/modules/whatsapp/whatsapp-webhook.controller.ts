import { Request, Response } from 'express';
import { env } from '../../config/env';
import { incomingMessageQueue } from '../../config/queue';
import { logger } from '../../utils/logger';

/**
 * Handles incoming webhooks from Evolution API.
 * Public endpoint - no auth required.
 * Evolution sends events like "messages.upsert" with message data.
 */
class WhatsAppWebhookController {
  async handleWebhook(req: Request, res: Response): Promise<void> {
    try {
      // Optional token verification
      if (env.EVOLUTION_WEBHOOK_TOKEN) {
        const token = req.headers['x-webhook-token'] || req.query.token;
        if (token !== env.EVOLUTION_WEBHOOK_TOKEN) {
          res.status(401).json({ error: 'Invalid webhook token' });
          return;
        }
      }

      const body = req.body;

      // Evolution API sends different event types
      const event = body.event;
      if (event !== 'messages.upsert') {
        // We only care about new messages
        res.status(200).json({ ignored: true, event });
        return;
      }

      const data = body.data;
      if (!data) {
        res.status(200).json({ ignored: true, reason: 'no data' });
        return;
      }

      const instance = body.instance;

      // Extract message info from Evolution API payload
      const message = data.message;
      const key = data.key;

      if (!key || !message) {
        res.status(200).json({ ignored: true, reason: 'no key or message' });
        return;
      }

      // Skip outgoing messages (fromMe)
      if (key.fromMe) {
        res.status(200).json({ ignored: true, reason: 'outbound' });
        return;
      }

      // Extract text content
      const textContent =
        message.conversation ||
        message.extendedTextMessage?.text ||
        message.imageMessage?.caption ||
        message.videoMessage?.caption ||
        '';

      // Extract phone from remoteJid (format: 5511999998888@s.whatsapp.net)
      const remoteJid = key.remoteJid || '';
      const phone = remoteJid.replace(/@.*$/, '');

      // Skip group messages (optional: could be enabled later)
      if (remoteJid.endsWith('@g.us')) {
        res.status(200).json({ ignored: true, reason: 'group_message' });
        return;
      }

      const pushName = data.pushName || null;
      const messageId = key.id || '';

      // Enqueue for async processing
      await incomingMessageQueue.add('process', {
        channel: 'WHATSAPP',
        externalId: messageId,
        phone,
        senderName: pushName,
        senderId: phone,
        content: textContent,
        instance,
        rawPayload: body,
        receivedAt: new Date().toISOString(),
      });

      logger.info(`WhatsApp message queued from ${phone} (instance: ${instance})`);
      res.status(200).json({ queued: true });
    } catch (error) {
      logger.error('WhatsApp webhook error:', error);
      res.status(500).json({ error: 'Internal error processing webhook' });
    }
  }
}

export const whatsAppWebhookController = new WhatsAppWebhookController();
