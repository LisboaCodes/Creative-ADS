import { prisma } from '../../config/database';
import { NotFoundError } from '../../utils/errors';
import type { CreateClientInput, UpdateClientInput } from './clients.schemas';

export class ClientsService {
  async getClients(userId: string) {
    const clients = await prisma.client.findMany({
      where: { userId },
      include: {
        platforms: {
          select: { id: true, name: true, type: true },
        },
        _count: { select: { platforms: true, whatsappGroups: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Get spend per client (sum of last 30 days metrics for linked platforms)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const clientsWithSpend = await Promise.all(
      clients.map(async (client) => {
        const platformIds = client.platforms.map((p) => p.id);
        let totalSpend = 0;
        if (platformIds.length > 0) {
          const result = await prisma.metric.aggregate({
            where: {
              campaign: { platformId: { in: platformIds } },
              date: { gte: thirtyDaysAgo },
            },
            _sum: { spend: true },
          });
          totalSpend = result._sum.spend || 0;
        }
        return { ...client, totalSpend: Math.round(totalSpend * 100) / 100 };
      })
    );

    return clientsWithSpend;
  }

  async getClientById(clientId: string, userId: string) {
    const client = await prisma.client.findFirst({
      where: { id: clientId, userId },
      include: {
        platforms: { select: { id: true, name: true, type: true, isConnected: true } },
        whatsappGroups: { select: { id: true, groupName: true, clientName: true } },
      },
    });
    if (!client) throw new NotFoundError('Cliente não encontrado');
    return client;
  }

  async createClient(userId: string, input: CreateClientInput) {
    return prisma.client.create({
      data: {
        ...input,
        email: input.email || null,
        userId,
      },
    });
  }

  async updateClient(clientId: string, userId: string, input: UpdateClientInput) {
    const existing = await prisma.client.findFirst({ where: { id: clientId, userId } });
    if (!existing) throw new NotFoundError('Cliente não encontrado');

    return prisma.client.update({
      where: { id: clientId },
      data: input,
    });
  }

  async deleteClient(clientId: string, userId: string) {
    const existing = await prisma.client.findFirst({ where: { id: clientId, userId } });
    if (!existing) throw new NotFoundError('Cliente não encontrado');

    await prisma.client.delete({ where: { id: clientId } });
    return { deleted: true };
  }
}

export const clientsService = new ClientsService();
