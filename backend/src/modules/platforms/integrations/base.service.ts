import { PlatformType } from '@prisma/client';
import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';
import { prisma } from '../../../config/database';
import { logger } from '../../../utils/logger';

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
  status: 'ACTIVE' | 'PAUSED' | 'ARCHIVED' | 'DELETED';
  originalStatus?: string; // Platform-specific status before mapping (e.g. effective_status)
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

export interface AdCreativeData {
  externalId: string;
  name?: string;
  thumbnailUrl?: string;
  imageUrl?: string;
  body?: string;
  title?: string;
}

export interface AdSetData {
  externalId: string;
  name: string;
  status: 'ACTIVE' | 'PAUSED' | 'ARCHIVED' | 'DELETED';
  dailyBudget?: number;
  lifetimeBudget?: number;
  targeting?: any;
  optimizationGoal?: string;
  billingEvent?: string;
  startDate?: Date;
  endDate?: Date;
}

export interface AdData {
  externalId: string;
  name: string;
  status: 'ACTIVE' | 'PAUSED' | 'ARCHIVED' | 'DELETED';
  creativeExternalId?: string;
}

export interface AdAccountData {
  id: string;
  name: string;
}

export interface CreateCampaignInput {
  name: string;
  objective: string;
  status?: string;
  specialAdCategories?: string[];
  dailyBudget?: number;
  lifetimeBudget?: number;
}

export interface CreateAdSetInput {
  name: string;
  campaignId: string;
  targeting: {
    geoLocations?: { countries?: string[]; cities?: Array<{ key: string }> };
    ageMin?: number;
    ageMax?: number;
    genders?: number[];
    interests?: Array<{ id: string; name: string }>;
    customAudiences?: Array<{ id: string }>;
  };
  billingEvent?: string;
  optimizationGoal?: string;
  dailyBudget?: number;
  startTime?: string;
  endTime?: string;
}

export interface CreateAdCreativeInput {
  name: string;
  pageId: string;
  message?: string;
  linkUrl?: string;
  imageHash?: string;
  imageUrl?: string;
  headline?: string;
  description?: string;
  callToAction?: string;
}

export interface CreateAdInput {
  name: string;
  adSetId: string;
  creativeId: string;
  status?: string;
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

  /**
   * Get ad creatives for a campaign
   */
  getAdCreatives(
    accessToken: string,
    campaignExternalId: string
  ): Promise<AdCreativeData[]>;

  /**
   * Create a new campaign on the platform
   */
  createCampaign?(
    accessToken: string,
    accountId: string,
    data: CreateCampaignInput
  ): Promise<{ id: string }>;

  /**
   * Create a new ad set
   */
  createAdSet?(
    accessToken: string,
    data: CreateAdSetInput
  ): Promise<{ id: string }>;

  /**
   * Create ad creative
   */
  createAdCreative?(
    accessToken: string,
    accountId: string,
    data: CreateAdCreativeInput
  ): Promise<{ id: string }>;

  /**
   * Create an ad
   */
  createAd?(
    accessToken: string,
    data: CreateAdInput
  ): Promise<{ id: string }>;

  /**
   * Search targeting options (interests, behaviors)
   */
  getTargetingOptions?(
    accessToken: string,
    query: string
  ): Promise<Array<{ id: string; name: string; type: string; audienceSize?: number }>>;

  /**
   * Get ad sets for a campaign
   */
  getAdSets?(
    accessToken: string,
    campaignExternalId: string
  ): Promise<AdSetData[]>;

  /**
   * Get ads for an ad set
   */
  getAds?(
    accessToken: string,
    adSetExternalId: string
  ): Promise<AdData[]>;
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
  abstract getAdCreatives(
    accessToken: string,
    campaignExternalId: string
  ): Promise<AdCreativeData[]>;

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

/**
 * Wrapper for axios requests that logs to the ApiLog table.
 * Fire-and-forget — does not block the caller.
 */
export async function loggedRequest<T = any>(
  config: AxiosRequestConfig,
  context: {
    userId?: string;
    platformType?: PlatformType;
    platformId?: string;
  } = {}
): Promise<AxiosResponse<T>> {
  const start = Date.now();
  let response: AxiosResponse<T> | undefined;
  let error: any;

  try {
    response = await axios(config);
    return response!;
  } catch (err: any) {
    error = err;
    throw err;
  } finally {
    const duration = Date.now() - start;
    // Truncate bodies to avoid storing huge payloads
    const truncate = (obj: any) => {
      if (!obj) return null;
      const str = typeof obj === 'string' ? obj : JSON.stringify(obj);
      if (str.length > 5000) return str.slice(0, 5000) + '...(truncated)';
      try { return JSON.parse(str); } catch { return str; }
    };

    prisma.apiLog.create({
      data: {
        method: (config.method || 'GET').toUpperCase(),
        url: config.url || '',
        requestBody: truncate(config.data),
        responseStatus: response?.status || error?.response?.status || null,
        responseBody: truncate(response?.data || error?.response?.data),
        duration,
        error: error ? (error.message || String(error)).slice(0, 500) : null,
        platformType: context.platformType || null,
        platformId: context.platformId || null,
        userId: context.userId || 'system',
      },
    }).catch((logErr: any) => logger.warn('Failed to save API log', logErr));
  }
}
