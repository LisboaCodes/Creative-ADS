import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/database';
import { logger } from '../../utils/logger';
import { AppError, NotFoundError, ValidationError } from '../../utils/errors';
import { evolutionService } from './evolution.service';
import { whatsAppNotificationsService } from './whatsapp-notifications.service';
import { createWhatsAppGroupSchema, updateWhatsAppGroupSchema } from './whatsapp.schemas';

export class WhatsAppController {
  async getGroups(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.userId;

      const groups = await prisma.whatsAppGroup.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      });

      // Resolve platform names for each group
      const allPlatformIds = [...new Set(groups.flatMap((g) => g.platformIds))];
      const platforms = allPlatformIds.length > 0
        ? await prisma.platform.findMany({
            where: { id: { in: allPlatformIds } },
            select: { id: true, name: true, type: true },
          })
        : [];
      const platformMap = new Map(platforms.map((p) => [p.id, p]));

      const enrichedGroups = groups.map((g) => ({
        ...g,
        platforms: g.platformIds.map((pid) => platformMap.get(pid)).filter(Boolean),
      }));

      res.json({ success: true, data: enrichedGroups });
    } catch (error) {
      next(error);
    }
  }

  async createGroup(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.userId;
      const data = createWhatsAppGroupSchema.parse(req.body);

      // Verify platforms belong to user
      const platforms = await prisma.platform.findMany({
        where: { id: { in: data.platformIds }, userId },
      });

      if (platforms.length !== data.platformIds.length) {
        throw new ValidationError('Uma ou mais plataformas não foram encontradas');
      }

      const group = await prisma.whatsAppGroup.create({
        data: {
          userId,
          groupJid: data.groupJid,
          groupName: data.groupName,
          clientName: data.clientName,
          platformIds: data.platformIds,
          notifyStatusChange: data.notifyStatusChange,
          notifyBudgetChange: data.notifyBudgetChange,
          notifyPerformance: data.notifyPerformance,
          notifyDailySummary: data.notifyDailySummary,
        },
      });

      res.status(201).json({ success: true, data: group });
    } catch (error) {
      if (error instanceof AppError) return next(error);
      next(error);
    }
  }

  async updateGroup(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.userId;
      const { id } = req.params;
      const data = updateWhatsAppGroupSchema.parse(req.body);

      const existing = await prisma.whatsAppGroup.findFirst({
        where: { id, userId },
      });

      if (!existing) {
        throw new NotFoundError('Grupo não encontrado');
      }

      if (data.platformIds) {
        const platforms = await prisma.platform.findMany({
          where: { id: { in: data.platformIds }, userId },
        });
        if (platforms.length !== data.platformIds.length) {
          throw new ValidationError('Uma ou mais plataformas não foram encontradas');
        }
      }

      const updated = await prisma.whatsAppGroup.update({
        where: { id },
        data,
      });

      res.json({ success: true, data: updated });
    } catch (error) {
      if (error instanceof AppError) return next(error);
      next(error);
    }
  }

  async deleteGroup(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.userId;
      const { id } = req.params;

      const existing = await prisma.whatsAppGroup.findFirst({
        where: { id, userId },
      });

      if (!existing) {
        throw new NotFoundError('Grupo não encontrado');
      }

      await prisma.whatsAppGroup.update({
        where: { id },
        data: { isActive: false },
      });

      res.json({ success: true, message: 'Grupo desativado' });
    } catch (error) {
      if (error instanceof AppError) return next(error);
      next(error);
    }
  }

  async getAvailableGroups(req: Request, res: Response, next: NextFunction) {
    try {
      const groups = await evolutionService.fetchGroups();
      res.json({ success: true, data: groups });
    } catch (error: any) {
      logger.error('Failed to fetch WhatsApp groups:', error.message);
      next(new AppError('Falha ao buscar grupos do WhatsApp', 502));
    }
  }

  async sendTestMessage(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.userId;
      const { id } = req.params;

      const group = await prisma.whatsAppGroup.findFirst({
        where: { id, userId },
      });

      if (!group) {
        throw new NotFoundError('Grupo não encontrado');
      }

      const testMessage = [
        `✅ *Teste de Conexão - HackrAds*`,
        ``,
        `Grupo: *${group.groupName}*`,
        `Cliente: ${group.clientName}`,
        ``,
        `As notificações estão funcionando corretamente!`,
        `Configurado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`,
      ].join('\n');

      await evolutionService.sendTextMessage(group.groupJid, testMessage);

      res.json({ success: true, message: 'Mensagem de teste enviada' });
    } catch (error) {
      if (error instanceof AppError) return next(error);
      next(error);
    }
  }

  async getStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const status = await evolutionService.checkConnection();
      res.json({
        success: true,
        data: {
          configured: evolutionService.isConfigured(),
          ...status,
        },
      });
    } catch (error) {
      next(error);
    }
  }
}

export const whatsAppController = new WhatsAppController();
