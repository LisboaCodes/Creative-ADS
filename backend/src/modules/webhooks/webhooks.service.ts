import crypto from 'crypto';
import { prisma } from '../../config/database';
import { NotFoundError } from '../../utils/errors';
import type { CreateWebhookEndpointInput, UpdateWebhookEndpointInput } from './webhooks.schemas';

export class WebhooksService {
  async getEndpoints(userId: string) {
    return prisma.webhookEndpoint.findMany({
      where: { userId },
      include: {
        _count: { select: { deliveries: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createEndpoint(userId: string, input: CreateWebhookEndpointInput) {
    const secret = input.secret || `whsec_${crypto.randomBytes(24).toString('hex')}`;
    return prisma.webhookEndpoint.create({
      data: {
        name: input.name,
        url: input.url,
        secret,
        isActive: input.isActive ?? true,
        events: input.events,
        retryCount: input.retryCount ?? 3,
        timeoutMs: input.timeoutMs ?? 5000,
        userId,
      },
    });
  }

  async updateEndpoint(id: string, userId: string, input: UpdateWebhookEndpointInput) {
    const existing = await prisma.webhookEndpoint.findFirst({ where: { id, userId } });
    if (!existing) throw new NotFoundError('Webhook endpoint não encontrado');

    return prisma.webhookEndpoint.update({
      where: { id },
      data: input,
    });
  }

  async deleteEndpoint(id: string, userId: string) {
    const existing = await prisma.webhookEndpoint.findFirst({ where: { id, userId } });
    if (!existing) throw new NotFoundError('Webhook endpoint não encontrado');

    await prisma.webhookEndpoint.delete({ where: { id } });
    return { deleted: true };
  }

  async testEndpoint(id: string, userId: string) {
    const endpoint = await prisma.webhookEndpoint.findFirst({ where: { id, userId } });
    if (!endpoint) throw new NotFoundError('Webhook endpoint não encontrado');

    const testPayload = {
      event: 'TEST',
      timestamp: new Date().toISOString(),
      data: { message: 'Teste de webhook do HackrAds' },
    };

    const startTime = Date.now();
    let success = false;
    let responseStatus: number | null = null;
    let responseBody: string | null = null;
    let error: string | null = null;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), endpoint.timeoutMs);

      const response = await fetch(endpoint.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Secret': endpoint.secret || '',
          'X-Webhook-Event': 'TEST',
        },
        body: JSON.stringify(testPayload),
        signal: controller.signal,
      });

      clearTimeout(timeout);
      responseStatus = response.status;
      responseBody = await response.text().catch(() => null);
      success = response.ok;
    } catch (err: any) {
      error = err.message || 'Falha ao enviar webhook';
    }

    const duration = Date.now() - startTime;

    await prisma.webhookDelivery.create({
      data: {
        eventType: 'NEW_LEAD',
        payload: testPayload,
        responseStatus,
        responseBody,
        success,
        duration,
        error,
        attempt: 1,
        endpointId: endpoint.id,
      },
    });

    return { success, responseStatus, duration, error };
  }

  async getDeliveries(id: string, userId: string) {
    const endpoint = await prisma.webhookEndpoint.findFirst({ where: { id, userId } });
    if (!endpoint) throw new NotFoundError('Webhook endpoint não encontrado');

    return prisma.webhookDelivery.findMany({
      where: { endpointId: id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }
}

export const webhooksService = new WebhooksService();
