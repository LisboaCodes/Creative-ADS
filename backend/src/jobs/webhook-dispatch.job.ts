import crypto from 'crypto';
import { webhookDispatchQueue } from '../config/queue';
import { prisma } from '../config/database';
import { logger } from '../utils/logger';

interface WebhookDispatchData {
  endpointId: string;
  url: string;
  secret: string | null;
  event: string;
  payload: Record<string, any>;
  retryCount: number;
  timeoutMs: number;
}

webhookDispatchQueue.process('dispatch', async (job) => {
  const data = job.data as WebhookDispatchData;
  const attemptNumber = job.attemptsMade + 1;

  const body = JSON.stringify({
    event: data.event,
    data: data.payload,
    timestamp: new Date().toISOString(),
  });

  // Build headers
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Webhook-Event': data.event,
  };

  // HMAC signature if secret is configured
  if (data.secret) {
    const signature = crypto
      .createHmac('sha256', data.secret)
      .update(body)
      .digest('hex');
    headers['X-Webhook-Signature'] = `sha256=${signature}`;
  }

  const startTime = Date.now();
  let responseStatus: number | null = null;
  let responseBody: string | null = null;
  let success = false;
  let error: string | null = null;

  try {
    const response = await fetch(data.url, {
      method: 'POST',
      headers,
      body,
      signal: AbortSignal.timeout(data.timeoutMs || 5000),
    });

    responseStatus = response.status;
    responseBody = await response.text().catch(() => null);
    success = response.ok;

    if (!success) {
      error = `HTTP ${response.status}`;
    }
  } catch (err: any) {
    error = err.message || 'Request failed';
    logger.error(`Webhook dispatch failed to ${data.url}:`, err);
  }

  const duration = Date.now() - startTime;

  // Record delivery
  await prisma.webhookDelivery.create({
    data: {
      eventType: data.event as any,
      payload: data.payload,
      responseStatus,
      responseBody: responseBody?.substring(0, 5000) || null,
      success,
      duration,
      error,
      attempt: attemptNumber,
      endpointId: data.endpointId,
    },
  });

  // Update endpoint stats
  const statsUpdate: Record<string, any> = {};
  const currentStats = await prisma.webhookEndpoint.findUnique({
    where: { id: data.endpointId },
    select: { stats: true },
  });
  const stats = (currentStats?.stats as any) || { totalSent: 0, totalSuccess: 0, totalFailed: 0 };
  stats.totalSent = (stats.totalSent || 0) + 1;
  if (success) {
    stats.totalSuccess = (stats.totalSuccess || 0) + 1;
  } else {
    stats.totalFailed = (stats.totalFailed || 0) + 1;
  }
  stats.lastSentAt = new Date().toISOString();

  await prisma.webhookEndpoint.update({
    where: { id: data.endpointId },
    data: { stats },
  });

  if (!success) {
    throw new Error(`Webhook delivery failed: ${error}`);
  }

  return { success, duration, responseStatus };
});

logger.info('Webhook dispatch job registered');
