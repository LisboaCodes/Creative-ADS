import { PlatformType } from '@prisma/client';

export interface PlatformConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export interface OAuthTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
}

export interface CampaignData {
  externalId: string;
  name: string;
  status: 'ACTIVE' | 'PAUSED' | 'ARCHIVED';
  dailyBudget?: number;
  lifetimeBudget?: number;
  currency: string;
  startDate?: Date;
  endDate?: Date;
}

export interface MetricData {
  date: Date;
  impressions: bigint;
  reach: bigint;
  clicks: bigint;
  spend: number;
  conversions: number;
  revenue?: number;
  metadata?: any;
}

/**
 * Base interface for all platform integrations
 */
export interface IPlatformService {
  platformType: PlatformType;

  /**
   * Get OAuth authorization URL
   */
  getAuthUrl(state: string): string;

  /**
   * Exchange authorization code for tokens
   */
  exchangeCodeForTokens(code: string): Promise<OAuthTokens & { externalId: string }>;

  /**
   * Refresh access token
   */
  refreshAccessToken(refreshToken: string): Promise<OAuthTokens>;

  /**
   * Get campaigns from platform
   */
  getCampaigns(accessToken: string, externalId: string): Promise<CampaignData[]>;

  /**
   * Get metrics for a campaign
   */
  getMetrics(
    accessToken: string,
    campaignExternalId: string,
    startDate: Date,
    endDate: Date
  ): Promise<MetricData[]>;

  /**
   * Update campaign status (pause/activate)
   */
  updateCampaignStatus(
    accessToken: string,
    campaignExternalId: string,
    status: 'ACTIVE' | 'PAUSED'
  ): Promise<void>;

  /**
   * Update campaign budget
   */
  updateCampaignBudget(
    accessToken: string,
    campaignExternalId: string,
    budget: { daily?: number; lifetime?: number }
  ): Promise<void>;
}

/**
 * Abstract base class for platform services
 */
export abstract class BasePlatformService implements IPlatformService {
  abstract platformType: PlatformType;
  abstract getAuthUrl(state: string): string;
  abstract exchangeCodeForTokens(code: string): Promise<OAuthTokens & { externalId: string }>;
  abstract refreshAccessToken(refreshToken: string): Promise<OAuthTokens>;
  abstract getCampaigns(accessToken: string, externalId: string): Promise<CampaignData[]>;
  abstract getMetrics(
    accessToken: string,
    campaignExternalId: string,
    startDate: Date,
    endDate: Date
  ): Promise<MetricData[]>;
  abstract updateCampaignStatus(
    accessToken: string,
    campaignExternalId: string,
    status: 'ACTIVE' | 'PAUSED'
  ): Promise<void>;
  abstract updateCampaignBudget(
    accessToken: string,
    campaignExternalId: string,
    budget: { daily?: number; lifetime?: number }
  ): Promise<void>;

  /**
   * Calculate derived metrics
   */
  protected calculateMetrics(data: {
    impressions: number;
    clicks: number;
    spend: number;
    conversions: number;
    revenue?: number;
  }) {
    const ctr = data.impressions > 0 ? (data.clicks / data.impressions) * 100 : 0;
    const cpc = data.clicks > 0 ? data.spend / data.clicks : 0;
    const cpm = data.impressions > 0 ? (data.spend / data.impressions) * 1000 : 0;
    const conversionRate = data.clicks > 0 ? (data.conversions / data.clicks) * 100 : 0;
    const roas = data.spend > 0 && data.revenue ? data.revenue / data.spend : 0;

    return {
      ctr: Number(ctr.toFixed(2)),
      cpc: Number(cpc.toFixed(2)),
      cpm: Number(cpm.toFixed(2)),
      conversionRate: Number(conversionRate.toFixed(2)),
      roas: Number(roas.toFixed(2)),
    };
  }
}
