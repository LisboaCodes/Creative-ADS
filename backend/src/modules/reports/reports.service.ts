import { prisma } from '../../config/database';
import { logger } from '../../utils/logger';
import { buildReportHtml } from './templates/report';
import type { GenerateReportInput } from './reports.schemas';

export class ReportsService {
  /**
   * Generate a report
   */
  async generateReport(userId: string, input: GenerateReportInput) {
    // Create report record
    const report = await prisma.report.create({
      data: {
        userId,
        title: input.title,
        template: input.template,
        config: {
          platformId: input.platformId || null,
          startDate: input.startDate.toISOString(),
          endDate: input.endDate.toISOString(),
        },
        status: 'GENERATING',
      },
    });

    try {
      // Build report data
      const data = await this.buildReportData(userId, input);

      // Generate HTML
      const html = buildReportHtml(data);

      // Update report
      const updated = await prisma.report.update({
        where: { id: report.id },
        data: {
          status: 'COMPLETED',
          fileUrl: `/api/reports/${report.id}/html`,
          fileFormat: 'html',
          generatedAt: new Date(),
        },
      });

      return { report: updated, html };
    } catch (error: any) {
      logger.error(`Report generation failed: ${error.message}`);
      await prisma.report.update({
        where: { id: report.id },
        data: {
          status: 'FAILED',
          error: error.message,
        },
      });
      throw error;
    }
  }

  /**
   * Get all reports for a user
   */
  async getReports(userId: string) {
    return prisma.report.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  /**
   * Get a specific report
   */
  async getReportById(reportId: string, userId: string) {
    const report = await prisma.report.findFirst({
      where: { id: reportId, userId },
    });
    if (!report) throw new Error('Relatorio nao encontrado');
    return report;
  }

  /**
   * Delete a report
   */
  async deleteReport(reportId: string, userId: string) {
    const report = await prisma.report.findFirst({
      where: { id: reportId, userId },
    });
    if (!report) throw new Error('Relatorio nao encontrado');

    await prisma.report.delete({ where: { id: reportId } });
    return { deleted: true };
  }

  /**
   * Get report HTML
   */
  async getReportHtml(reportId: string, userId: string) {
    const report = await this.getReportById(reportId, userId);
    const config = report.config as any;

    const input: GenerateReportInput = {
      title: report.title,
      template: report.template as any,
      platformId: config.platformId || undefined,
      startDate: new Date(config.startDate),
      endDate: new Date(config.endDate),
    };

    const data = await this.buildReportData(userId, input);
    return buildReportHtml(data);
  }

  /**
   * Build report data from database
   */
  private async buildReportData(userId: string, input: GenerateReportInput) {
    const where: any = {
      platform: { userId, isConnected: true },
    };
    if (input.platformId) {
      where.platformId = input.platformId;
    }

    // Get campaigns with metrics
    const campaigns = await prisma.campaign.findMany({
      where,
      include: {
        metrics: {
          where: {
            date: { gte: input.startDate, lte: input.endDate },
          },
        },
        platform: { select: { name: true, type: true } },
      },
    });

    // Aggregate per campaign
    const campaignsData = campaigns.map((c) => {
      const totalSpend = c.metrics.reduce((s, m) => s + m.spend, 0);
      const totalClicks = c.metrics.reduce((s, m) => s + Number(m.clicks), 0);
      const totalImpressions = c.metrics.reduce((s, m) => s + Number(m.impressions), 0);
      const totalConversions = c.metrics.reduce((s, m) => s + m.conversions, 0);
      const totalRevenue = c.metrics.reduce((s, m) => s + m.revenue, 0);

      return {
        name: c.name,
        status: c.status,
        platformType: c.platformType,
        spend: Math.round(totalSpend * 100) / 100,
        clicks: totalClicks,
        impressions: totalImpressions,
        conversions: totalConversions,
        revenue: Math.round(totalRevenue * 100) / 100,
        ctr: totalImpressions > 0 ? Math.round((totalClicks / totalImpressions) * 10000) / 100 : 0,
        roas: totalSpend > 0 ? Math.round((totalRevenue / totalSpend) * 100) / 100 : 0,
      };
    }).filter((c) => c.spend > 0).sort((a, b) => b.spend - a.spend);

    // Overall aggregation
    const overallSpend = campaignsData.reduce((s, c) => s + c.spend, 0);
    const overallClicks = campaignsData.reduce((s, c) => s + c.clicks, 0);
    const overallImpressions = campaignsData.reduce((s, c) => s + c.impressions, 0);
    const overallConversions = campaignsData.reduce((s, c) => s + c.conversions, 0);
    const overallRevenue = campaignsData.reduce((s, c) => s + c.revenue, 0);

    // Platform name
    let platformName: string | undefined;
    if (input.platformId) {
      const platform = await prisma.platform.findUnique({ where: { id: input.platformId } });
      platformName = platform?.name;
    }

    // Financial periods for financial template
    let financialPeriods: any[] | undefined;
    if (input.template === 'financial' || input.template === 'detailed') {
      const allMetrics = campaigns.flatMap((c) => c.metrics);
      const monthMap = new Map<string, { spend: number; revenue: number }>();

      for (const m of allMetrics) {
        const key = `${m.date.getFullYear()}-${String(m.date.getMonth() + 1).padStart(2, '0')}`;
        const existing = monthMap.get(key) || { spend: 0, revenue: 0 };
        existing.spend += m.spend;
        existing.revenue += m.revenue;
        monthMap.set(key, existing);
      }

      financialPeriods = Array.from(monthMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([period, data]) => ({
          period,
          spend: Math.round(data.spend * 100) / 100,
          revenue: Math.round(data.revenue * 100) / 100,
          roas: data.spend > 0 ? Math.round((data.revenue / data.spend) * 100) / 100 : 0,
        }));
    }

    return {
      title: input.title,
      template: input.template,
      platformName,
      period: {
        start: input.startDate.toLocaleDateString('pt-BR'),
        end: input.endDate.toLocaleDateString('pt-BR'),
      },
      overview: {
        spend: Math.round(overallSpend * 100) / 100,
        impressions: overallImpressions,
        clicks: overallClicks,
        conversions: overallConversions,
        revenue: Math.round(overallRevenue * 100) / 100,
        ctr: overallImpressions > 0 ? Math.round((overallClicks / overallImpressions) * 10000) / 100 : 0,
        cpc: overallClicks > 0 ? Math.round((overallSpend / overallClicks) * 100) / 100 : 0,
        roas: overallSpend > 0 ? Math.round((overallRevenue / overallSpend) * 100) / 100 : 0,
      },
      campaigns: campaignsData,
      financialPeriods,
      generatedAt: new Date().toLocaleString('pt-BR'),
    };
  }

  /**
   * Generate CSV for a report
   */
  async generateCsv(reportId: string, userId: string): Promise<string> {
    const report = await this.getReportById(reportId, userId);
    const config = report.config as any;

    const input: GenerateReportInput = {
      title: report.title,
      template: report.template as any,
      platformId: config.platformId || undefined,
      startDate: new Date(config.startDate),
      endDate: new Date(config.endDate),
    };

    const data = await this.buildReportData(userId, input);

    // CSV header
    const headers = ['Campanha', 'Plataforma', 'Status', 'Gasto', 'Cliques', 'Impressões', 'Conversões', 'Receita', 'CTR', 'ROAS'];
    const rows = data.campaigns.map((c: any) => [
      `"${c.name.replace(/"/g, '""')}"`,
      c.platformType,
      c.status,
      c.spend.toFixed(2),
      c.clicks,
      c.impressions,
      c.conversions,
      c.revenue.toFixed(2),
      `${c.ctr}%`,
      `${c.roas}x`,
    ].join(','));

    // Add totals row
    rows.push([
      '"TOTAL"', '', '',
      data.overview.spend.toFixed(2),
      data.overview.clicks,
      data.overview.impressions,
      data.overview.conversions,
      data.overview.revenue.toFixed(2),
      `${data.overview.ctr}%`,
      `${data.overview.roas}x`,
    ].join(','));

    return '\uFEFF' + [headers.join(','), ...rows].join('\n');
  }
}

export const reportsService = new ReportsService();
