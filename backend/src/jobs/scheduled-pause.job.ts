import { scheduledPauseQueue } from '../config/queue';
import { prisma } from '../config/database';
import { campaignsService } from '../modules/campaigns/campaigns.service';
import { whatsAppNotificationsService } from '../modules/whatsapp/whatsapp-notifications.service';
import { notificationsService } from '../modules/notifications/notifications.service';
import { logger } from '../utils/logger';

/**
 * Job: pause-campaign
 * Pauses a campaign and schedules the resume job
 */
scheduledPauseQueue.process('pause-campaign', async (job) => {
  const { scheduleId } = job.data;

  logger.info(`Processing scheduled pause for schedule: ${scheduleId}`);

  const schedule = await prisma.campaignSchedule.findUnique({
    where: { id: scheduleId },
    include: { campaign: { include: { platform: true } } },
  });

  if (!schedule || schedule.status === 'cancelled' || schedule.status === 'completed') {
    logger.info(`Schedule ${scheduleId} is ${schedule?.status || 'not found'}, skipping pause`);
    return;
  }

  // Check max executions
  if (schedule.maxExecutions && schedule.executionCount >= schedule.maxExecutions) {
    await prisma.campaignSchedule.update({
      where: { id: scheduleId },
      data: { status: 'completed', currentAction: null, jobId: null },
    });
    logger.info(`Schedule ${scheduleId} reached max executions, marking completed`);
    return;
  }

  try {
    // Pause the campaign on the platform + DB
    await campaignsService.updateCampaignStatus(schedule.campaignId, schedule.userId, { status: 'PAUSED' });

    // Schedule the resume job after pauseDuration minutes
    const resumeDelay = schedule.pauseDuration * 60 * 1000;
    const nextActionAt = new Date(Date.now() + resumeDelay);

    const resumeJob = await scheduledPauseQueue.add(
      'resume-campaign',
      { scheduleId },
      { delay: resumeDelay }
    );

    await prisma.campaignSchedule.update({
      where: { id: scheduleId },
      data: {
        status: 'paused_waiting',
        currentAction: 'paused',
        jobId: String(resumeJob.id),
        nextActionAt,
        executionCount: { increment: 1 },
      },
    });

    // Notifications
    const nextActionLabel = formatDuration(schedule.pauseDuration);
    whatsAppNotificationsService.notifyGroups(schedule.userId, 'SCHEDULED_PAUSE', {
      campaign: { name: schedule.campaign.name, platformId: schedule.campaign.platformId },
      metrics: { nextAction: `Retomar em ${nextActionLabel}` },
    }).catch(err => logger.warn('WhatsApp scheduled pause notification failed:', err.message));

    notificationsService.createNotification(schedule.userId, {
      title: 'Campanha pausada (agendamento)',
      message: `"${schedule.campaign.name}" foi pausada. Será retomada em ${nextActionLabel}.`,
      type: 'INFO',
    }).catch(err => logger.warn('In-app scheduled pause notification failed:', err.message));

    logger.info(`Campaign "${schedule.campaign.name}" paused, resume scheduled in ${nextActionLabel}`);
  } catch (error: any) {
    logger.error(`Scheduled pause failed for schedule ${scheduleId}:`, error.message);
    throw error;
  }
});

/**
 * Job: resume-campaign
 * Resumes a campaign. If recurring, schedules next pause.
 */
scheduledPauseQueue.process('resume-campaign', async (job) => {
  const { scheduleId } = job.data;

  logger.info(`Processing scheduled resume for schedule: ${scheduleId}`);

  const schedule = await prisma.campaignSchedule.findUnique({
    where: { id: scheduleId },
    include: { campaign: { include: { platform: true } } },
  });

  if (!schedule || schedule.status === 'cancelled' || schedule.status === 'completed') {
    logger.info(`Schedule ${scheduleId} is ${schedule?.status || 'not found'}, skipping resume`);
    return;
  }

  try {
    // Resume the campaign on the platform + DB
    await campaignsService.updateCampaignStatus(schedule.campaignId, schedule.userId, { status: 'ACTIVE' });

    if (schedule.type === 'recurring' && schedule.resumeDuration) {
      // Check max executions before scheduling next pause
      const newCount = schedule.executionCount; // already incremented on pause
      if (schedule.maxExecutions && newCount >= schedule.maxExecutions) {
        await prisma.campaignSchedule.update({
          where: { id: scheduleId },
          data: { status: 'completed', currentAction: null, jobId: null, nextActionAt: null },
        });
        logger.info(`Schedule ${scheduleId} completed all executions`);
      } else {
        // Schedule next pause after resumeDuration minutes
        const pauseDelay = schedule.resumeDuration * 60 * 1000;
        const nextActionAt = new Date(Date.now() + pauseDelay);

        const pauseJob = await scheduledPauseQueue.add(
          'pause-campaign',
          { scheduleId },
          { delay: pauseDelay }
        );

        await prisma.campaignSchedule.update({
          where: { id: scheduleId },
          data: {
            status: 'active',
            currentAction: 'resumed',
            jobId: String(pauseJob.id),
            nextActionAt,
          },
        });

        const nextPauseLabel = formatDuration(schedule.resumeDuration);

        whatsAppNotificationsService.notifyGroups(schedule.userId, 'SCHEDULED_RESUME', {
          campaign: { name: schedule.campaign.name, platformId: schedule.campaign.platformId },
          metrics: { nextAction: `Próxima pausa em ${nextPauseLabel}` },
        }).catch(err => logger.warn('WhatsApp scheduled resume notification failed:', err.message));

        logger.info(`Campaign "${schedule.campaign.name}" resumed, next pause in ${nextPauseLabel}`);
      }
    } else {
      // One-time schedule: mark as completed
      await prisma.campaignSchedule.update({
        where: { id: scheduleId },
        data: { status: 'completed', currentAction: null, jobId: null, nextActionAt: null },
      });
      logger.info(`Schedule ${scheduleId} completed (one-time)`);
    }

    notificationsService.createNotification(schedule.userId, {
      title: 'Campanha retomada (agendamento)',
      message: `"${schedule.campaign.name}" foi reativada automaticamente.`,
      type: 'SUCCESS',
    }).catch(err => logger.warn('In-app scheduled resume notification failed:', err.message));
  } catch (error: any) {
    logger.error(`Scheduled resume failed for schedule ${scheduleId}:`, error.message);
    throw error;
  }
});

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} minuto${minutes !== 1 ? 's' : ''}`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours < 24) {
    return mins > 0 ? `${hours}h ${mins}min` : `${hours} hora${hours !== 1 ? 's' : ''}`;
  }
  const days = Math.floor(hours / 24);
  const remHours = hours % 24;
  return remHours > 0 ? `${days}d ${remHours}h` : `${days} dia${days !== 1 ? 's' : ''}`;
}

logger.info('Scheduled pause job worker started');
