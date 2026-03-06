import axios from 'axios';
import { PlatformType } from '@prisma/client';
import { env } from '../../../config/env';
import { logger } from '../../../utils/logger';
import {
  BasePlatformService,
  type OAuthTokens,
  type CampaignData,
  type MetricData,
  type AdCreativeData,
  type AdAccountData,
} from './base.service';

const TIKTOK_AUTH_URL = 'https://business-api.tiktok.com/portal/auth';
const TIKTOK_API = 'https://business-api.tiktok.com/open_api/v1.3';

export class TikTokService extends BasePlatformService {
  platformType = PlatformType.TIKTOK;

  getAuthUrl(state: string): string {
    if (!env.TIKTOK_APP_ID || !env.TIKTOK_REDIRECT_URI) {
      throw new Error('TikTok app credentials not configured');
    }

    const params = new URLSearchParams({
      app_id: env.TIKTOK_APP_ID,
      redirect_uri: env.TIKTOK_REDIRECT_URI,
      state,
    });

    return `${TIKTOK_AUTH_URL}?${params.toString()}`;
  }

  async exchangeCodeForTokens(
    code: string
  ): Promise<OAuthTokens & { externalId: string; adAccounts?: AdAccountData[] }> {
    try {
      if (!env.TIKTOK_APP_ID || !env.TIKTOK_APP_SECRET) {
        throw new Error('TikTok app credentials not configured');
      }

      const response = await axios.post(`${TIKTOK_API}/oauth2/access_token/`, {
        app_id: env.TIKTOK_APP_ID,
        secret: env.TIKTOK_APP_SECRET,
        auth_code: code,
      });

      const data = response.data.data;
      if (!data || !data.access_token) {
        throw new Error(response.data.message || 'Failed to get TikTok access token');
      }

      const expiresAt = new Date();
      expiresAt.setSeconds(expiresAt.getSeconds() + (data.expires_in || 86400));

      // Get advertiser accounts
      const adAccounts = await this.getAdvertiserAccounts(data.access_token);

      if (adAccounts.length === 0) {
        throw new Error('No TikTok advertiser accounts found');
      }

      return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresAt,
        externalId: adAccounts[0].id,
        adAccounts,
      };
    } catch (error: any) {
      logger.error('TikTok token exchange error:', error.response?.data || error.message);
      throw new Error('Failed to exchange TikTok authorization code');
    }
  }

  async refreshAccessToken(refreshToken: string): Promise<OAuthTokens> {
    try {
      if (!env.TIKTOK_APP_ID || !env.TIKTOK_APP_SECRET) {
        throw new Error('TikTok app credentials not configured');
      }

      const response = await axios.post(`${TIKTOK_API}/oauth2/refresh_token/`, {
        app_id: env.TIKTOK_APP_ID,
        secret: env.TIKTOK_APP_SECRET,
        refresh_token: refreshToken,
      });

      const data = response.data.data;
      if (!data || !data.access_token) {
        throw new Error('Failed to refresh TikTok token');
      }

      const expiresAt = new Date();
      expiresAt.setSeconds(expiresAt.getSeconds() + (data.expires_in || 86400));

      return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token || refreshToken,
        expiresAt,
      };
    } catch (error: any) {
      logger.error('TikTok token refresh error:', error.response?.data || error.message);
      throw new Error('Failed to refresh TikTok token');
    }
  }

  async getCampaigns(accessToken: string, advertiserId: string): Promise<CampaignData[]> {
    try {
      const allCampaigns: CampaignData[] = [];
      let page = 1;
      const pageSize = 100;

      while (true) {
        const response = await axios.get(`${TIKTOK_API}/campaign/get/`, {
          headers: { 'Access-Token': accessToken },
          params: {
            advertiser_id: advertiserId,
            page,
            page_size: pageSize,
          },
        });

        const data = response.data.data;
        if (!data?.list || data.list.length === 0) break;

        for (const campaign of data.list) {
          allCampaigns.push({
            externalId: campaign.campaign_id,
            name: campaign.campaign_name,
            status: this.mapTikTokStatus(campaign.operation_status || campaign.secondary_status),
            dailyBudget: campaign.budget_mode === 'BUDGET_MODE_DAY' ? campaign.budget : undefined,
            lifetimeBudget: campaign.budget_mode === 'BUDGET_MODE_TOTAL' ? campaign.budget : undefined,
            currency: 'BRL',
            startDate: campaign.create_time ? new Date(campaign.create_time) : undefined,
          });
        }

        if (data.list.length < pageSize) break;
        page++;
      }

      logger.info(`Fetched ${allCampaigns.length} campaigns from TikTok for advertiser ${advertiserId}`);
      return allCampaigns;
    } catch (error: any) {
      logger.error('TikTok get campaigns error:', error.response?.data || error.message);
      throw new Error('Failed to fetch TikTok campaigns');
    }
  }

  async getMetrics(
    accessToken: string,
    campaignId: string,
    startDate: Date,
    endDate: Date
  ): Promise<MetricData[]> {
    try {
      // We need the advertiser_id; it may be embedded or we assume it's available
      // TikTok reporting API requires advertiser_id
      const response = await axios.get(`${TIKTOK_API}/report/integrated/get/`, {
        headers: { 'Access-Token': accessToken },
        params: {
          advertiser_id: campaignId.split(':')[0] || campaignId,
          report_type: 'BASIC',
          data_level: 'AUCTION_CAMPAIGN',
          dimensions: JSON.stringify(['campaign_id', 'stat_time_day']),
          metrics: JSON.stringify([
            'spend', 'impressions', 'reach', 'clicks',
            'conversion', 'total_complete_payment_rate',
          ]),
          start_date: startDate.toISOString().split('T')[0],
          end_date: endDate.toISOString().split('T')[0],
          filtering: JSON.stringify([{
            field_name: 'campaign_ids',
            filter_type: 'IN',
            filter_value: JSON.stringify([campaignId]),
          }]),
          page_size: 365,
        },
      });

      const rows = response.data.data?.list || [];

      return rows.map((row: any) => {
        const metrics = row.metrics || {};
        const impressions = Number(metrics.impressions) || 0;
        const clicks = Number(metrics.clicks) || 0;
        const spend = Number(metrics.spend) || 0;
        const conversions = Number(metrics.conversion) || 0;
        const reach = Number(metrics.reach) || 0;

        const calculated = this.calculateMetrics({ impressions, clicks, spend, conversions });

        return {
          date: new Date(row.dimensions?.stat_time_day || startDate),
          impressions: BigInt(impressions),
          reach: BigInt(reach),
          clicks: BigInt(clicks),
          spend,
          conversions,
          revenue: 0,
          ...calculated,
        };
      });
    } catch (error: any) {
      logger.error('TikTok get metrics error:', error.response?.data || error.message);
      throw new Error('Failed to fetch TikTok metrics');
    }
  }

  async updateCampaignStatus(
    accessToken: string,
    campaignExternalId: string,
    status: 'ACTIVE' | 'PAUSED'
  ): Promise<void> {
    try {
      const tiktokStatus = status === 'ACTIVE' ? 'ENABLE' : 'DISABLE';

      await axios.post(
        `${TIKTOK_API}/campaign/status/update/`,
        {
          campaign_ids: [campaignExternalId],
          operation_status: tiktokStatus,
        },
        { headers: { 'Access-Token': accessToken } }
      );

      logger.info(`TikTok campaign ${campaignExternalId} status updated to ${status}`);
    } catch (error: any) {
      logger.error('TikTok update status error:', error.response?.data || error.message);
      throw new Error('Failed to update TikTok campaign status');
    }
  }

  async updateCampaignBudget(
    accessToken: string,
    campaignExternalId: string,
    budget: { daily?: number; lifetime?: number }
  ): Promise<void> {
    try {
      const updateData: any = {
        campaign_id: campaignExternalId,
      };

      if (budget.daily !== undefined) {
        updateData.budget = budget.daily;
        updateData.budget_mode = 'BUDGET_MODE_DAY';
      } else if (budget.lifetime !== undefined) {
        updateData.budget = budget.lifetime;
        updateData.budget_mode = 'BUDGET_MODE_TOTAL';
      }

      await axios.post(
        `${TIKTOK_API}/campaign/update/`,
        updateData,
        { headers: { 'Access-Token': accessToken } }
      );

      logger.info(`TikTok campaign ${campaignExternalId} budget updated`);
    } catch (error: any) {
      logger.error('TikTok update budget error:', error.response?.data || error.message);
      throw new Error('Failed to update TikTok campaign budget');
    }
  }

  async getAdCreatives(
    accessToken: string,
    campaignExternalId: string
  ): Promise<AdCreativeData[]> {
    try {
      const response = await axios.get(`${TIKTOK_API}/ad/get/`, {
        headers: { 'Access-Token': accessToken },
        params: {
          advertiser_id: campaignExternalId.split(':')[0] || campaignExternalId,
          filtering: JSON.stringify({
            campaign_ids: [campaignExternalId],
          }),
          fields: JSON.stringify([
            'ad_id', 'ad_name', 'ad_text',
            'image_ids', 'video_id', 'avatar_icon_web_uri',
          ]),
          page_size: 100,
        },
      });

      const ads = response.data.data?.list || [];

      return ads.map((ad: any) => ({
        externalId: ad.ad_id || '',
        name: ad.ad_name || undefined,
        body: ad.ad_text || undefined,
        thumbnailUrl: ad.avatar_icon_web_uri || undefined,
      }));
    } catch (error: any) {
      logger.error('TikTok get creatives error:', error.response?.data || error.message);
      return [];
    }
  }

  /**
   * Get user info from TikTok Business API
   */
  async getUserProfile(accessToken: string): Promise<{ id: string; name: string }> {
    try {
      const response = await axios.get(`${TIKTOK_API}/user/info/`, {
        headers: { 'Access-Token': accessToken },
      });

      const data = response.data.data;
      return {
        id: data?.id || data?.core_user_id || 'unknown',
        name: data?.display_name || data?.email || 'TikTok User',
      };
    } catch (error: any) {
      logger.error('TikTok getUserProfile error:', error.response?.data || error.message);
      throw new Error('Failed to get TikTok user profile');
    }
  }

  /**
   * Discover all advertiser accounts
   */
  private async getAdvertiserAccounts(accessToken: string): Promise<AdAccountData[]> {
    try {
      const response = await axios.get(`${TIKTOK_API}/oauth2/advertiser/get/`, {
        headers: { 'Access-Token': accessToken },
        params: {
          app_id: env.TIKTOK_APP_ID,
          secret: env.TIKTOK_APP_SECRET,
        },
      });

      const advertisers = response.data.data?.list || [];

      return advertisers.map((adv: any) => ({
        id: adv.advertiser_id,
        name: adv.advertiser_name || `TikTok - ${adv.advertiser_id}`,
      }));
    } catch (error: any) {
      logger.error('TikTok get advertisers error:', error.response?.data || error.message);
      return [];
    }
  }

  private mapTikTokStatus(status: string): 'ACTIVE' | 'PAUSED' | 'ARCHIVED' {
    const statusMap: Record<string, 'ACTIVE' | 'PAUSED' | 'ARCHIVED'> = {
      CAMPAIGN_STATUS_ENABLE: 'ACTIVE',
      ENABLE: 'ACTIVE',
      CAMPAIGN_STATUS_DISABLE: 'PAUSED',
      DISABLE: 'PAUSED',
      CAMPAIGN_STATUS_DELETE: 'ARCHIVED',
      DELETE: 'ARCHIVED',
    };
    return statusMap[status] || 'PAUSED';
  }
}

export const tiktokService = new TikTokService();
