import { incomingMessageQueue } from '../config/queue';
import { prisma } from '../config/database';
import { logger } from '../utils/logger';
import { leadEventsService } from '../modules/tracking/lead-events.service';
import type { MessageChannel } from '@prisma/client';

interface IncomingMessageData {
  channel: MessageChannel;
  externalId: string;
  phone: string | null;
  senderName: string | null;
  senderId: string | null;
  content: string;
  instance?: string;
  pageId?: string;
  rawPayload?: any;
  receivedAt: string;
}

incomingMessageQueue.process('process', async (job) => {
  const data = job.data as IncomingMessageData;

  logger.info(`Processing incoming ${data.channel} message: ${data.externalId}`);

  // Dedup: check if we already processed this message
  const existing = await prisma.conversationMessage.findUnique({
    where: {
      externalId_channel: {
        externalId: data.externalId,
        channel: data.channel,
      },
    },
  });

  if (existing) {
    logger.debug(`Message ${data.externalId} already processed, skipping`);
    return { deduplicated: true };
  }

  // Find or create lead
  // For WhatsApp: match by phone
  // For Instagram/Messenger: match by senderId in metadata
  let lead = null;
  let isNewLead = false;

  if (data.channel === 'WHATSAPP' && data.phone) {
    // Find lead by phone across all users (scoped by Evolution instance owner)
    // We need to find which user owns the Evolution instance
    lead = await prisma.lead.findFirst({
      where: { phone: data.phone },
      include: { currentJourneyStage: true },
      orderBy: { createdAt: 'desc' },
    });
  } else if (data.senderId) {
    // For Instagram/Messenger: find by whatsappConversationId (repurposed as platform sender ID)
    lead = await prisma.lead.findFirst({
      where: { whatsappConversationId: `${data.channel}:${data.senderId}` },
      include: { currentJourneyStage: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Determine the owner userId
  // For WhatsApp: find user who has Evolution configured
  // For Meta: find user who has a platform with the pageId
  let userId: string | null = null;

  if (lead) {
    userId = lead.userId;
  } else {
    // Try to find the user
    if (data.channel === 'WHATSAPP') {
      // Find any user with Evolution config (first match - single-tenant assumption)
      const user = await prisma.user.findFirst({
        where: { isActive: true },
        orderBy: { createdAt: 'asc' },
        select: { id: true },
      });
      userId = user?.id || null;
    } else if (data.pageId) {
      // Find user who owns this Facebook page (via platform externalId or metadata)
      const platform = await prisma.platform.findFirst({
        where: {
          type: { in: ['FACEBOOK', 'INSTAGRAM'] },
        },
        select: { userId: true },
      });
      userId = platform?.userId || null;
    }
  }

  if (!userId) {
    logger.warn(`Cannot determine owner user for ${data.channel} message from ${data.phone || data.senderId}`);
    return { error: 'no_user_found' };
  }

  // Create lead if doesn't exist
  if (!lead) {
    const sourceMap: Record<string, 'WHATSAPP' | 'INSTAGRAM' | 'OTHER'> = {
      WHATSAPP: 'WHATSAPP',
      INSTAGRAM: 'INSTAGRAM',
      MESSENGER: 'OTHER',
    };

    lead = await prisma.lead.create({
      data: {
        name: data.senderName || undefined,
        phone: data.phone || undefined,
        source: sourceMap[data.channel] || 'OTHER',
        status: 'NEW',
        whatsappConversationId: data.senderId ? `${data.channel}:${data.senderId}` : undefined,
        userId,
      },
      include: { currentJourneyStage: true },
    });
    isNewLead = true;

    logger.info(`New lead created: ${lead.id} (${data.channel}, ${data.phone || data.senderId})`);
  }

  // Save ConversationMessage
  await prisma.conversationMessage.create({
    data: {
      externalId: data.externalId,
      channel: data.channel,
      direction: 'inbound',
      content: data.content || null,
      senderName: data.senderName,
      senderId: data.senderId,
      metadata: data.rawPayload ? { raw: data.rawPayload } : undefined,
      leadId: lead.id,
    },
  });

  // Trigger lifecycle events
  if (isNewLead) {
    await leadEventsService.onLeadCreated(lead.id, userId);
  }

  // Always run keyword matching on message received
  if (data.content) {
    await leadEventsService.onMessageReceived(lead.id, userId, data.content);
  }

  return {
    leadId: lead.id,
    isNewLead,
    channel: data.channel,
  };
});

logger.info('Process incoming message job registered');
