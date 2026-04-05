import crypto from 'crypto';
import { prisma } from '../../config/database';
import { logger } from '../../utils/logger';

interface ConversionEventPayload {
  userId: string;
  eventName: string; // e.g. "Purchase", "Contact", "Lead"
  leadPhone?: string | null;
  leadEmail?: string | null;
  value?: number | null;
  currency?: string;
  sourceUrl?: string;
  testEventCode?: string | null;
}

function sha256(value: string): string {
  return crypto.createHash('sha256').update(value.trim().toLowerCase()).digest('hex');
}

function normalizePhone(phone: string): string {
  // Remove all non-digits
  let digits = phone.replace(/\D/g, '');
  // Ensure country code (default Brazil +55)
  if (digits.length <= 11 && !digits.startsWith('55')) {
    digits = '55' + digits;
  }
  return digits;
}

export class MetaConversionApiService {
  /**
   * Sends a real conversion event to Meta Conversions API.
   * Looks up active PixelConfig for the user's "meta" platform.
   */
  async sendEvent(payload: ConversionEventPayload): Promise<{ success: boolean; pixelId?: string; error?: string }> {
    const pixelConfig = await prisma.pixelConfig.findFirst({
      where: {
        userId: payload.userId,
        platform: 'meta',
        isActive: true,
      },
    });

    if (!pixelConfig) {
      logger.debug(`No active Meta pixel config found for user ${payload.userId}`);
      return { success: false, error: 'No active Meta pixel config' };
    }

    const eventTime = Math.floor(Date.now() / 1000);

    // Build user_data with hashed PII
    const userData: Record<string, string> = {};
    if (payload.leadPhone) {
      userData.ph = sha256(normalizePhone(payload.leadPhone));
    }
    if (payload.leadEmail) {
      userData.em = sha256(payload.leadEmail);
    }

    const eventData: Record<string, any> = {
      event_name: payload.eventName,
      event_time: eventTime,
      action_source: 'system_generated',
      user_data: userData,
    };

    if (payload.value != null) {
      eventData.custom_data = {
        value: payload.value,
        currency: payload.currency || 'BRL',
      };
    }

    if (payload.sourceUrl) {
      eventData.event_source_url = payload.sourceUrl;
    }

    const body: Record<string, any> = {
      data: [eventData],
    };

    if (payload.testEventCode || pixelConfig.testEventCode) {
      body.test_event_code = payload.testEventCode || pixelConfig.testEventCode;
    }

    const url = `https://graph.facebook.com/v21.0/${pixelConfig.pixelId}/events?access_token=${pixelConfig.accessToken}`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(15000),
      });

      const result = await response.json() as any;

      if (!response.ok) {
        const errorMsg = result?.error?.message || `HTTP ${response.status}`;
        logger.error(`Meta CAPI error for pixel ${pixelConfig.pixelId}: ${errorMsg}`);
        return { success: false, pixelId: pixelConfig.pixelId, error: errorMsg };
      }

      logger.info(`Meta CAPI event "${payload.eventName}" sent to pixel ${pixelConfig.pixelId}, events_received: ${result?.events_received || 0}`);
      return { success: true, pixelId: pixelConfig.pixelId };
    } catch (error: any) {
      logger.error(`Meta CAPI request failed for pixel ${pixelConfig.pixelId}:`, error);
      return { success: false, pixelId: pixelConfig.pixelId, error: error.message };
    }
  }
}

export const metaConversionApiService = new MetaConversionApiService();
