export class MetricsCalculator {
  /**
   * Calculate CTR (Click-Through Rate)
   */
  static calculateCTR(clicks: number, impressions: number): number {
    if (impressions === 0) return 0;
    return Number(((clicks / impressions) * 100).toFixed(2));
  }

  /**
   * Calculate CPC (Cost Per Click)
   */
  static calculateCPC(spend: number, clicks: number): number {
    if (clicks === 0) return 0;
    return Number((spend / clicks).toFixed(2));
  }

  /**
   * Calculate CPM (Cost Per Mille - 1000 impressions)
   */
  static calculateCPM(spend: number, impressions: number): number {
    if (impressions === 0) return 0;
    return Number(((spend / impressions) * 1000).toFixed(2));
  }

  /**
   * Calculate Conversion Rate
   */
  static calculateConversionRate(conversions: number, clicks: number): number {
    if (clicks === 0) return 0;
    return Number(((conversions / clicks) * 100).toFixed(2));
  }

  /**
   * Calculate ROAS (Return on Ad Spend)
   */
  static calculateROAS(revenue: number, spend: number): number {
    if (spend === 0) return 0;
    return Number((revenue / spend).toFixed(2));
  }

  /**
   * Calculate all metrics at once
   */
  static calculateAll(data: {
    impressions: number;
    clicks: number;
    spend: number;
    conversions: number;
    revenue: number;
  }) {
    return {
      ctr: this.calculateCTR(data.clicks, data.impressions),
      cpc: this.calculateCPC(data.spend, data.clicks),
      cpm: this.calculateCPM(data.spend, data.impressions),
      conversionRate: this.calculateConversionRate(data.conversions, data.clicks),
      roas: this.calculateROAS(data.revenue, data.spend),
    };
  }

  /**
   * Aggregate metrics from multiple sources
   */
  static aggregate(metrics: Array<{
    impressions: bigint;
    reach: bigint;
    clicks: bigint;
    spend: number;
    conversions: number;
    revenue: number;
  }>) {
    const totals = metrics.reduce(
      (acc, metric) => ({
        impressions: acc.impressions + Number(metric.impressions),
        reach: acc.reach + Number(metric.reach),
        clicks: acc.clicks + Number(metric.clicks),
        spend: acc.spend + metric.spend,
        conversions: acc.conversions + metric.conversions,
        revenue: acc.revenue + metric.revenue,
      }),
      {
        impressions: 0,
        reach: 0,
        clicks: 0,
        spend: 0,
        conversions: 0,
        revenue: 0,
      }
    );

    return {
      ...totals,
      ...this.calculateAll(totals),
    };
  }
}
