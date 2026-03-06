import { prisma } from '../../config/database';
import { cache } from '../../config/redis';
import { NotFoundError } from '../../utils/errors';

export class CampaignLibraryService {
  /**
   * List/filter campaign templates
   */
  async getTemplates(filters: {
    niche?: string;
    platform?: string;
    objective?: string;
    category?: string;
    difficulty?: string;
    search?: string;
    year?: number;
    page?: number;
    limit?: number;
  }) {
    const { niche, platform, objective, category, difficulty, search, year, page = 1, limit = 20 } = filters;

    // Cache for 5 minutes
    const cacheKey = `campaign-library:${JSON.stringify(filters)}`;
    const cached = await cache.get(cacheKey);
    if (cached) return cached;

    const where: any = {};

    if (niche) where.niche = niche;
    if (platform) where.platform = platform;
    if (objective) where.objective = objective;
    if (category) where.category = category;
    if (difficulty) where.difficulty = difficulty;
    if (year) where.year = year;

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { strategy: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [templates, total] = await Promise.all([
      prisma.campaignTemplate.findMany({
        where,
        select: {
          id: true,
          name: true,
          niche: true,
          platform: true,
          objective: true,
          category: true,
          description: true,
          difficulty: true,
          rating: true,
          year: true,
          verified: true,
          thumbnailUrl: true,
          benchmarks: true,
        },
        orderBy: [{ rating: 'desc' }, { year: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.campaignTemplate.count({ where }),
    ]);

    // Get available filter options
    const [niches, platforms, objectives, categories] = await Promise.all([
      prisma.campaignTemplate.findMany({ distinct: ['niche'], select: { niche: true } }),
      prisma.campaignTemplate.findMany({ distinct: ['platform'], select: { platform: true } }),
      prisma.campaignTemplate.findMany({ distinct: ['objective'], select: { objective: true } }),
      prisma.campaignTemplate.findMany({ distinct: ['category'], select: { category: true } }),
    ]);

    const result = {
      templates,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      filters: {
        niches: niches.map((n: any) => n.niche),
        platforms: platforms.map((p: any) => p.platform),
        objectives: objectives.map((o: any) => o.objective),
        categories: categories.map((c: any) => c.category),
      },
    };

    await cache.set(cacheKey, result, 300);

    return result;
  }

  /**
   * Get a single template with full details
   */
  async getTemplateById(id: string) {
    const cacheKey = `campaign-library:detail:${id}`;
    const cached = await cache.get(cacheKey);
    if (cached) return cached;

    const template = await prisma.campaignTemplate.findUnique({
      where: { id },
    });

    if (!template) {
      throw new NotFoundError('Template não encontrado');
    }

    await cache.set(cacheKey, template, 300);

    return template;
  }

  /**
   * Get templates grouped by niche for overview
   */
  async getOverview() {
    const cacheKey = 'campaign-library:overview';
    const cached = await cache.get(cacheKey);
    if (cached) return cached;

    const templates = await prisma.campaignTemplate.findMany({
      select: {
        id: true,
        name: true,
        niche: true,
        platform: true,
        objective: true,
        category: true,
        rating: true,
        difficulty: true,
        year: true,
      },
      orderBy: { rating: 'desc' },
    });

    // Group by niche
    const byNiche: Record<string, typeof templates> = {};
    for (const t of templates) {
      if (!byNiche[t.niche]) byNiche[t.niche] = [];
      byNiche[t.niche].push(t);
    }

    // Stats
    const stats = {
      total: templates.length,
      byPlatform: {} as Record<string, number>,
      byObjective: {} as Record<string, number>,
      byNiche: {} as Record<string, number>,
    };
    for (const t of templates) {
      stats.byPlatform[t.platform] = (stats.byPlatform[t.platform] || 0) + 1;
      stats.byObjective[t.objective] = (stats.byObjective[t.objective] || 0) + 1;
      stats.byNiche[t.niche] = (stats.byNiche[t.niche] || 0) + 1;
    }

    const result = { byNiche, stats };
    await cache.set(cacheKey, result, 300);
    return result;
  }
}

export const campaignLibraryService = new CampaignLibraryService();
