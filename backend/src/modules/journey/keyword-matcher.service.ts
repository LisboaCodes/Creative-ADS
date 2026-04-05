import { prisma } from '../../config/database';
import { logger } from '../../utils/logger';

export class KeywordMatcherService {
  /**
   * Matches an incoming message against journey stage triggerKeywords.
   * Case-insensitive, returns the stage with highest funnelOrder that matches.
   * Only advances (never retrocedes) - returns null if matched stage <= current.
   */
  async matchKeyword(
    userId: string,
    messageText: string,
    currentFunnelOrder: number | null
  ): Promise<{ stageId: string; stageName: string; funnelOrder: number } | null> {
    if (!messageText || !messageText.trim()) return null;

    const stages = await prisma.journeyStage.findMany({
      where: {
        userId,
        triggerKeyword: { not: null },
      },
      orderBy: { funnelOrder: 'desc' },
    });

    const normalizedMessage = messageText.toLowerCase().trim();

    for (const stage of stages) {
      if (!stage.triggerKeyword) continue;

      const keyword = stage.triggerKeyword.toLowerCase().trim();
      if (!keyword) continue;

      if (normalizedMessage.includes(keyword)) {
        // Only advance, never retrocede
        if (currentFunnelOrder !== null && stage.funnelOrder <= currentFunnelOrder) {
          logger.debug(`Keyword "${keyword}" matched stage "${stage.name}" but funnelOrder ${stage.funnelOrder} <= current ${currentFunnelOrder}, skipping`);
          continue;
        }

        logger.info(`Keyword "${keyword}" matched -> stage "${stage.name}" (order ${stage.funnelOrder})`);
        return {
          stageId: stage.id,
          stageName: stage.name,
          funnelOrder: stage.funnelOrder,
        };
      }
    }

    return null;
  }
}

export const keywordMatcherService = new KeywordMatcherService();
