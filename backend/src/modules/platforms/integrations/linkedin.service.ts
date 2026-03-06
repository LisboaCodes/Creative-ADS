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

const LINKEDIN_AUTH_URL = 'https://www.linkedin.com/oauth/v2/authorization';
const LINKEDIN_TOKEN_URL = 'https://www.linkedin.com/oauth/v2/accessToken';
const LINKEDIN_API = 'https://api.linkedin.com/rest';

export class LinkedInService extends BasePlatformService {
  platformType = PlatformType.LINKEDIN;

  getAuthUrl(state: string): string {
    if (!env.LINKEDIN_CLIENT_ID || !env.LINKEDIN_REDIRECT_URI) {
      throw new Error('LinkedIn app credentials not configured');
    }

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: env.LINKEDIN_CLIENT_ID,
      redirect_uri: env.LINKEDIN_REDIRECT_URI,
      state,
      scope: 'r_ads r_ads_reporting rw_ads r_basicprofile r_organization_social',
    });

    return `${LINKEDIN_AUTH_URL}?${params.toString()}`;
  }

  async exchangeCodeForTokens(
    code: string
  ): Promise<OAuthTokens & { externalId: string; adAccounts?: AdAccountData[] }> {
    try {
      if (!env.LINKEDIN_CLIENT_ID || !env.LINKEDIN_CLIENT_SECRET || !env.LINKEDIN_REDIRECT_URI) {
        throw new Error('LinkedIn app credentials not configured');
      }

      const params = new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: env.LINKEDIN_CLIENT_ID,
        client_secret: env.LINKEDIN_CLIENT_SECRET,
        redirect_uri: env.LINKEDIN_REDIRECT_URI,
      });

      const response = await axios.post(LINKEDIN_TOKEN_URL, params.toString(), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });

      const { access_token, refresh_token, expires_in } = response.data;

      const expiresAt = new Date();
      expiresAt.setSeconds(expiresAt.getSeconds() + (expires_in || 5184000));

      // Discover ad accounts
      const adAccounts = await this.getAdAccounts(access_token);

      if (adAccounts.length === 0) {
        throw new Error('No LinkedIn ad accounts found');
      }

      return {
        accessToken: access_token,
        refreshToken: refresh_token,
        expiresAt,
        externalId: adAccounts[0].id,
        adAccounts,
      };
    } catch (error: any) {
      logger.error('LinkedIn token exchange error:', error.response?.data || error.message);
      throw new Error('Failed to exchange LinkedIn authorization code');
    }
  }

  async refreshAccessToken(refreshToken: string): Promise<OAuthTokens> {
    try {
      if (!env.LINKEDIN_CLIENT_ID || !env.LINKEDIN_CLIENT_SECRET) {
        throw new Error('LinkedIn app credentials not configured');
      }

      const params = new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: env.LINKEDIN_CLIENT_ID,
        client_secret: env.LINKEDIN_CLIENT_SECRET,
      });

      const response = await axios.post(LINKEDIN_TOKEN_URL, params.toString(), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });

      const { access_token, refresh_token: new_refresh, expires_in } = response.data;

      const expiresAt = new Date();
      expiresAt.setSeconds(expiresAt.getSeconds() + (expires_in || 5184000));

      return {
        accessToken: access_token,
        refreshToken: new_refresh || refreshToken,
        expiresAt,
      };
    } catch (error: any) {
      logger.error('LinkedIn token refresh error:', error.response?.data || error.message);
      throw new Error('Failed to refresh LinkedIn token');
    }
  }

  async getCampaigns(accessToken: string, accountId: string): Promise<CampaignData[]> {
    try {
      const response = await axios.get(`${LINKEDIN_API}/adCampaigns`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'LinkedIn-Version': '202401',
          'X-Restli-Protocol-Version': '2.0.0',
        },
        params: {
          q: 'search',
          'search.account.values[0]': `urn:li:sponsoredAccount:${accountId}`,
          count: 100,
        },
      });

      const campaigns = response.data.elements || [];

      return campaigns.map((campaign: any) => {
        const urn = campaign.id || '';

        return {
          externalId: String(urn),
          name: campaign.name || `Campaign ${urn}`,
          status: this.mapLinkedInStatus(campaign.status),
          dailyBudget: campaign.dailyBudget?.amount
            ? Number(campaign.dailyBudget.amount) / 100
            : undefined,
          lifetimeBudget: campaign.totalBudget?.amount
            ? Number(campaign.totalBudget.amount) / 100
            : undefined,
          currency: campaign.dailyBudget?.currencyCode || 'BRL',
          startDate: campaign.runSchedule?.start
            ? new Date(campaign.runSchedule.start)
            : undefined,
          endDate: campaign.runSchedule?.end
            ? new Date(campaign.runSchedule.end)
            : undefined,
        };
      });
    } catch (error: any) {
      logger.error('LinkedIn get campaigns error:', error.response?.data || error.message);
      throw new Error('Failed to fetch LinkedIn campaigns');
    }
  }

  async getMetrics(
    accessToken: string,
    campaignId: string,
    startDate: Date,
    endDate: Date
  ): Promise<MetricData[]> {
    try {
      const response = await axios.get(`${LINKEDIN_API}/adAnalytics`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'LinkedIn-Version': '202401',
          'X-Restli-Protocol-Version': '2.0.0',
        },
        params: {
          q: 'analytics',
          pivot: 'CAMPAIGN',
          dateRange: JSON.stringify({
            start: {
              year: startDate.getFullYear(),
              month: startDate.getMonth() + 1,
              day: startDate.getDate(),
            },
            end: {
              year: endDate.getFullYear(),
              month: endDate.getMonth() + 1,
              day: endDate.getDate(),
            },
          }),
          timeGranularity: 'DAILY',
          'campaigns[0]': `urn:li:sponsoredCampaign:${campaignId}`,
          fields: 'impressions,clicks,costInLocalCurrency,externalWebsiteConversions',
        },
      });

      const elements = response.data.elements || [];

      return elements.map((row: any) => {
        const impressions = Number(row.impressions) || 0;
        const clicks = Number(row.clicks) || 0;
        const spend = Number(row.costInLocalCurrency) || 0;
        const conversions = Number(row.externalWebsiteConversions) || 0;

        const calculated = this.calculateMetrics({ impressions, clicks, spend, conversions });

        const dateRange = row.dateRange?.start;
        const date = dateRange
          ? new Date(dateRange.year, dateRange.month - 1, dateRange.day)
          : startDate;

        return {
          date,
          impressions: BigInt(impressions),
          reach: BigInt(impressions), // LinkedIn doesn't separate reach
          clicks: BigInt(clicks),
          spend,
          conversions,
          revenue: 0,
          ...calculated,
        };
      });
    } catch (error: any) {
      logger.error('LinkedIn get metrics error:', error.response?.data || error.message);
      throw new Error('Failed to fetch LinkedIn metrics');
    }
  }

  async updateCampaignStatus(
    accessToken: string,
    campaignExternalId: string,
    status: 'ACTIVE' | 'PAUSED'
  ): Promise<void> {
    try {
      const linkedInStatus = status === 'ACTIVE' ? 'ACTIVE' : 'PAUSED';

      await axios.post(
        `${LINKEDIN_API}/adCampaigns/${campaignExternalId}`,
        { patch: { $set: { status: linkedInStatus } } },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'LinkedIn-Version': '202401',
            'X-Restli-Protocol-Version': '2.0.0',
          },
        }
      );

      logger.info(`LinkedIn campaign ${campaignExternalId} status updated to ${status}`);
    } catch (error: any) {
      logger.error('LinkedIn update status error:', error.response?.data || error.message);
      throw new Error('Failed to update LinkedIn campaign status');
    }
  }

  async updateCampaignBudget(
    accessToken: string,
    campaignExternalId: string,
    budget: { daily?: number; lifetime?: number }
  ): Promise<void> {
    try {
      const patch: any = {};

      if (budget.daily !== undefined) {
        patch.dailyBudget = {
          amount: String(Math.round(budget.daily * 100)),
          currencyCode: 'BRL',
        };
      }
      if (budget.lifetime !== undefined) {
        patch.totalBudget = {
          amount: String(Math.round(budget.lifetime * 100)),
          currencyCode: 'BRL',
        };
      }

      await axios.post(
        `${LINKEDIN_API}/adCampaigns/${campaignExternalId}`,
        { patch: { $set: patch } },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'LinkedIn-Version': '202401',
            'X-Restli-Protocol-Version': '2.0.0',
          },
        }
      );

      logger.info(`LinkedIn campaign ${campaignExternalId} budget updated`);
    } catch (error: any) {
      logger.error('LinkedIn update budget error:', error.response?.data || error.message);
      throw new Error('Failed to update LinkedIn campaign budget');
    }
  }

  async getAdCreatives(
    accessToken: string,
    campaignExternalId: string
  ): Promise<AdCreativeData[]> {
    try {
      const response = await axios.get(`${LINKEDIN_API}/adCreatives`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'LinkedIn-Version': '202401',
          'X-Restli-Protocol-Version': '2.0.0',
        },
        params: {
          q: 'search',
          'search.campaign.values[0]': `urn:li:sponsoredCampaign:${campaignExternalId}`,
          count: 100,
        },
      });

      const creatives = response.data.elements || [];

      return creatives.map((creative: any) => ({
        externalId: String(creative.id || ''),
        name: creative.name || undefined,
        body: creative.data?.textAd?.text || undefined,
        title: creative.data?.textAd?.title || undefined,
        imageUrl: creative.data?.textAd?.thumbnailUrl || undefined,
      }));
    } catch (error: any) {
      logger.error('LinkedIn get creatives error:', error.response?.data || error.message);
      return [];
    }
  }

  /**
   * Get LinkedIn user profile
   */
  async getUserProfile(accessToken: string): Promise<{ id: string; name: string; email?: string }> {
    try {
      const response = await axios.get('https://api.linkedin.com/v2/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      return {
        id: response.data.sub || response.data.id || 'unknown',
        name: response.data.name || `${response.data.given_name || ''} ${response.data.family_name || ''}`.trim(),
        email: response.data.email,
      };
    } catch (error: any) {
      logger.error('LinkedIn getUserProfile error:', error.response?.data || error.message);
      throw new Error('Failed to get LinkedIn user profile');
    }
  }

  /**
   * Discover ad accounts the user has access to
   */
  private async getAdAccounts(accessToken: string): Promise<AdAccountData[]> {
    try {
      const response = await axios.get(`${LINKEDIN_API}/adAccounts`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'LinkedIn-Version': '202401',
          'X-Restli-Protocol-Version': '2.0.0',
        },
        params: {
          q: 'search',
          'search.status.values[0]': 'ACTIVE',
          count: 100,
        },
      });

      const accounts = response.data.elements || [];

      return accounts.map((account: any) => ({
        id: String(account.id),
        name: account.name || `LinkedIn Ads - ${account.id}`,
      }));
    } catch (error: any) {
      logger.error('LinkedIn get ad accounts error:', error.response?.data || error.message);
      return [];
    }
  }

  private mapLinkedInStatus(status: string): 'ACTIVE' | 'PAUSED' | 'ARCHIVED' {
    const statusMap: Record<string, 'ACTIVE' | 'PAUSED' | 'ARCHIVED'> = {
      ACTIVE: 'ACTIVE',
      PAUSED: 'PAUSED',
      ARCHIVED: 'ARCHIVED',
      COMPLETED: 'ARCHIVED',
      CANCELED: 'ARCHIVED',
      DRAFT: 'PAUSED',
      PENDING_DELETION: 'ARCHIVED',
    };
    return statusMap[status] || 'PAUSED';
  }
}

export const linkedinService = new LinkedInService();
