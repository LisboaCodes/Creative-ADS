import crypto from 'crypto';
import { prisma } from '../../config/database';
import { PlatformType } from '@prisma/client';
import { facebookService } from '../platforms/integrations/facebook.service';
import { NotFoundError, ValidationError } from '../../utils/errors';
import { logger } from '../../utils/logger';
import type { CreateAudienceInput, UpdateAudienceInput } from './audiences.schemas';

class AudiencesService {
  private hashEmail(email: string): string {
    const normalized = email.trim().toLowerCase();
    return crypto.createHash('sha256').update(normalized).digest('hex');
  }

  async getAudiences(userId: string) {
    return prisma.audience.findMany({
      where: { userId },
      include: { platform: { select: { id: true, name: true, type: true, externalId: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getAudienceById(audienceId: string, userId: string) {
    const audience = await prisma.audience.findFirst({
      where: { id: audienceId, userId },
      include: { platform: { select: { id: true, name: true, type: true, externalId: true } } },
    });

    if (!audience) throw new NotFoundError('Público não encontrado');
    return audience;
  }

  async createAudience(userId: string, input: CreateAudienceInput) {
    const platform = await prisma.platform.findFirst({
      where: { id: input.platformId, userId, isConnected: true },
    });

    if (!platform) throw new NotFoundError('Plataforma não encontrada ou desconectada');
    if (platform.type !== PlatformType.FACEBOOK) {
      throw new ValidationError('Públicos personalizados são suportados apenas no Facebook/Instagram por enquanto');
    }

    // Create audience on Facebook
    const fbAudience = await facebookService.createCustomAudience(
      platform.accessToken,
      platform.externalId,
      { name: input.name, description: input.description }
    );

    // Hash emails
    const hashedEmails = input.emails.map((email) => this.hashEmail(email));

    // Save to DB with PROCESSING status
    const audience = await prisma.audience.create({
      data: {
        name: input.name,
        description: input.description,
        externalId: fbAudience.id,
        status: 'PROCESSING',
        emailCount: input.emails.length,
        source: input.source || 'manual',
        userId,
        platformId: platform.id,
      },
      include: { platform: { select: { id: true, name: true, type: true, externalId: true } } },
    });

    // Fire-and-forget: upload emails and update status
    this.uploadEmailsAndUpdateStatus(
      audience.id,
      platform.accessToken,
      fbAudience.id,
      hashedEmails
    ).catch((err) => logger.error('Background audience upload failed:', err));

    return audience;
  }

  async uploadEmailsAndUpdateStatus(
    audienceId: string,
    accessToken: string,
    fbAudienceId: string,
    hashedEmails: string[]
  ): Promise<void> {
    try {
      await facebookService.addUsersToCustomAudience(accessToken, fbAudienceId, hashedEmails);

      // Give Facebook a moment to process, then fetch approximate count
      const details = await facebookService.getCustomAudience(accessToken, fbAudienceId);

      await prisma.audience.update({
        where: { id: audienceId },
        data: {
          status: 'READY',
          approximateSize: details.approximateCount || null,
        },
      });

      logger.info(`Audience ${audienceId} uploaded successfully (${hashedEmails.length} emails)`);
    } catch (error: any) {
      await prisma.audience.update({
        where: { id: audienceId },
        data: {
          status: 'ERROR',
          errorMessage: error.message || 'Falha ao fazer upload dos emails',
        },
      });

      logger.error(`Audience ${audienceId} upload failed:`, error.message);
    }
  }

  async updateAudience(audienceId: string, userId: string, input: UpdateAudienceInput) {
    const audience = await this.getAudienceById(audienceId, userId);

    return prisma.audience.update({
      where: { id: audience.id },
      data: {
        ...(input.name !== undefined && { name: input.name }),
        ...(input.description !== undefined && { description: input.description }),
      },
      include: { platform: { select: { id: true, name: true, type: true, externalId: true } } },
    });
  }

  async deleteAudience(audienceId: string, userId: string) {
    const audience = await this.getAudienceById(audienceId, userId);

    // Delete on Facebook if we have an externalId
    if (audience.externalId) {
      const platform = await prisma.platform.findUnique({ where: { id: audience.platformId } });
      if (platform) {
        try {
          await facebookService.deleteCustomAudience(platform.accessToken, audience.externalId);
        } catch (error: any) {
          // Log but don't block deletion - audience may already be gone on FB
          logger.warn(`Failed to delete audience ${audience.externalId} from Facebook: ${error.message}`);
        }
      }
    }

    await prisma.audience.delete({ where: { id: audience.id } });
  }

  async refreshAudienceSize(audienceId: string, userId: string) {
    const audience = await this.getAudienceById(audienceId, userId);

    if (!audience.externalId) {
      throw new ValidationError('Público sem ID externo - não é possível atualizar');
    }

    const platform = await prisma.platform.findUnique({ where: { id: audience.platformId } });
    if (!platform) throw new NotFoundError('Plataforma não encontrada');

    const details = await facebookService.getCustomAudience(platform.accessToken, audience.externalId);

    return prisma.audience.update({
      where: { id: audience.id },
      data: { approximateSize: details.approximateCount || null },
      include: { platform: { select: { id: true, name: true, type: true, externalId: true } } },
    });
  }

  async getAudiencesForPlatform(userId: string, platformId: string) {
    return prisma.audience.findMany({
      where: { userId, platformId, status: 'READY' },
      select: {
        id: true,
        name: true,
        externalId: true,
        emailCount: true,
        approximateSize: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}

export const audiencesService = new AudiencesService();
