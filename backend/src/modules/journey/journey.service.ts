import { prisma } from '../../config/database';
import { NotFoundError } from '../../utils/errors';
import { leadEventsService } from '../tracking/lead-events.service';
import type { CreateJourneyStageInput, UpdateJourneyStageInput, ReorderStagesInput, MoveLeadInput } from './journey.schemas';

export class JourneyService {
  async getStages(userId: string) {
    const stages = await prisma.journeyStage.findMany({
      where: { userId },
      include: {
        _count: { select: { leads: true, journeyLogs: true } },
      },
      orderBy: { funnelOrder: 'asc' },
    });

    // Auto-seed default stages if empty
    if (stages.length === 0) {
      await prisma.journeyStage.createMany({
        data: [
          { name: 'Fez Contato', funnelOrder: 1, isFirstContact: true, conversionEvent: 'Contact', userId },
          { name: 'Comprou', funnelOrder: 2, isSaleStage: true, conversionEvent: 'Purchase', userId },
        ],
      });
      return prisma.journeyStage.findMany({
        where: { userId },
        include: { _count: { select: { leads: true, journeyLogs: true } } },
        orderBy: { funnelOrder: 'asc' },
      });
    }

    return stages;
  }

  async createStage(userId: string, input: CreateJourneyStageInput) {
    const lastStage = await prisma.journeyStage.findFirst({
      where: { userId },
      orderBy: { funnelOrder: 'desc' },
      select: { funnelOrder: true },
    });
    const nextOrder = (lastStage?.funnelOrder || 0) + 1;

    return prisma.journeyStage.create({
      data: {
        name: input.name,
        funnelOrder: nextOrder,
        conversionEvent: input.conversionEvent || null,
        isSaleStage: input.isSaleStage || false,
        isFirstContact: input.isFirstContact || false,
        triggerKeyword: input.triggerKeyword || null,
        userId,
      },
    });
  }

  async updateStage(id: string, userId: string, input: UpdateJourneyStageInput) {
    const existing = await prisma.journeyStage.findFirst({ where: { id, userId } });
    if (!existing) throw new NotFoundError('Etapa não encontrada');

    return prisma.journeyStage.update({
      where: { id },
      data: input,
    });
  }

  async deleteStage(id: string, userId: string) {
    const existing = await prisma.journeyStage.findFirst({ where: { id, userId } });
    if (!existing) throw new NotFoundError('Etapa não encontrada');

    await prisma.journeyStage.delete({ where: { id } });

    // Reorder remaining stages
    const remaining = await prisma.journeyStage.findMany({
      where: { userId },
      orderBy: { funnelOrder: 'asc' },
    });
    for (let i = 0; i < remaining.length; i++) {
      if (remaining[i].funnelOrder !== i + 1) {
        await prisma.journeyStage.update({
          where: { id: remaining[i].id },
          data: { funnelOrder: i + 1 },
        });
      }
    }

    return { deleted: true };
  }

  async reorderStages(userId: string, input: ReorderStagesInput) {
    const stages = await prisma.journeyStage.findMany({ where: { userId } });
    const stageIds = stages.map((s) => s.id);

    for (const id of input.orderedIds) {
      if (!stageIds.includes(id)) throw new NotFoundError(`Etapa ${id} não encontrada`);
    }

    await Promise.all(
      input.orderedIds.map((id, index) =>
        prisma.journeyStage.update({
          where: { id },
          data: { funnelOrder: index + 1 },
        })
      )
    );

    return prisma.journeyStage.findMany({
      where: { userId },
      orderBy: { funnelOrder: 'asc' },
    });
  }

  async moveLeadToStage(leadId: string, userId: string, input: MoveLeadInput) {
    const lead = await prisma.lead.findFirst({ where: { id: leadId, userId } });
    if (!lead) throw new NotFoundError('Lead não encontrado');

    const stage = await prisma.journeyStage.findFirst({ where: { id: input.journeyStageId, userId } });
    if (!stage) throw new NotFoundError('Etapa não encontrada');

    const [updatedLead, log] = await prisma.$transaction([
      prisma.lead.update({
        where: { id: leadId },
        data: { currentJourneyStageId: input.journeyStageId },
      }),
      prisma.leadJourneyLog.create({
        data: {
          leadId,
          journeyStageId: input.journeyStageId,
          changedBy: 'manual',
          metadata: { previousStageId: lead.currentJourneyStageId },
        },
      }),
    ]);

    // Trigger lifecycle events asynchronously
    leadEventsService.onLeadStageChanged(
      leadId,
      userId,
      input.journeyStageId,
      lead.currentJourneyStageId
    ).catch(() => {});

    return { lead: updatedLead, log };
  }
}

export const journeyService = new JourneyService();
