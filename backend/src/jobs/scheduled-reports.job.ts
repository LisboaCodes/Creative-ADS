import { generateReportsQueue } from '../config/queue';
import { prisma } from '../config/database';
import { reportsService } from '../modules/reports/reports.service';
import { whatsAppNotificationsService } from '../modules/whatsapp/whatsapp-notifications.service';
import { logger } from '../utils/logger';

// Process scheduled report generation
generateReportsQueue.process('generate-scheduled-reports', async (job) => {
  logger.info('Running scheduled report generation...');

  const now = new Date();

  // Find reports that are due to run
  const dueReports = await prisma.report.findMany({
    where: {
      isScheduled: true,
      nextRunAt: { lte: now },
    },
    include: {
      user: { select: { id: true, name: true } },
    },
  });

  let generated = 0;

  for (const report of dueReports) {
    try {
      const config = report.config as any;
      const scheduleConfig = report.scheduleConfig as any;

      // Regenerate the report with updated date range
      const periodDays = scheduleConfig?.periodDays || 30;
      const startDate = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000);
      const endDate = new Date();

      await reportsService.generateReport(report.userId, {
        title: report.title,
        template: report.template as any,
        platformId: config?.platformId || undefined,
        startDate,
        endDate,
      });

      // Calculate next run
      const nextRunAt = calculateNextRun(scheduleConfig?.frequency || 'weekly', scheduleConfig?.hour || 8);

      await prisma.report.update({
        where: { id: report.id },
        data: { nextRunAt },
      });

      // Send via WhatsApp if configured
      if (scheduleConfig?.sendWhatsApp) {
        try {
          await whatsAppNotificationsService.notifyGroups(report.userId, 'REPORT_GENERATED', {
            reportTitle: report.title,
            template: report.template,
            period: `${startDate.toLocaleDateString('pt-BR')} - ${endDate.toLocaleDateString('pt-BR')}`,
          });
        } catch (err) {
          logger.warn('WhatsApp report notification failed', err);
        }
      }

      generated++;
    } catch (error: any) {
      logger.error(`Scheduled report ${report.id} generation failed:`, error.message);
    }
  }

  logger.info(`Scheduled reports: ${generated}/${dueReports.length} generated`);
});

function calculateNextRun(frequency: string, hour: number): Date {
  const next = new Date();
  next.setHours(hour, 0, 0, 0);

  switch (frequency) {
    case 'daily':
      next.setDate(next.getDate() + 1);
      break;
    case 'weekly':
      next.setDate(next.getDate() + 7);
      break;
    case 'biweekly':
      next.setDate(next.getDate() + 14);
      break;
    case 'monthly':
      next.setMonth(next.getMonth() + 1);
      break;
    default:
      next.setDate(next.getDate() + 7);
  }

  return next;
}

// Schedule check every hour
async function scheduleReportChecks() {
  await generateReportsQueue.add(
    'generate-scheduled-reports',
    {},
    {
      repeat: { every: 60 * 60 * 1000 }, // every hour
    }
  );

  logger.info('Scheduled report generation checks every 1 hour');
}

scheduleReportChecks().catch((error) => {
  logger.error('Failed to schedule report generation checks:', error);
});

logger.info('Scheduled reports job worker started');
