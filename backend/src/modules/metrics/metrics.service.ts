import { prisma } from '../../config/database';
import { cache } from '../../config/redis';
import { env } from '../../config/env';
import { MetricsCalculator } from './metrics.calculator';
import { NotFoundError } from '../../utils/errors';
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
      platformId?: string;
    }
  ) {
    const cacheKey = `metrics:overview:${userId}:${filters.startDate.toISOString()}:${filters.endDate.toISOString()}:${filters.platformTypes?.join(',')}:${filters.platformId || ''}`;

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

    if (filters.platformId) {
      where.campaign.platformId = filters.platformId;
    }

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
      throw new NotFoundError('Campanha não encontrada');
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

    // Calculate totals
    const totals = MetricsCalculator.aggregate(metrics);

    return {
      metrics,
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
      platformId?: string;
    }
  ) {
    const platformWhere: any = {
      userId,
      isConnected: true,
    };
    if (filters.platformId) {
      platformWhere.id = filters.platformId;
    }

    const platforms = await prisma.platform.findMany({
      where: platformWhere,
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
      platformId?: string;
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

    if (filters.platformId) {
      where.campaign.platformId = filters.platformId;
    }

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
  /**
   * Get financial breakdown grouped by period
   */
  async getFinancialBreakdown(
    userId: string,
    filters: {
      startDate: Date;
      endDate: Date;
      platformId?: string;
      groupBy: 'week' | 'biweekly' | 'monthly';
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

    if (filters.platformId) {
      where.campaign.platformId = filters.platformId;
    }

    const metrics = await prisma.metric.findMany({
      where,
      include: {
        campaign: {
          select: { id: true, name: true, platformType: true },
        },
      },
      orderBy: { date: 'asc' },
    });

    // Group metrics by period
    const periods = new Map<string, {
      period: string;
      startDate: string;
      endDate: string;
      spend: number;
      clicks: number;
      impressions: number;
      conversions: number;
      revenue: number;
      campaignIds: Set<string>;
    }>();

    for (const metric of metrics) {
      const periodKey = this.getPeriodKey(metric.date, filters.groupBy);
      const periodRange = this.getPeriodRange(metric.date, filters.groupBy);

      if (!periods.has(periodKey)) {
        periods.set(periodKey, {
          period: periodKey,
          startDate: periodRange.start.toISOString(),
          endDate: periodRange.end.toISOString(),
          spend: 0,
          clicks: 0,
          impressions: 0,
          conversions: 0,
          revenue: 0,
          campaignIds: new Set(),
        });
      }

      const p = periods.get(periodKey)!;
      p.spend += metric.spend;
      p.clicks += Number(metric.clicks);
      p.impressions += Number(metric.impressions);
      p.conversions += metric.conversions;
      p.revenue += metric.revenue;
      p.campaignIds.add(metric.campaignId);
    }

    // Convert to array and compute derived metrics
    const result = Array.from(periods.values())
      .map((p) => ({
        period: p.period,
        startDate: p.startDate,
        endDate: p.endDate,
        spend: Math.round(p.spend * 100) / 100,
        clicks: p.clicks,
        impressions: p.impressions,
        conversions: p.conversions,
        revenue: Math.round(p.revenue * 100) / 100,
        roas: p.spend > 0 ? Math.round((p.revenue / p.spend) * 100) / 100 : 0,
        cpc: p.clicks > 0 ? Math.round((p.spend / p.clicks) * 100) / 100 : 0,
        ctr: p.impressions > 0 ? Math.round((p.clicks / p.impressions) * 10000) / 100 : 0,
        costPerConversion: p.conversions > 0 ? Math.round((p.spend / p.conversions) * 100) / 100 : 0,
        campaignCount: p.campaignIds.size,
      }))
      .sort((a, b) => a.startDate.localeCompare(b.startDate));

    // Compute totals
    const totals = result.reduce(
      (acc, p) => ({
        spend: acc.spend + p.spend,
        clicks: acc.clicks + p.clicks,
        impressions: acc.impressions + p.impressions,
        conversions: acc.conversions + p.conversions,
        revenue: acc.revenue + p.revenue,
      }),
      { spend: 0, clicks: 0, impressions: 0, conversions: 0, revenue: 0 }
    );

    return {
      periods: result,
      totals: {
        ...totals,
        spend: Math.round(totals.spend * 100) / 100,
        revenue: Math.round(totals.revenue * 100) / 100,
        roas: totals.spend > 0 ? Math.round((totals.revenue / totals.spend) * 100) / 100 : 0,
        cpc: totals.clicks > 0 ? Math.round((totals.spend / totals.clicks) * 100) / 100 : 0,
        costPerConversion: totals.conversions > 0 ? Math.round((totals.spend / totals.conversions) * 100) / 100 : 0,
      },
    };
  }

  private getPeriodKey(date: Date, groupBy: 'week' | 'biweekly' | 'monthly'): string {
    const d = new Date(date);
    if (groupBy === 'monthly') {
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    }
    // week or biweekly: get Monday of the week
    const day = d.getDay();
    const monday = new Date(d);
    monday.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
    if (groupBy === 'biweekly') {
      // Group into 2-week periods based on ISO week number
      const weekNum = this.getISOWeek(monday);
      const biweekNum = Math.ceil(weekNum / 2);
      return `${monday.getFullYear()}-BW${String(biweekNum).padStart(2, '0')}`;
    }
    return `${monday.getFullYear()}-W${String(this.getISOWeek(monday)).padStart(2, '0')}`;
  }

  private getPeriodRange(date: Date, groupBy: 'week' | 'biweekly' | 'monthly'): { start: Date; end: Date } {
    const d = new Date(date);
    if (groupBy === 'monthly') {
      const start = new Date(d.getFullYear(), d.getMonth(), 1);
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
      return { start, end };
    }
    const day = d.getDay();
    const monday = new Date(d);
    monday.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
    monday.setHours(0, 0, 0, 0);

    if (groupBy === 'biweekly') {
      const weekNum = this.getISOWeek(monday);
      const isOddWeek = weekNum % 2 === 1;
      const start = isOddWeek ? new Date(monday) : new Date(monday.getTime() - 7 * 24 * 60 * 60 * 1000);
      const end = new Date(start.getTime() + 13 * 24 * 60 * 60 * 1000 + 23 * 60 * 60 * 1000 + 59 * 60 * 1000 + 59 * 1000);
      return { start, end };
    }

    const sunday = new Date(monday.getTime() + 6 * 24 * 60 * 60 * 1000);
    sunday.setHours(23, 59, 59, 999);
    return { start: monday, end: sunday };
  }

  private getISOWeek(date: Date): number {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
    const week1 = new Date(d.getFullYear(), 0, 4);
    return 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
  }
}

export const metricsService = new MetricsService();
