import { cleanOldMetricsQueue } from '../config/queue';
import { prisma } from '../config/database';
import { logger } from '../utils/logger';
import { env } from '../config/env';

const RETENTION_DAYS = 730; // 2 years

// Process metrics cleanup
cleanOldMetricsQueue.process('clean-old-metrics', async (job) => {
  logger.info('Running old metrics cleanup...');

  const cutoffDate = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000);

  try {
    const result = await prisma.metric.deleteMany({
      where: {
        date: { lt: cutoffDate },
      },
    });

    // Clean API logs older than 7 days
    const apiLogCutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const apiLogResult = await prisma.apiLog.deleteMany({
      where: { createdAt: { lt: apiLogCutoff } },
    });

    logger.info(`Old metrics cleanup completed: ${result.count} metrics deleted, ${apiLogResult.count} API logs deleted`);

    return {
      deletedMetrics: result.count,
      deletedApiLogs: apiLogResult.count,
      cutoffDate: cutoffDate.toISOString(),
    };
  } catch (error: any) {
    logger.error('Old metrics cleanup failed:', {
      message: error.message,
      stack: error.stack,
    });
    throw error; // Bull will retry
  }
});

// Schedule recurring cleanup
async function scheduleRecurringCleanup() {
  const intervalMatch = env.CLEAN_OLD_METRICS_INTERVAL.match(/^(\d+)(m|h|d)$/);
  if (!intervalMatch) {
    logger.error('Invalid CLEAN_OLD_METRICS_INTERVAL format');
    return;
  }

  const [, value, unit] = intervalMatch;
  const intervals = {
    m: Number(value) * 60 * 1000,
    h: Number(value) * 60 * 60 * 1000,
    d: Number(value) * 24 * 60 * 60 * 1000,
  };

  const intervalMs = intervals[unit as 'm' | 'h' | 'd'];

  await cleanOldMetricsQueue.add(
    'clean-old-metrics',
    {},
    {
      repeat: { every: intervalMs },
    }
  );

  logger.info(`Scheduled recurring metrics cleanup every ${env.CLEAN_OLD_METRICS_INTERVAL} (retention: ${RETENTION_DAYS} days)`);
}

scheduleRecurringCleanup().catch((error) => {
  logger.error('Failed to schedule metrics cleanup:', error);
});

logger.info('Clean old metrics job worker started');
