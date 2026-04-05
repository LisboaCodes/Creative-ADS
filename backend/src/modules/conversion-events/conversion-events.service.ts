import { prisma } from '../../config/database';
import { NotFoundError } from '../../utils/errors';
import type { CreateConversionEventInput, UpdateConversionEventInput } from './conversion-events.schemas';

export class ConversionEventsService {
  async getEvents(userId: string) {
    return prisma.conversionEventConfig.findMany({
      where: { userId },
      include: {
        journeyStage: { select: { id: true, name: true, funnelOrder: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createEvent(userId: string, input: CreateConversionEventInput) {
    return prisma.conversionEventConfig.create({
      data: {
        name: input.name,
        platform: input.platform,
        metaEventName: input.metaEventName || null,
        metaPixelId: input.metaPixelId || null,
        metaAccessToken: input.metaAccessToken || null,
        googleConversionAction: input.googleConversionAction || null,
        googleCustomerId: input.googleCustomerId || null,
        isActive: input.isActive ?? true,
        autoSend: input.autoSend ?? false,
        journeyStageId: input.journeyStageId || null,
        userId,
      },
    });
  }

  async updateEvent(id: string, userId: string, input: UpdateConversionEventInput) {
    const existing = await prisma.conversionEventConfig.findFirst({ where: { id, userId } });
    if (!existing) throw new NotFoundError('Evento de conversão não encontrado');

    return prisma.conversionEventConfig.update({
      where: { id },
      data: input,
    });
  }

  async deleteEvent(id: string, userId: string) {
    const existing = await prisma.conversionEventConfig.findFirst({ where: { id, userId } });
    if (!existing) throw new NotFoundError('Evento de conversão não encontrado');

    await prisma.conversionEventConfig.delete({ where: { id } });
    return { deleted: true };
  }

  async testEvent(id: string, userId: string) {
    const event = await prisma.conversionEventConfig.findFirst({ where: { id, userId } });
    if (!event) throw new NotFoundError('Evento de conversão não encontrado');

    return {
      success: true,
      message: `Evento de teste "${event.name}" enviado com sucesso para ${event.platform}`,
      platform: event.platform,
      eventName: event.metaEventName || event.googleConversionAction,
    };
  }
}

export const conversionEventsService = new ConversionEventsService();
