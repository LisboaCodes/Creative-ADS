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

const GOOGLE_OAUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_ADS_API = 'https://googleads.googleapis.com/v17';

export class GoogleAdsService extends BasePlatformService {
  platformType = PlatformType.GOOGLE_ADS;

  getAuthUrl(state: string): string {
    if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_REDIRECT_URI) {
      throw new Error('Google Ads app credentials not configured');
    }

    const params = new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID,
      redirect_uri: env.GOOGLE_REDIRECT_URI,
      response_type: 'code',
      scope: 'https://www.googleapis.com/auth/adwords',
      access_type: 'offline',
      prompt: 'consent',
      state,
    });

    return `${GOOGLE_OAUTH_URL}?${params.toString()}`;
  }

  async exchangeCodeForTokens(
    code: string
  ): Promise<OAuthTokens & { externalId: string; adAccounts?: AdAccountData[] }> {
    try {
      if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET || !env.GOOGLE_REDIRECT_URI) {
        throw new Error('Google Ads app credentials not configured');
      }

      const tokenResponse = await axios.post(GOOGLE_TOKEN_URL, {
        code,
        client_id: env.GOOGLE_CLIENT_ID,
        client_secret: env.GOOGLE_CLIENT_SECRET,
        redirect_uri: env.GOOGLE_REDIRECT_URI,
        grant_type: 'authorization_code',
      });

      const { access_token, refresh_token, expires_in } = tokenResponse.data;

      const expiresAt = new Date();
      expiresAt.setSeconds(expiresAt.getSeconds() + (expires_in || 3600));

      // Discover accessible customer accounts
      const adAccounts = await this.getAccessibleCustomers(access_token);

      if (adAccounts.length === 0) {
        throw new Error('No Google Ads accounts found');
      }

      return {
        accessToken: access_token,
        refreshToken: refresh_token,
        expiresAt,
        externalId: adAccounts[0].id,
        adAccounts,
      };
    } catch (error: any) {
      logger.error('Google Ads token exchange error:', error.response?.data || error.message);
      throw new Error('Failed to exchange Google Ads authorization code');
    }
  }

  async refreshAccessToken(refreshToken: string): Promise<OAuthTokens> {
    try {
      if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
        throw new Error('Google Ads app credentials not configured');
      }

      const response = await axios.post(GOOGLE_TOKEN_URL, {
        refresh_token: refreshToken,
        client_id: env.GOOGLE_CLIENT_ID,
        client_secret: env.GOOGLE_CLIENT_SECRET,
        grant_type: 'refresh_token',
      });

      const { access_token, expires_in } = response.data;

      const expiresAt = new Date();
      expiresAt.setSeconds(expiresAt.getSeconds() + (expires_in || 3600));

      return {
        accessToken: access_token,
        refreshToken, // Google reuses the same refresh token
        expiresAt,
      };
    } catch (error: any) {
      logger.error('Google Ads token refresh error:', error.response?.data || error.message);
      throw new Error('Failed to refresh Google Ads token');
    }
  }

  async getCampaigns(accessToken: string, customerId: string): Promise<CampaignData[]> {
    try {
      const cleanCustomerId = customerId.replace(/-/g, '');

      const query = `
        SELECT
          campaign.id,
          campaign.name,
          campaign.status,
          campaign.campaign_budget,
          campaign.start_date,
          campaign.end_date
        FROM campaign
        WHERE campaign.status != 'REMOVED'
        ORDER BY campaign.name
      `;

      const response = await axios.post(
        `${GOOGLE_ADS_API}/customers/${cleanCustomerId}/googleAds:searchStream`,
        { query },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'developer-token': process.env.GOOGLE_ADS_DEVELOPER_TOKEN || '',
            'login-customer-id': cleanCustomerId,
          },
        }
      );

      const results = response.data?.[0]?.results || [];

      return results.map((row: any) => ({
        externalId: row.campaign.id,
        name: row.campaign.name,
        status: this.mapGoogleStatus(row.campaign.status),
        dailyBudget: undefined, // Budget is on campaign_budget resource
        currency: 'BRL',
        startDate: row.campaign.startDate ? new Date(row.campaign.startDate) : undefined,
        endDate: row.campaign.endDate ? new Date(row.campaign.endDate) : undefined,
      }));
    } catch (error: any) {
      logger.error('Google Ads get campaigns error:', error.response?.data || error.message);
      throw new Error('Failed to fetch Google Ads campaigns');
    }
  }

  async getMetrics(
    accessToken: string,
    campaignId: string,
    startDate: Date,
    endDate: Date
  ): Promise<MetricData[]> {
    try {
      const customerId = campaignId.split('/')[0] || campaignId;
      const cleanCustomerId = customerId.replace(/-/g, '');
      const start = startDate.toISOString().split('T')[0].replace(/-/g, '');
      const end = endDate.toISOString().split('T')[0].replace(/-/g, '');

      const query = `
        SELECT
          segments.date,
          metrics.impressions,
          metrics.clicks,
          metrics.cost_micros,
          metrics.conversions,
          metrics.conversions_value
        FROM campaign
        WHERE campaign.id = '${campaignId}'
          AND segments.date BETWEEN '${start}' AND '${end}'
      `;

      const response = await axios.post(
        `${GOOGLE_ADS_API}/customers/${cleanCustomerId}/googleAds:searchStream`,
        { query },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'developer-token': process.env.GOOGLE_ADS_DEVELOPER_TOKEN || '',
            'login-customer-id': cleanCustomerId,
          },
        }
      );

      const results = response.data?.[0]?.results || [];

      return results.map((row: any) => {
        const impressions = Number(row.metrics.impressions) || 0;
        const clicks = Number(row.metrics.clicks) || 0;
        const spend = (Number(row.metrics.costMicros) || 0) / 1_000_000;
        const conversions = Math.round(Number(row.metrics.conversions) || 0);
        const revenue = Number(row.metrics.conversionsValue) || 0;

        const calculated = this.calculateMetrics({ impressions, clicks, spend, conversions, revenue });

        return {
          date: new Date(row.segments.date),
          impressions: BigInt(impressions),
          reach: BigInt(impressions), // Google Ads doesn't have separate reach
          clicks: BigInt(clicks),
          spend,
          conversions,
          revenue,
          ...calculated,
        };
      });
    } catch (error: any) {
      logger.error('Google Ads get metrics error:', error.response?.data || error.message);
      throw new Error('Failed to fetch Google Ads metrics');
    }
  }

  async updateCampaignStatus(
    accessToken: string,
    campaignExternalId: string,
    status: 'ACTIVE' | 'PAUSED'
  ): Promise<void> {
    try {
      const customerId = campaignExternalId.split('/')[0] || campaignExternalId;
      const cleanCustomerId = customerId.replace(/-/g, '');

      const googleStatus = status === 'ACTIVE' ? 'ENABLED' : 'PAUSED';

      await axios.post(
        `${GOOGLE_ADS_API}/customers/${cleanCustomerId}/campaigns:mutate`,
        {
          operations: [{
            update: {
              resourceName: `customers/${cleanCustomerId}/campaigns/${campaignExternalId}`,
              status: googleStatus,
            },
            updateMask: 'status',
          }],
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'developer-token': process.env.GOOGLE_ADS_DEVELOPER_TOKEN || '',
            'login-customer-id': cleanCustomerId,
          },
        }
      );

      logger.info(`Google Ads campaign ${campaignExternalId} status updated to ${status}`);
    } catch (error: any) {
      logger.error('Google Ads update status error:', error.response?.data || error.message);
      throw new Error('Failed to update Google Ads campaign status');
    }
  }

  async updateCampaignBudget(
    accessToken: string,
    campaignExternalId: string,
    budget: { daily?: number; lifetime?: number }
  ): Promise<void> {
    // Google Ads budgets are managed via CampaignBudget resource
    logger.warn('Google Ads budget update requires CampaignBudget resource - not yet implemented');
    throw new Error('Google Ads budget update not yet implemented');
  }

  async getAdCreatives(
    accessToken: string,
    campaignExternalId: string
  ): Promise<AdCreativeData[]> {
    try {
      const customerId = campaignExternalId.split('/')[0] || campaignExternalId;
      const cleanCustomerId = customerId.replace(/-/g, '');

      const query = `
        SELECT
          ad_group_ad.ad.id,
          ad_group_ad.ad.name,
          ad_group_ad.ad.type,
          ad_group_ad.ad.responsive_search_ad.headlines,
          ad_group_ad.ad.responsive_search_ad.descriptions,
          ad_group_ad.ad.image_ad.image_url
        FROM ad_group_ad
        WHERE campaign.id = '${campaignExternalId}'
          AND ad_group_ad.status != 'REMOVED'
        LIMIT 100
      `;

      const response = await axios.post(
        `${GOOGLE_ADS_API}/customers/${cleanCustomerId}/googleAds:searchStream`,
        { query },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'developer-token': process.env.GOOGLE_ADS_DEVELOPER_TOKEN || '',
            'login-customer-id': cleanCustomerId,
          },
        }
      );

      const results = response.data?.[0]?.results || [];

      return results.map((row: any) => {
        const ad = row.adGroupAd?.ad || {};
        const headlines = ad.responsiveSearchAd?.headlines?.map((h: any) => h.text).join(' | ') || '';
        const descriptions = ad.responsiveSearchAd?.descriptions?.map((d: any) => d.text).join(' ') || '';

        return {
          externalId: ad.id || '',
          name: ad.name || undefined,
          title: headlines || undefined,
          body: descriptions || undefined,
          imageUrl: ad.imageAd?.imageUrl || undefined,
        };
      });
    } catch (error: any) {
      logger.error('Google Ads get creatives error:', error.response?.data || error.message);
      return [];
    }
  }

  /**
   * Get user profile info (email from userinfo endpoint)
   */
  async getUserProfile(accessToken: string): Promise<{ id: string; name: string; email?: string }> {
    try {
      const response = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      return {
        id: response.data.id,
        name: response.data.name || response.data.email,
        email: response.data.email,
      };
    } catch (error: any) {
      logger.error('Google userinfo error:', error.response?.data || error.message);
      throw new Error('Failed to get Google user profile');
    }
  }

  /**
   * Discover all accessible Google Ads customer accounts
   */
  private async getAccessibleCustomers(accessToken: string): Promise<AdAccountData[]> {
    try {
      const response = await axios.get(
        `${GOOGLE_ADS_API}/customers:listAccessibleCustomers`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'developer-token': process.env.GOOGLE_ADS_DEVELOPER_TOKEN || '',
          },
        }
      );

      const customerResourceNames: string[] = response.data.resourceNames || [];

      const accounts: AdAccountData[] = customerResourceNames.map((rn: string) => {
        const id = rn.replace('customers/', '');
        return { id, name: `Google Ads - ${id}` };
      });

      // Try to get descriptive names for each customer
      for (const account of accounts) {
        try {
          const detailResponse = await axios.post(
            `${GOOGLE_ADS_API}/customers/${account.id}/googleAds:searchStream`,
            { query: 'SELECT customer.descriptive_name, customer.id FROM customer LIMIT 1' },
            {
              headers: {
                Authorization: `Bearer ${accessToken}`,
                'developer-token': process.env.GOOGLE_ADS_DEVELOPER_TOKEN || '',
                'login-customer-id': account.id,
              },
            }
          );
          const name = detailResponse.data?.[0]?.results?.[0]?.customer?.descriptiveName;
          if (name) account.name = name;
        } catch {
          // Keep default name
        }
      }

      return accounts;
    } catch (error: any) {
      logger.error('Google Ads list customers error:', error.response?.data || error.message);
      return [];
    }
  }

  private mapGoogleStatus(status: string): 'ACTIVE' | 'PAUSED' | 'ARCHIVED' {
    const statusMap: Record<string, 'ACTIVE' | 'PAUSED' | 'ARCHIVED'> = {
      ENABLED: 'ACTIVE',
      PAUSED: 'PAUSED',
      REMOVED: 'ARCHIVED',
    };
    return statusMap[status] || 'PAUSED';
  }
}

export const googleAdsService = new GoogleAdsService();
