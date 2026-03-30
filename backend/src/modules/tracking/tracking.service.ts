import crypto from 'crypto';
import { prisma } from '../../config/database';
import { cache } from '../../config/redis';
import { processClickQueue } from '../../config/queue';
import { NotFoundError } from '../../utils/errors';
import type {
  CreateTrackingLinkInput,
  UpdateTrackingLinkInput,
  CreateLeadInput,
  UpdateLeadInput,
  WebhookLeadInput,
  DashboardQueryInput,
} from './tracking.schemas';
import { LeadSource, Prisma } from '@prisma/client';

function generateShortCode(length = 7): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const bytes = crypto.randomBytes(length);
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars[bytes[i] % chars.length];
  }
  return result;
}

function hashFingerprint(ip: string, userAgent: string): string {
  return crypto.createHash('sha256').update(`${ip}:${userAgent}`).digest('hex').substring(0, 16);
}

const VALID_SOURCES: LeadSource[] = [
  'FACEBOOK', 'GOOGLE', 'INSTAGRAM', 'TIKTOK', 'LINKEDIN',
  'ORGANIC', 'DIRECT', 'WHATSAPP', 'REFERRAL', 'OTHER',
];

export class TrackingService {
  // ─── Tracking Links ─────────────

  async getLinks(userId: string) {
    return prisma.trackingLink.findMany({
      where: { userId },
      include: {
        campaign: { select: { id: true, name: true } },
        platform: { select: { id: true, name: true, type: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getLinkById(id: string, userId: string) {
    const link = await prisma.trackingLink.findFirst({
      where: { id, userId },
      include: {
        campaign: { select: { id: true, name: true } },
        platform: { select: { id: true, name: true, type: true } },
        _count: { select: { clicks: true, leads: true } },
      },
    });
    if (!link) throw new NotFoundError('Link de rastreamento não encontrado');
    return link;
  }

  async createLink(userId: string, input: CreateTrackingLinkInput) {
    let shortCode = generateShortCode();
    // Ensure uniqueness
    let exists = await prisma.trackingLink.findUnique({ where: { shortCode } });
    while (exists) {
      shortCode = generateShortCode();
      exists = await prisma.trackingLink.findUnique({ where: { shortCode } });
    }

    return prisma.trackingLink.create({
      data: {
        shortCode,
        name: input.name,
        destinationUrl: input.destinationUrl,
        utmSource: input.utmSource,
        utmMedium: input.utmMedium,
        utmCampaign: input.utmCampaign,
        utmContent: input.utmContent,
        utmTerm: input.utmTerm,
        customParams: input.customParams || undefined,
        campaignId: input.campaignId || null,
        platformId: input.platformId || null,
        userId,
      },
    });
  }

  async updateLink(id: string, userId: string, input: UpdateTrackingLinkInput) {
    const existing = await prisma.trackingLink.findFirst({ where: { id, userId } });
    if (!existing) throw new NotFoundError('Link de rastreamento não encontrado');

    const updated = await prisma.trackingLink.update({
      where: { id },
      data: input,
    });

    // Invalidate cached link
    await cache.del(`tracking:link:${existing.shortCode}`);

    return updated;
  }

  async deleteLink(id: string, userId: string) {
    const existing = await prisma.trackingLink.findFirst({ where: { id, userId } });
    if (!existing) throw new NotFoundError('Link de rastreamento não encontrado');

    await prisma.trackingLink.delete({ where: { id } });
    await cache.del(`tracking:link:${existing.shortCode}`);
    return { deleted: true };
  }

  // ─── Click Tracking ─────────────

  async recordClick(shortCode: string, ip: string, userAgent: string, referer: string | undefined) {
    // Check cache first
    let link = await cache.get<{ id: string; destinationUrl: string; isActive: boolean }>(`tracking:link:${shortCode}`);

    if (!link) {
      const dbLink = await prisma.trackingLink.findUnique({
        where: { shortCode },
        select: { id: true, destinationUrl: true, isActive: true },
      });
      if (!dbLink) return null;
      link = dbLink;
      await cache.set(`tracking:link:${shortCode}`, link, 300);
    }

    if (!link.isActive) return null;

    // Enqueue click processing asynchronously
    await processClickQueue.add('process-click', {
      trackingLinkId: link.id,
      shortCode,
      ip,
      userAgent,
      referer,
      timestamp: new Date().toISOString(),
    });

    return link.destinationUrl;
  }

  // ─── Leads ─────────────

  async getLeads(userId: string, filters: DashboardQueryInput & { search?: string }) {
    const where: Prisma.LeadWhereInput = { userId };

    if (filters.source) where.source = filters.source as LeadSource;
    if (filters.status) where.status = filters.status as any;
    if (filters.campaignId) where.campaignId = filters.campaignId;

    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) where.createdAt.gte = new Date(filters.startDate);
      if (filters.endDate) where.createdAt.lte = new Date(filters.endDate);
    }

    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { email: { contains: filters.search, mode: 'insensitive' } },
        { phone: { contains: filters.search } },
      ];
    }

    return prisma.lead.findMany({
      where,
      include: {
        campaign: { select: { id: true, name: true } },
        trackingLink: { select: { id: true, name: true, shortCode: true } },
        client: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getLeadById(id: string, userId: string) {
    const lead = await prisma.lead.findFirst({
      where: { id, userId },
      include: {
        campaign: { select: { id: true, name: true } },
        trackingLink: { select: { id: true, name: true, shortCode: true } },
        platform: { select: { id: true, name: true, type: true } },
        client: { select: { id: true, name: true } },
      },
    });
    if (!lead) throw new NotFoundError('Lead não encontrado');
    return lead;
  }

  async createLead(userId: string, input: CreateLeadInput) {
    return prisma.lead.create({
      data: {
        ...input,
        email: input.email || null,
        userId,
      },
    });
  }

  async updateLead(id: string, userId: string, input: UpdateLeadInput) {
    const existing = await prisma.lead.findFirst({ where: { id, userId } });
    if (!existing) throw new NotFoundError('Lead não encontrado');

    const updated = await prisma.lead.update({
      where: { id },
      data: input,
    });

    await cache.delPattern(`tracking:dash:${userId}:*`);
    return updated;
  }

  async deleteLead(id: string, userId: string) {
    const existing = await prisma.lead.findFirst({ where: { id, userId } });
    if (!existing) throw new NotFoundError('Lead não encontrado');

    await prisma.lead.delete({ where: { id } });
    await cache.delPattern(`tracking:dash:${userId}:*`);
    return { deleted: true };
  }

  // ─── Webhook Capture ─────────────

  async captureFromWebhook(userId: string, input: WebhookLeadInput) {
    // Map source string to enum
    const sourceMap: Record<string, LeadSource> = {
      facebook: 'FACEBOOK', google: 'GOOGLE', instagram: 'INSTAGRAM',
      tiktok: 'TIKTOK', linkedin: 'LINKEDIN', organic: 'ORGANIC',
      direct: 'DIRECT', whatsapp: 'WHATSAPP', referral: 'REFERRAL',
    };

    const source = input.source
      ? (sourceMap[input.source.toLowerCase()] || (VALID_SOURCES.includes(input.source.toUpperCase() as LeadSource) ? input.source.toUpperCase() as LeadSource : 'OTHER'))
      : 'OTHER';

    // Try to auto-match a TrackingLink by UTM params
    let trackingLinkId: string | null = null;
    if (input.utmSource && input.utmCampaign) {
      const matchedLink = await prisma.trackingLink.findFirst({
        where: {
          userId,
          utmSource: input.utmSource,
          utmCampaign: input.utmCampaign,
        },
        select: { id: true, campaignId: true, platformId: true },
      });
      if (matchedLink) {
        trackingLinkId = matchedLink.id;
      }
    }

    const lead = await prisma.lead.create({
      data: {
        name: input.name,
        phone: input.phone,
        email: input.email || null,
        source,
        value: input.value,
        utmSource: input.utmSource,
        utmMedium: input.utmMedium,
        utmCampaign: input.utmCampaign,
        utmContent: input.utmContent,
        utmTerm: input.utmTerm,
        metadata: input.metadata || undefined,
        trackingLinkId,
        userId,
      },
    });

    await cache.delPattern(`tracking:dash:${userId}:*`);
    return lead;
  }

  // ─── Dashboard ─────────────

  async getDashboardStats(userId: string, filters: DashboardQueryInput) {
    const cacheKey = `tracking:dash:${userId}:${JSON.stringify(filters)}`;
    const cached = await cache.get<any>(cacheKey);
    if (cached) return cached;

    const where: Prisma.LeadWhereInput = { userId };
    if (filters.source) where.source = filters.source as LeadSource;
    if (filters.status) where.status = filters.status as any;
    if (filters.campaignId) where.campaignId = filters.campaignId;
    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) where.createdAt.gte = new Date(filters.startDate);
      if (filters.endDate) where.createdAt.lte = new Date(filters.endDate);
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [totalLeads, leadsToday, soldLeads, totalValue] = await Promise.all([
      prisma.lead.count({ where }),
      prisma.lead.count({ where: { ...where, createdAt: { gte: todayStart } } }),
      prisma.lead.count({ where: { ...where, status: 'SOLD' } }),
      prisma.lead.aggregate({ where, _sum: { value: true } }),
    ]);

    const conversionRate = totalLeads > 0 ? ((soldLeads / totalLeads) * 100) : 0;

    const stats = {
      totalLeads,
      leadsToday,
      conversionRate: Math.round(conversionRate * 100) / 100,
      totalValue: totalValue._sum.value || 0,
    };

    await cache.set(cacheKey, stats, 60);
    return stats;
  }

  async getLeadsOverTime(userId: string, filters: DashboardQueryInput) {
    const where: Prisma.LeadWhereInput = { userId };
    if (filters.source) where.source = filters.source as LeadSource;
    if (filters.campaignId) where.campaignId = filters.campaignId;
    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) where.createdAt.gte = new Date(filters.startDate);
      if (filters.endDate) where.createdAt.lte = new Date(filters.endDate);
    }

    const leads = await prisma.lead.findMany({
      where,
      select: { createdAt: true },
      orderBy: { createdAt: 'asc' },
    });

    // Group by date
    const grouped: Record<string, number> = {};
    for (const lead of leads) {
      const date = lead.createdAt.toISOString().split('T')[0];
      grouped[date] = (grouped[date] || 0) + 1;
    }

    return Object.entries(grouped).map(([date, count]) => ({ date, count }));
  }

  async getLeadsBySource(userId: string, filters: DashboardQueryInput) {
    const where: Prisma.LeadWhereInput = { userId };
    if (filters.campaignId) where.campaignId = filters.campaignId;
    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) where.createdAt.gte = new Date(filters.startDate);
      if (filters.endDate) where.createdAt.lte = new Date(filters.endDate);
    }

    const result = await prisma.lead.groupBy({
      by: ['source'],
      where,
      _count: { _all: true },
    });

    return result.map((r) => ({ source: r.source, count: r._count._all }));
  }

  // ─── API Key ─────────────

  async getApiKey(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { trackingApiKey: true },
    });
    return user?.trackingApiKey || null;
  }

  async regenerateApiKey(userId: string) {
    const apiKey = `tk_${crypto.randomBytes(24).toString('hex')}`;
    await prisma.user.update({
      where: { id: userId },
      data: { trackingApiKey: apiKey },
    });
    return apiKey;
  }
}

export const trackingService = new TrackingService();
