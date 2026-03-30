import crypto from 'crypto';
import { processClickQueue } from '../config/queue';
import { prisma } from '../config/database';
import { logger } from '../utils/logger';

processClickQueue.process('process-click', async (job) => {
  const { trackingLinkId, ip, userAgent, referer } = job.data;

  const fingerprint = crypto
    .createHash('sha256')
    .update(`${ip}:${userAgent}`)
    .digest('hex')
    .substring(0, 16);

  // Create click record
  await prisma.click.create({
    data: {
      trackingLinkId,
      ipAddress: ip || null,
      userAgent: userAgent || null,
      referer: referer || null,
      fingerprint,
    },
  });

  // Check if this fingerprint is unique for this link
  const existingCount = await prisma.click.count({
    where: {
      trackingLinkId,
      fingerprint,
    },
  });

  // Increment counters
  const isUnique = existingCount === 1; // Just created = first occurrence
  await prisma.trackingLink.update({
    where: { id: trackingLinkId },
    data: {
      totalClicks: { increment: 1 },
      ...(isUnique && { uniqueClicks: { increment: 1 } }),
    },
  });
});

logger.info('Process click job worker started');
