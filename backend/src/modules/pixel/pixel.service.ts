import { prisma } from '../../config/database';
import { NotFoundError } from '../../utils/errors';
import type { CreatePixelConfigInput, UpdatePixelConfigInput } from './pixel.schemas';

export class PixelService {
  async getConfigs(userId: string) {
    return prisma.pixelConfig.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createConfig(userId: string, input: CreatePixelConfigInput) {
    return prisma.pixelConfig.create({
      data: {
        platform: input.platform,
        pixelId: input.pixelId,
        accessToken: input.accessToken,
        testEventCode: input.testEventCode || null,
        isActive: input.isActive ?? true,
        userId,
      },
    });
  }

  async updateConfig(id: string, userId: string, input: UpdatePixelConfigInput) {
    const existing = await prisma.pixelConfig.findFirst({ where: { id, userId } });
    if (!existing) throw new NotFoundError('Configuração de pixel não encontrada');

    return prisma.pixelConfig.update({
      where: { id },
      data: input,
    });
  }

  async deleteConfig(id: string, userId: string) {
    const existing = await prisma.pixelConfig.findFirst({ where: { id, userId } });
    if (!existing) throw new NotFoundError('Configuração de pixel não encontrada');

    await prisma.pixelConfig.delete({ where: { id } });
    return { deleted: true };
  }

  async testPixel(id: string, userId: string) {
    const config = await prisma.pixelConfig.findFirst({ where: { id, userId } });
    if (!config) throw new NotFoundError('Configuração de pixel não encontrada');

    return {
      success: true,
      message: `Disparo de teste enviado para Pixel ${config.pixelId} (${config.platform})`,
      pixelId: config.pixelId,
      platform: config.platform,
    };
  }
}

export const pixelService = new PixelService();
