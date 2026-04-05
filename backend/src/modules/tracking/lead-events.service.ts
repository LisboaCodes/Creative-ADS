import { prisma } from '../../config/database';
import { conversionApiQueue } from '../../config/queue';
import { logger } from '../../utils/logger';
import { keywordMatcherService } from '../journey/keyword-matcher.service';
import { webhookDispatcherService } from '../webhooks/webhook-dispatcher.service';

export class LeadEventsService {
  /**
   * Called when a brand-new lead is created (from any channel).
   * - Auto-assigns first-contact stage
   * - Fires NEW_LEAD webhook
   * - Enqueues conversion event for the first-contact stage (e.g. "Contact")
   */
  async onLeadCreated(leadId: string, userId: string): Promise<void> {
    try {
      const lead = await prisma.lead.findUnique({
        where: { id: leadId },
        include: { currentJourneyStage: true },
      });
      if (!lead) return;

      // Auto-assign first-contact stage if lead has no stage
      if (!lead.currentJourneyStageId) {
        const firstContactStage = await prisma.journeyStage.findFirst({
          where: { userId, isFirstContact: true },
          orderBy: { funnelOrder: 'asc' },
        });

        if (firstContactStage) {
          await prisma.$transaction([
            prisma.lead.update({
              where: { id: leadId },
              data: { currentJourneyStageId: firstContactStage.id },
            }),
            prisma.leadJourneyLog.create({
              data: {
                leadId,
                journeyStageId: firstContactStage.id,
                changedBy: 'system',
                metadata: { trigger: 'auto_first_contact' },
              },
            }),
          ]);

          // Fire conversion for the first-contact stage
          if (firstContactStage.conversionEvent) {
            await conversionApiQueue.add('send-conversion', {
              userId,
              eventName: firstContactStage.conversionEvent,
              leadPhone: lead.phone,
              leadEmail: lead.email,
            });
          }

          logger.info(`Lead ${leadId} auto-assigned to first-contact stage "${firstContactStage.name}"`);
        }
      }

      // Fire NEW_LEAD webhook
      await webhookDispatcherService.dispatch({
        event: 'NEW_LEAD',
        userId,
        data: {
          leadId: lead.id,
          name: lead.name,
          phone: lead.phone,
          email: lead.email,
          source: lead.source,
          createdAt: lead.createdAt,
        },
      });
    } catch (error) {
      logger.error(`Error in onLeadCreated for lead ${leadId}:`, error);
    }
  }

  /**
   * Called when a lead changes journey stage.
   * - Fires conversion event for the new stage
   * - Fires SALE_COMPLETED webhook if sale stage
   * - Fires LEAD_STAGE_CHANGE webhook
   */
  async onLeadStageChanged(
    leadId: string,
    userId: string,
    newStageId: string,
    previousStageId: string | null
  ): Promise<void> {
    try {
      const [lead, newStage] = await Promise.all([
        prisma.lead.findUnique({ where: { id: leadId } }),
        prisma.journeyStage.findUnique({ where: { id: newStageId } }),
      ]);
      if (!lead || !newStage) return;

      // Fire conversion event
      if (newStage.conversionEvent) {
        await conversionApiQueue.add('send-conversion', {
          userId,
          eventName: newStage.conversionEvent,
          leadPhone: lead.phone,
          leadEmail: lead.email,
          value: lead.value,
        });
      }

      // Fire LEAD_STAGE_CHANGE webhook
      await webhookDispatcherService.dispatch({
        event: 'LEAD_STAGE_CHANGE',
        userId,
        data: {
          leadId: lead.id,
          name: lead.name,
          phone: lead.phone,
          newStage: newStage.name,
          newStageOrder: newStage.funnelOrder,
          previousStageId,
        },
      });

      // Fire SALE_COMPLETED if this is a sale stage
      if (newStage.isSaleStage) {
        await prisma.lead.update({
          where: { id: leadId },
          data: { status: 'SOLD' },
        });

        await webhookDispatcherService.dispatch({
          event: 'SALE_COMPLETED',
          userId,
          data: {
            leadId: lead.id,
            name: lead.name,
            phone: lead.phone,
            value: lead.value,
            stageName: newStage.name,
          },
        });

        logger.info(`Lead ${leadId} marked as SOLD (stage "${newStage.name}")`);
      }
    } catch (error) {
      logger.error(`Error in onLeadStageChanged for lead ${leadId}:`, error);
    }
  }

  /**
   * Called when a new message is received for an existing lead.
   * - Runs keyword matcher
   * - If keyword matches and is a higher stage, moves the lead
   */
  async onMessageReceived(leadId: string, userId: string, messageText: string): Promise<void> {
    try {
      if (!messageText) return;

      const lead = await prisma.lead.findUnique({
        where: { id: leadId },
        include: { currentJourneyStage: true },
      });
      if (!lead) return;

      const currentOrder = lead.currentJourneyStage?.funnelOrder ?? null;

      const match = await keywordMatcherService.matchKeyword(userId, messageText, currentOrder);
      if (!match) return;

      // Move lead to the matched stage
      const previousStageId = lead.currentJourneyStageId;

      await prisma.$transaction([
        prisma.lead.update({
          where: { id: leadId },
          data: { currentJourneyStageId: match.stageId },
        }),
        prisma.leadJourneyLog.create({
          data: {
            leadId,
            journeyStageId: match.stageId,
            changedBy: 'system',
            metadata: {
              trigger: 'keyword_match',
              keyword: messageText,
              previousStageId,
            },
          },
        }),
      ]);

      logger.info(`Lead ${leadId} moved to stage "${match.stageName}" via keyword match`);

      // Trigger stage change lifecycle
      await this.onLeadStageChanged(leadId, userId, match.stageId, previousStageId);
    } catch (error) {
      logger.error(`Error in onMessageReceived for lead ${leadId}:`, error);
    }
  }
}

export const leadEventsService = new LeadEventsService();
