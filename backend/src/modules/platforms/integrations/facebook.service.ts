import axios from 'axios';
import { PlatformType } from '@prisma/client';
import { env } from '../../../config/env';
import { logger } from '../../../utils/logger';
import {
  BasePlatformService,
  type OAuthTokens,
  type CampaignData,
  type MetricData,
} from './base.service';

const FACEBOOK_GRAPH_API = 'https://graph.facebook.com/v18.0';
const FACEBOOK_OAUTH_URL = 'https://www.facebook.com/v18.0/dialog/oauth';

export class FacebookService extends BasePlatformService {
  platformType = PlatformType.FACEBOOK;

  /**
   * Get OAuth authorization URL
   */
  getAuthUrl(state: string): string {
    if (!env.FACEBOOK_APP_ID || !env.FACEBOOK_REDIRECT_URI) {
      throw new Error('Facebook app credentials not configured');
    }

    const params = new URLSearchParams({
      client_id: env.FACEBOOK_APP_ID,
      redirect_uri: env.FACEBOOK_REDIRECT_URI,
      state,
      scope: [
        'ads_management',
        'ads_read',
        'business_management',
        'pages_read_engagement',
        'pages_manage_ads',
      ].join(','),
    });

    return `${FACEBOOK_OAUTH_URL}?${params.toString()}`;
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCodeForTokens(
    code: string
  ): Promise<OAuthTokens & { externalId: string }> {
    try {
      if (!env.FACEBOOK_APP_ID || !env.FACEBOOK_APP_SECRET || !env.FACEBOOK_REDIRECT_URI) {
        throw new Error('Facebook app credentials not configured');
      }

      // Exchange code for access token
      const tokenResponse = await axios.get(`${FACEBOOK_GRAPH_API}/oauth/access_token`, {
        params: {
          client_id: env.FACEBOOK_APP_ID,
          client_secret: env.FACEBOOK_APP_SECRET,
          redirect_uri: env.FACEBOOK_REDIRECT_URI,
          code,
        },
      });

      const { access_token } = tokenResponse.data;

      // Get long-lived token
      const longLivedResponse = await axios.get(`${FACEBOOK_GRAPH_API}/oauth/access_token`, {
        params: {
          grant_type: 'fb_exchange_token',
          client_id: env.FACEBOOK_APP_ID,
          client_secret: env.FACEBOOK_APP_SECRET,
          fb_exchange_token: access_token,
        },
      });

      const longLivedToken = longLivedResponse.data.access_token;
      const expiresIn = longLivedResponse.data.expires_in || 5184000; // 60 days default

      // Get ad accounts
      const adAccountsResponse = await axios.get(`${FACEBOOK_GRAPH_API}/me/adaccounts`, {
        params: {
          access_token: longLivedToken,
          fields: 'id,name,account_status',
        },
      });

      const adAccounts = adAccountsResponse.data.data;

      if (!adAccounts || adAccounts.length === 0) {
        throw new Error('No ad accounts found');
      }

      // Use first active ad account
      const activeAccount = adAccounts.find((acc: any) => acc.account_status === 1);
      const adAccount = activeAccount || adAccounts[0];

      const expiresAt = new Date();
      expiresAt.setSeconds(expiresAt.getSeconds() + expiresIn);

      return {
        accessToken: longLivedToken,
        expiresAt,
        externalId: adAccount.id,
      };
    } catch (error: any) {
      logger.error('Facebook token exchange error:', error.response?.data || error.message);
      throw new Error('Failed to exchange Facebook authorization code');
    }
  }

  /**
   * Refresh access token
   */
  async refreshAccessToken(refreshToken: string): Promise<OAuthTokens> {
    // Facebook long-lived tokens don't have refresh tokens
    // They need to be re-exchanged before expiration
    throw new Error('Facebook tokens must be re-authorized through OAuth flow');
  }

  /**
   * Get campaigns from Facebook
   */
  async getCampaigns(accessToken: string, externalId: string): Promise<CampaignData[]> {
    try {
      const response = await axios.get(`${FACEBOOK_GRAPH_API}/${externalId}/campaigns`, {
        params: {
          access_token: accessToken,
          fields: [
            'id',
            'name',
            'status',
            'effective_status',
            'daily_budget',
            'lifetime_budget',
            'start_time',
            'stop_time',
          ].join(','),
          limit: 100,
        },
      });

      const campaigns: CampaignData[] = response.data.data.map((campaign: any) => ({
        externalId: campaign.id,
        name: campaign.name,
        status: this.mapFacebookStatus(campaign.effective_status),
        dailyBudget: campaign.daily_budget ? Number(campaign.daily_budget) / 100 : undefined,
        lifetimeBudget: campaign.lifetime_budget
          ? Number(campaign.lifetime_budget) / 100
          : undefined,
        currency: 'USD', // Should be fetched from ad account
        startDate: campaign.start_time ? new Date(campaign.start_time) : undefined,
        endDate: campaign.stop_time ? new Date(campaign.stop_time) : undefined,
      }));

      return campaigns;
    } catch (error: any) {
      logger.error('Facebook get campaigns error:', error.response?.data || error.message);
      throw new Error('Failed to fetch Facebook campaigns');
    }
  }

  /**
   * Get metrics for a campaign
   */
  async getMetrics(
    accessToken: string,
    campaignExternalId: string,
    startDate: Date,
    endDate: Date
  ): Promise<MetricData[]> {
    try {
      const response = await axios.get(`${FACEBOOK_GRAPH_API}/${campaignExternalId}/insights`, {
        params: {
          access_token: accessToken,
          fields: [
            'impressions',
            'reach',
            'clicks',
            'spend',
            'actions',
            'action_values',
          ].join(','),
          time_range: JSON.stringify({
            since: startDate.toISOString().split('T')[0],
            until: endDate.toISOString().split('T')[0],
          }),
          time_increment: 1, // Daily breakdown
          level: 'campaign',
        },
      });

      const metrics: MetricData[] = response.data.data.map((insight: any) => {
        const conversions = this.extractConversions(insight.actions);
        const revenue = this.extractRevenue(insight.action_values);

        const baseMetrics = {
          impressions: Number(insight.impressions) || 0,
          reach: Number(insight.reach) || 0,
          clicks: Number(insight.clicks) || 0,
          spend: Number(insight.spend) || 0,
          conversions,
          revenue,
        };

        const calculatedMetrics = this.calculateMetrics(baseMetrics);

        return {
          date: new Date(insight.date_start),
          impressions: BigInt(baseMetrics.impressions),
          reach: BigInt(baseMetrics.reach),
          clicks: BigInt(baseMetrics.clicks),
          spend: baseMetrics.spend,
          conversions: baseMetrics.conversions,
          revenue: baseMetrics.revenue || 0,
          ...calculatedMetrics,
          metadata: {
            actions: insight.actions,
            action_values: insight.action_values,
          },
        };
      });

      return metrics;
    } catch (error: any) {
      logger.error('Facebook get metrics error:', error.response?.data || error.message);
      throw new Error('Failed to fetch Facebook metrics');
    }
  }

  /**
   * Update campaign status
   */
  async updateCampaignStatus(
    accessToken: string,
    campaignExternalId: string,
    status: 'ACTIVE' | 'PAUSED'
  ): Promise<void> {
    try {
      await axios.post(
        `${FACEBOOK_GRAPH_API}/${campaignExternalId}`,
        {
          status: status === 'ACTIVE' ? 'ACTIVE' : 'PAUSED',
        },
        {
          params: {
            access_token: accessToken,
          },
        }
      );

      logger.info(`Facebook campaign ${campaignExternalId} status updated to ${status}`);
    } catch (error: any) {
      logger.error('Facebook update status error:', error.response?.data || error.message);
      throw new Error('Failed to update Facebook campaign status');
    }
  }

  /**
   * Update campaign budget
   */
  async updateCampaignBudget(
    accessToken: string,
    campaignExternalId: string,
    budget: { daily?: number; lifetime?: number }
  ): Promise<void> {
    try {
      const updateData: any = {};

      if (budget.daily !== undefined) {
        updateData.daily_budget = Math.round(budget.daily * 100); // Convert to cents
      }

      if (budget.lifetime !== undefined) {
        updateData.lifetime_budget = Math.round(budget.lifetime * 100);
      }

      await axios.post(`${FACEBOOK_GRAPH_API}/${campaignExternalId}`, updateData, {
        params: {
          access_token: accessToken,
        },
      });

      logger.info(`Facebook campaign ${campaignExternalId} budget updated`);
    } catch (error: any) {
      logger.error('Facebook update budget error:', error.response?.data || error.message);
      throw new Error('Failed to update Facebook campaign budget');
    }
  }

  /**
   * Helper: Map Facebook status to our status
   */
  private mapFacebookStatus(fbStatus: string): 'ACTIVE' | 'PAUSED' | 'ARCHIVED' {
    const statusMap: Record<string, 'ACTIVE' | 'PAUSED' | 'ARCHIVED'> = {
      ACTIVE: 'ACTIVE',
      PAUSED: 'PAUSED',
      DELETED: 'ARCHIVED',
      ARCHIVED: 'ARCHIVED',
      PENDING_REVIEW: 'PAUSED',
      DISAPPROVED: 'PAUSED',
      PREAPPROVED: 'PAUSED',
      PENDING_BILLING_INFO: 'PAUSED',
      CAMPAIGN_PAUSED: 'PAUSED',
      ADSET_PAUSED: 'PAUSED',
      IN_PROCESS: 'ACTIVE',
      WITH_ISSUES: 'ACTIVE',
    };

    return statusMap[fbStatus] || 'PAUSED';
  }

  /**
   * Helper: Extract conversions from actions
   */
  private extractConversions(actions?: any[]): number {
    if (!actions) return 0;

    const conversionActions = [
      'purchase',
      'lead',
      'complete_registration',
      'add_to_cart',
      'initiate_checkout',
    ];

    return actions
      .filter((action) => conversionActions.includes(action.action_type))
      .reduce((sum, action) => sum + Number(action.value), 0);
  }

  /**
   * Helper: Extract revenue from action values
   */
  private extractRevenue(actionValues?: any[]): number {
    if (!actionValues) return 0;

    const purchaseAction = actionValues.find((av) => av.action_type === 'purchase');
    return purchaseAction ? Number(purchaseAction.value) : 0;
  }
}

export const facebookService = new FacebookService();
