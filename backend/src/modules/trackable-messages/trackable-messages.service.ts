import { prisma } from '../../config/database';
import { NotFoundError } from '../../utils/errors';
import type { CreateTrackableMessageInput, UpdateTrackableMessageInput } from './trackable-messages.schemas';

export class TrackableMessagesService {
  async getMessages(userId: string) {
    return prisma.trackableMessage.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createMessage(userId: string, input: CreateTrackableMessageInput) {
    return prisma.trackableMessage.create({
      data: {
        name: input.name,
        messageTemplate: input.messageTemplate,
        gclid: input.gclid || null,
        isActive: input.isActive ?? true,
        userId,
      },
    });
  }

  async updateMessage(id: string, userId: string, input: UpdateTrackableMessageInput) {
    const existing = await prisma.trackableMessage.findFirst({ where: { id, userId } });
    if (!existing) throw new NotFoundError('Mensagem rastreável não encontrada');

    return prisma.trackableMessage.update({
      where: { id },
      data: input,
    });
  }

  async deleteMessage(id: string, userId: string) {
    const existing = await prisma.trackableMessage.findFirst({ where: { id, userId } });
    if (!existing) throw new NotFoundError('Mensagem rastreável não encontrada');

    await prisma.trackableMessage.delete({ where: { id } });
    return { deleted: true };
  }
}

export const trackableMessagesService = new TrackableMessagesService();
