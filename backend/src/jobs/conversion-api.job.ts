import { conversionApiQueue } from '../config/queue';
import { logger } from '../utils/logger';
import { metaConversionApiService } from '../modules/conversion-events/meta-conversion-api.service';

interface ConversionJobData {
  userId: string;
  eventName: string;
  leadPhone?: string | null;
  leadEmail?: string | null;
  value?: number | null;
  currency?: string;
}

conversionApiQueue.process('send-conversion', async (job) => {
  const data = job.data as ConversionJobData;

  logger.info(`Sending conversion event "${data.eventName}" for user ${data.userId}`);

  const result = await metaConversionApiService.sendEvent({
    userId: data.userId,
    eventName: data.eventName,
    leadPhone: data.leadPhone,
    leadEmail: data.leadEmail,
    value: data.value,
    currency: data.currency,
  });

  if (!result.success) {
    throw new Error(`Conversion API failed: ${result.error}`);
  }

  return result;
});

logger.info('Conversion API job registered');
