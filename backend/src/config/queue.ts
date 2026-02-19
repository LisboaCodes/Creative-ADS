import Queue from 'bull';
import { env } from './env';
import { logger } from '../utils/logger';

const redisConfig = {
  host: env.REDIS_HOST,
  port: env.REDIS_PORT,
  password: env.REDIS_PASSWORD,
};

// Create queues
export const syncCampaignsQueue = new Queue('sync-campaigns', {
  redis: redisConfig,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: true,
    removeOnFail: false,
  },
});

export const calculateMetricsQueue = new Queue('calculate-metrics', {
  redis: redisConfig,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: true,
    removeOnFail: false,
  },
});

export const checkAlertsQueue = new Queue('check-alerts', {
  redis: redisConfig,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: true,
    removeOnFail: false,
  },
});

export const generateReportsQueue = new Queue('generate-reports', {
  redis: redisConfig,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: true,
    removeOnFail: false,
  },
});

// Queue event listeners
const setupQueueListeners = (queue: Queue.Queue, name: string) => {
  queue.on('completed', (job) => {
    logger.info(`✅ Job completed in ${name}:`, { jobId: job.id });
  });

  queue.on('failed', (job, err) => {
    logger.error(`❌ Job failed in ${name}:`, {
      jobId: job.id,
      error: err.message,
    });
  });

  queue.on('stalled', (job) => {
    logger.warn(`⚠️ Job stalled in ${name}:`, { jobId: job.id });
  });

  queue.on('error', (error) => {
    logger.error(`❌ Queue error in ${name}:`, error);
  });
};

setupQueueListeners(syncCampaignsQueue, 'sync-campaigns');
setupQueueListeners(calculateMetricsQueue, 'calculate-metrics');
setupQueueListeners(checkAlertsQueue, 'check-alerts');
setupQueueListeners(generateReportsQueue, 'generate-reports');

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('Closing queues...');
  await Promise.all([
    syncCampaignsQueue.close(),
    calculateMetricsQueue.close(),
    checkAlertsQueue.close(),
    generateReportsQueue.close(),
  ]);
  logger.info('✅ Queues closed');
});

export const queues = {
  syncCampaigns: syncCampaignsQueue,
  calculateMetrics: calculateMetricsQueue,
  checkAlerts: checkAlertsQueue,
  generateReports: generateReportsQueue,
};
