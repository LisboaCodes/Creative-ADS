import { prisma } from '../../config/database';
import { cache } from '../../config/redis';
import { env } from '../../config/env';
import { MetricsCalculator } from './metrics.calculator';
import { PlatformType } from '@prisma/client';

export class MetricsService {
  /**
   * Get overview metrics for a user
   */
  async getOverviewMetrics(
    userId: string,
    filters: {
      startDate: Date;
      endDate: Date;
      platformTypes?: PlatformType[];
    }
  ) {
    const cacheKey = `metrics:overview:${userId}:${filters.startDate.toISOString()}:${filters.endDate.toISOString()}:${filters.platformTypes?.join(',')}`;

    // Check cache
    const cached = await cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    // Build where clause
    const where: any = {
      campaign: {
        platform: {
          userId,
          isConnected: true,
        },
      },
      date: {
        gte: filters.startDate,
        lte: filters.endDate,
      },
    };

    if (filters.platformTypes && filters.platformTypes.length > 0) {
      where.campaign = {
        ...where.campaign,
        platformType: {
          in: filters.platformTypes,
        },
      };
    }

    // Get metrics
    const metrics = await prisma.metric.findMany({
      where,
      select: {
        impressions: true,
        reach: true,
        clicks: true,
        spend: true,
        conversions: true,
        revenue: true,
      },
    });

    // Aggregate
    const overview = MetricsCalculator.aggregate(metrics);

    // Cache for 5 minutes
    await cache.set(cacheKey, overview, env.CACHE_METRICS_TTL);

    return overview;
  }

  /**
   * Get metrics for a specific campaign
   */
  async getCampaignMetrics(
    campaignId: string,
    userId: string,
    filters: {
      startDate: Date;
      endDate: Date;
    }
  ) {
    // Verify campaign belongs to user
    const campaign = await prisma.campaign.findFirst({
      where: {
        id: campaignId,
        platform: {
          userId,
        },
      },
    });

    if (!campaign) {
      throw new Error('Campaign not found');
    }

    // Get metrics
    const metrics = await prisma.metric.findMany({
      where: {
        campaignId,
        date: {
          gte: filters.startDate,
          lte: filters.endDate,
        },
      },
      orderBy: {
        date: 'asc',
      },
    });

    // Convert bigint to number for JSON serialization
    const serializedMetrics = metrics.map((m) => ({
      ...m,
      impressions: Number(m.impressions),
      reach: Number(m.reach),
      clicks: Number(m.clicks),
    }));

    // Calculate totals
    const totals = MetricsCalculator.aggregate(metrics);

    return {
      metrics: serializedMetrics,
      totals,
    };
  }

  /**
   * Get metrics by platform
   */
  async getMetricsByPlatform(
    userId: string,
    filters: {
      startDate: Date;
      endDate: Date;
    }
  ) {
    const platforms = await prisma.platform.findMany({
      where: {
        userId,
        isConnected: true,
      },
      include: {
        campaigns: {
          include: {
            metrics: {
              where: {
                date: {
                  gte: filters.startDate,
                  lte: filters.endDate,
                },
              },
            },
          },
        },
      },
    });

    const platformMetrics = platforms.map((platform) => {
      const allMetrics = platform.campaigns.flatMap((c) => c.metrics);
      const aggregated = MetricsCalculator.aggregate(allMetrics);

      return {
        platformType: platform.type,
        platformName: platform.name,
        ...aggregated,
      };
    });

    return platformMetrics;
  }

  /**
   * Get time series metrics
   */
  async getTimeSeriesMetrics(
    userId: string,
    filters: {
      startDate: Date;
      endDate: Date;
      platformTypes?: PlatformType[];
      groupBy: 'day' | 'week' | 'month';
    }
  ) {
    const where: any = {
      campaign: {
        platform: {
          userId,
          isConnected: true,
        },
      },
      date: {
        gte: filters.startDate,
        lte: filters.endDate,
      },
    };

    if (filters.platformTypes && filters.platformTypes.length > 0) {
      where.campaign = {
        ...where.campaign,
        platformType: {
          in: filters.platformTypes,
        },
      };
    }

    const metrics = await prisma.metric.findMany({
      where,
      orderBy: {
        date: 'asc',
      },
    });

    // Group by date
    const grouped = new Map<string, typeof metrics>();

    metrics.forEach((metric) => {
      const dateKey = metric.date.toISOString().split('T')[0];
      if (!grouped.has(dateKey)) {
        grouped.set(dateKey, []);
      }
      grouped.get(dateKey)!.push(metric);
    });

    // Aggregate each group
    const timeSeries = Array.from(grouped.entries()).map(([date, metrics]) => ({
      date,
      ...MetricsCalculator.aggregate(metrics),
    }));

    return timeSeries;
  }
}

export const metricsService = new MetricsService();
