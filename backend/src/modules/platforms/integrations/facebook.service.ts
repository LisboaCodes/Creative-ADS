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
  type CreateCampaignInput,
  type CreateAdSetInput,
  type CreateAdCreativeInput,
  type CreateAdInput,
} from './base.service';

const FACEBOOK_GRAPH_API = 'https://graph.facebook.com/v21.0';
const FACEBOOK_OAUTH_URL = 'https://www.facebook.com/v21.0/dialog/oauth';

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
      ].join(','),
    });

    return `${FACEBOOK_OAUTH_URL}?${params.toString()}`;
  }

  /**
   * Exchange authorization code for tokens
   * Returns the first active ad account (for backward compat).
   * Use getAdAccounts() to get all.
   */
  async exchangeCodeForTokens(
    code: string
  ): Promise<OAuthTokens & { externalId: string; adAccounts?: AdAccountData[] }> {
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

      // Get ALL ad accounts from ALL sources
      const allAdAccounts: any[] = [];
      const seenIds = new Set<string>();

      // 1. Get ad accounts directly assigned to user (/me/adaccounts)
      let adAccountsUrl: string | null = `${FACEBOOK_GRAPH_API}/me/adaccounts`;
      let adAccountsParams: any = {
        access_token: longLivedToken,
        fields: 'id,name,account_status',
        limit: 100,
      };

      while (adAccountsUrl) {
        const adAccountsResponse: { data: any } = await axios.get(adAccountsUrl, {
          params: adAccountsParams,
        });
        if (adAccountsResponse.data.data) {
          for (const acc of adAccountsResponse.data.data) {
            if (!seenIds.has(acc.id)) {
              seenIds.add(acc.id);
              allAdAccounts.push(acc);
            }
          }
        }
        adAccountsUrl = adAccountsResponse.data.paging?.next || null;
        adAccountsParams = {};
      }

      // 2. Get all Business Managers and their ad accounts
      let bmUrl: string | null = `${FACEBOOK_GRAPH_API}/me/businesses`;
      let bmParams: any = {
        access_token: longLivedToken,
        fields: 'id,name',
        limit: 100,
      };

      const businesses: any[] = [];
      while (bmUrl) {
        const bmResponse: { data: any } = await axios.get(bmUrl, { params: bmParams });
        if (bmResponse.data.data) {
          businesses.push(...bmResponse.data.data);
        }
        bmUrl = bmResponse.data.paging?.next || null;
        bmParams = {};
      }

      logger.info(`Found ${businesses.length} Business Managers: ${businesses.map((b: any) => b.name).join(', ')}`);

      // For each BM, get owned ad accounts
      for (const bm of businesses) {
        let bmAdUrl: string | null = `${FACEBOOK_GRAPH_API}/${bm.id}/owned_ad_accounts`;
        let bmAdParams: any = {
          access_token: longLivedToken,
          fields: 'id,name,account_status',
          limit: 100,
        };

        while (bmAdUrl) {
          try {
            const bmAdResponse: { data: any } = await axios.get(bmAdUrl, { params: bmAdParams });
            if (bmAdResponse.data.data) {
              for (const acc of bmAdResponse.data.data) {
                if (!seenIds.has(acc.id)) {
                  seenIds.add(acc.id);
                  acc._bmName = bm.name; // tag with BM name
                  allAdAccounts.push(acc);
                }
              }
            }
            bmAdUrl = bmAdResponse.data.paging?.next || null;
            bmAdParams = {};
          } catch (err: any) {
            logger.warn(`Could not fetch ad accounts for BM ${bm.name} (${bm.id}): ${err.message}`);
            break;
          }
        }

        // Also get client ad accounts (accounts shared with the BM)
        let clientAdUrl: string | null = `${FACEBOOK_GRAPH_API}/${bm.id}/client_ad_accounts`;
        let clientAdParams: any = {
          access_token: longLivedToken,
          fields: 'id,name,account_status',
          limit: 100,
        };

        while (clientAdUrl) {
          try {
            const clientAdResponse: { data: any } = await axios.get(clientAdUrl, { params: clientAdParams });
            if (clientAdResponse.data.data) {
              for (const acc of clientAdResponse.data.data) {
                if (!seenIds.has(acc.id)) {
                  seenIds.add(acc.id);
                  acc._bmName = bm.name;
                  allAdAccounts.push(acc);
                }
              }
            }
            clientAdUrl = clientAdResponse.data.paging?.next || null;
            clientAdParams = {};
          } catch (err: any) {
            logger.warn(`Could not fetch client ad accounts for BM ${bm.name} (${bm.id}): ${err.message}`);
            break;
          }
        }
      }

      logger.info(`Total ad accounts found across all sources: ${allAdAccounts.length}`);

      if (allAdAccounts.length === 0) {
        throw new Error('No ad accounts found');
      }

      // Filter active accounts (account_status === 1)
      const activeAccounts = allAdAccounts.filter((acc: any) => acc.account_status === 1);
      const accountsToUse = activeAccounts.length > 0 ? activeAccounts : allAdAccounts;

      const expiresAt = new Date();
      expiresAt.setSeconds(expiresAt.getSeconds() + expiresIn);

      // Build list for multi-account support
      const adAccounts: AdAccountData[] = accountsToUse.map((acc: any) => ({
        id: acc.id,
        name: acc._bmName ? `${acc.name || acc.id} (${acc._bmName})` : (acc.name || acc.id),
      }));

      logger.info(`Found ${adAccounts.length} active ad accounts`);

      return {
        accessToken: longLivedToken,
        expiresAt,
        externalId: adAccounts[0].id, // backward compat: first account
        adAccounts,
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
   * Get campaigns from Facebook (with pagination)
   */
  async getCampaigns(accessToken: string, externalId: string): Promise<CampaignData[]> {
    try {
      const allCampaigns: CampaignData[] = [];
      let url: string | null = `${FACEBOOK_GRAPH_API}/${externalId}/campaigns`;
      let params: any = {
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
      };

      while (url) {
        const response: { data: any } = await axios.get(url, { params });

        const campaigns: CampaignData[] = response.data.data.map((campaign: any) => ({
          externalId: campaign.id,
          name: campaign.name,
          status: this.mapFacebookStatus(campaign.effective_status),
          dailyBudget: campaign.daily_budget ? Number(campaign.daily_budget) / 100 : undefined,
          lifetimeBudget: campaign.lifetime_budget
            ? Number(campaign.lifetime_budget) / 100
            : undefined,
          currency: 'BRL',
          startDate: campaign.start_time ? new Date(campaign.start_time) : undefined,
          endDate: campaign.stop_time ? new Date(campaign.stop_time) : undefined,
        }));

        allCampaigns.push(...campaigns);

        // Follow pagination
        url = response.data.paging?.next || null;
        params = {}; // next URL already includes params
      }

      logger.info(`Fetched ${allCampaigns.length} campaigns from Facebook for account ${externalId}`);
      return allCampaigns;
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

      if (!response.data.data) {
        return [];
      }

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
   * Get ad creatives for a campaign
   */
  async getAdCreatives(
    accessToken: string,
    campaignExternalId: string
  ): Promise<AdCreativeData[]> {
    try {
      const allCreatives: AdCreativeData[] = [];
      let url: string | null = `${FACEBOOK_GRAPH_API}/${campaignExternalId}/ads`;
      let params: any = {
        access_token: accessToken,
        fields: 'id,name,creative{id,thumbnail_url,image_url,body,title}',
        limit: 100,
      };

      while (url) {
        const response: { data: any } = await axios.get(url, { params });

        if (response.data.data) {
          for (const ad of response.data.data) {
            const creative = ad.creative;
            if (creative) {
              allCreatives.push({
                externalId: creative.id,
                name: ad.name || undefined,
                thumbnailUrl: creative.thumbnail_url || undefined,
                imageUrl: creative.image_url || undefined,
                body: creative.body || undefined,
                title: creative.title || undefined,
              });
            }
          }
        }

        url = response.data.paging?.next || null;
        params = {};
      }

      return allCreatives;
    } catch (error: any) {
      logger.error('Facebook get ad creatives error:', error.response?.data || error.message);
      // Don't throw -- creatives are non-critical, return empty array
      return [];
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
   * Create a new campaign on Facebook
   */
  async createCampaign(
    accessToken: string,
    accountId: string,
    data: CreateCampaignInput
  ): Promise<{ id: string }> {
    try {
      const payload: any = {
        name: data.name,
        objective: data.objective,
        status: data.status || 'PAUSED',
        special_ad_categories: data.specialAdCategories || [],
      };

      if (data.dailyBudget) {
        payload.daily_budget = Math.round(data.dailyBudget * 100); // cents
      }
      if (data.lifetimeBudget) {
        payload.lifetime_budget = Math.round(data.lifetimeBudget * 100);
      }

      const response = await axios.post(
        `${FACEBOOK_GRAPH_API}/${accountId}/campaigns`,
        payload,
        { params: { access_token: accessToken } }
      );

      logger.info(`Created Facebook campaign: ${response.data.id}`);
      return { id: response.data.id };
    } catch (error: any) {
      logger.error('Facebook create campaign error:', error.response?.data || error.message);
      throw new Error(error.response?.data?.error?.message || 'Failed to create Facebook campaign');
    }
  }

  /**
   * Create a new ad set
   */
  async createAdSet(
    accessToken: string,
    data: CreateAdSetInput
  ): Promise<{ id: string }> {
    try {
      const targeting: any = {};

      if (data.targeting.geoLocations) {
        targeting.geo_locations = {};
        if (data.targeting.geoLocations.countries) {
          targeting.geo_locations.countries = data.targeting.geoLocations.countries;
        }
        if (data.targeting.geoLocations.cities) {
          targeting.geo_locations.cities = data.targeting.geoLocations.cities;
        }
      }
      if (data.targeting.ageMin) targeting.age_min = data.targeting.ageMin;
      if (data.targeting.ageMax) targeting.age_max = data.targeting.ageMax;
      if (data.targeting.genders) targeting.genders = data.targeting.genders;
      if (data.targeting.interests) {
        targeting.flexible_spec = [{ interests: data.targeting.interests }];
      }

      const payload: any = {
        name: data.name,
        campaign_id: data.campaignId,
        targeting: JSON.stringify(targeting),
        billing_event: data.billingEvent || 'IMPRESSIONS',
        optimization_goal: data.optimizationGoal || 'LINK_CLICKS',
        status: 'PAUSED',
      };

      if (data.dailyBudget) {
        payload.daily_budget = Math.round(data.dailyBudget * 100);
      }
      if (data.startTime) payload.start_time = data.startTime;
      if (data.endTime) payload.end_time = data.endTime;

      const response = await axios.post(
        `${FACEBOOK_GRAPH_API}/${data.campaignId}/adsets`,
        payload,
        { params: { access_token: accessToken } }
      );

      logger.info(`Created Facebook ad set: ${response.data.id}`);
      return { id: response.data.id };
    } catch (error: any) {
      logger.error('Facebook create ad set error:', error.response?.data || error.message);
      throw new Error(error.response?.data?.error?.message || 'Failed to create Facebook ad set');
    }
  }

  /**
   * Create ad creative
   */
  async createAdCreative(
    accessToken: string,
    accountId: string,
    data: CreateAdCreativeInput
  ): Promise<{ id: string }> {
    try {
      const objectStorySpec: any = {
        page_id: data.pageId,
      };

      if (data.linkUrl) {
        objectStorySpec.link_data = {
          link: data.linkUrl,
          message: data.message || '',
          name: data.headline || '',
          description: data.description || '',
        };
        if (data.imageHash) {
          objectStorySpec.link_data.image_hash = data.imageHash;
        }
        if (data.callToAction) {
          objectStorySpec.link_data.call_to_action = {
            type: data.callToAction,
            value: { link: data.linkUrl },
          };
        }
      }

      const payload: any = {
        name: data.name,
        object_story_spec: JSON.stringify(objectStorySpec),
      };

      const response = await axios.post(
        `${FACEBOOK_GRAPH_API}/${accountId}/adcreatives`,
        payload,
        { params: { access_token: accessToken } }
      );

      logger.info(`Created Facebook ad creative: ${response.data.id}`);
      return { id: response.data.id };
    } catch (error: any) {
      logger.error('Facebook create ad creative error:', error.response?.data || error.message);
      throw new Error(error.response?.data?.error?.message || 'Failed to create Facebook ad creative');
    }
  }

  /**
   * Create an ad
   */
  async createAd(
    accessToken: string,
    data: CreateAdInput
  ): Promise<{ id: string }> {
    try {
      const payload: any = {
        name: data.name,
        adset_id: data.adSetId,
        creative: JSON.stringify({ creative_id: data.creativeId }),
        status: data.status || 'PAUSED',
      };

      const response = await axios.post(
        `${FACEBOOK_GRAPH_API}/${data.adSetId}/ads`,
        payload,
        { params: { access_token: accessToken } }
      );

      logger.info(`Created Facebook ad: ${response.data.id}`);
      return { id: response.data.id };
    } catch (error: any) {
      logger.error('Facebook create ad error:', error.response?.data || error.message);
      throw new Error(error.response?.data?.error?.message || 'Failed to create Facebook ad');
    }
  }

  /**
   * Search targeting options (interests, behaviors)
   */
  async getTargetingOptions(
    accessToken: string,
    query: string
  ): Promise<Array<{ id: string; name: string; type: string; audienceSize?: number }>> {
    try {
      const response = await axios.get(`${FACEBOOK_GRAPH_API}/search`, {
        params: {
          access_token: accessToken,
          type: 'adinterest',
          q: query,
          limit: 20,
        },
      });

      return (response.data.data || []).map((item: any) => ({
        id: item.id,
        name: item.name,
        type: item.type || 'interest',
        audienceSize: item.audience_size,
      }));
    } catch (error: any) {
      logger.error('Facebook targeting search error:', error.response?.data || error.message);
      return [];
    }
  }

  /**
   * Search geolocation targeting (cities, regions, countries)
   */
  async searchGeoLocations(
    accessToken: string,
    query: string,
    locationTypes: string = 'city'
  ): Promise<Array<{ key: string; name: string; type: string; region?: string; countryCode?: string }>> {
    try {
      const response = await axios.get(`${FACEBOOK_GRAPH_API}/search`, {
        params: {
          access_token: accessToken,
          type: 'adgeolocation',
          q: query,
          location_types: `["${locationTypes}"]`,
          limit: 20,
        },
      });

      return (response.data.data || []).map((item: any) => ({
        key: item.key,
        name: item.name,
        type: item.type || locationTypes,
        region: item.region,
        countryCode: item.country_code,
      }));
    } catch (error: any) {
      logger.error('Facebook geolocation search error:', error.response?.data || error.message);
      return [];
    }
  }

  /**
   * Get pixels for an ad account
   */
  async getPixels(accessToken: string, adAccountId: string): Promise<Array<{
    id: string;
    name: string;
    isActive: boolean;
    lastFiredTime?: string;
    creationTime?: string;
    domain?: string;
  }>> {
    try {
      const response = await axios.get(`${FACEBOOK_GRAPH_API}/${adAccountId}/adspixels`, {
        params: {
          access_token: accessToken,
          fields: 'id,name,is_unavailable,last_fired_time,creation_time',
          limit: 50,
        },
      });

      if (!response.data.data) return [];

      return response.data.data.map((pixel: any) => ({
        id: pixel.id,
        name: pixel.name || `Pixel ${pixel.id}`,
        isActive: !pixel.is_unavailable && !!pixel.last_fired_time,
        lastFiredTime: pixel.last_fired_time || null,
        creationTime: pixel.creation_time || null,
      }));
    } catch (error: any) {
      logger.warn(`Failed to fetch pixels for account ${adAccountId}: ${error.response?.data?.error?.message || error.message}`);
      return [];
    }
  }

  /**
   * Get the authenticated user's profile (id, name, email)
   */
  async getUserProfile(accessToken: string): Promise<{ id: string; name: string; email?: string }> {
    try {
      const response = await axios.get(`${FACEBOOK_GRAPH_API}/me`, {
        params: {
          access_token: accessToken,
          fields: 'id,name,email',
        },
      });
      return {
        id: response.data.id,
        name: response.data.name,
        email: response.data.email,
      };
    } catch (error: any) {
      logger.error('Facebook getUserProfile error:', error.response?.data || error.message);
      throw new Error('Failed to get Facebook user profile');
    }
  }

  /**
   * Get all Business Managers the user has access to
   */
  async getBusinessManagers(accessToken: string): Promise<Array<{ id: string; name: string; createdTime?: string }>> {
    try {
      const businesses: Array<{ id: string; name: string; createdTime?: string }> = [];
      let url: string | null = `${FACEBOOK_GRAPH_API}/me/businesses`;
      let params: any = {
        access_token: accessToken,
        fields: 'id,name,created_time',
        limit: 100,
      };

      while (url) {
        const response: { data: any } = await axios.get(url, { params });
        if (response.data.data) {
          for (const bm of response.data.data) {
            businesses.push({
              id: bm.id,
              name: bm.name,
              createdTime: bm.created_time,
            });
          }
        }
        url = response.data.paging?.next || null;
        params = {};
      }

      return businesses;
    } catch (error: any) {
      logger.error('Facebook getBusinessManagers error:', error.response?.data || error.message);
      return [];
    }
  }

  /**
   * Get ad accounts for a specific Business Manager (owned + client)
   */
  async getBMAdAccounts(accessToken: string, bmId: string): Promise<Array<{ id: string; name: string; status: number }>> {
    const accounts: Array<{ id: string; name: string; status: number }> = [];
    const seenIds = new Set<string>();

    // Owned ad accounts
    try {
      let url: string | null = `${FACEBOOK_GRAPH_API}/${bmId}/owned_ad_accounts`;
      let params: any = { access_token: accessToken, fields: 'id,name,account_status', limit: 100 };

      while (url) {
        const response: { data: any } = await axios.get(url, { params });
        if (response.data.data) {
          for (const acc of response.data.data) {
            if (!seenIds.has(acc.id)) {
              seenIds.add(acc.id);
              accounts.push({ id: acc.id, name: acc.name || acc.id, status: acc.account_status });
            }
          }
        }
        url = response.data.paging?.next || null;
        params = {};
      }
    } catch (err: any) {
      logger.warn(`Could not fetch owned ad accounts for BM ${bmId}: ${err.message}`);
    }

    // Client ad accounts
    try {
      let url: string | null = `${FACEBOOK_GRAPH_API}/${bmId}/client_ad_accounts`;
      let params: any = { access_token: accessToken, fields: 'id,name,account_status', limit: 100 };

      while (url) {
        const response: { data: any } = await axios.get(url, { params });
        if (response.data.data) {
          for (const acc of response.data.data) {
            if (!seenIds.has(acc.id)) {
              seenIds.add(acc.id);
              accounts.push({ id: acc.id, name: acc.name || acc.id, status: acc.account_status });
            }
          }
        }
        url = response.data.paging?.next || null;
        params = {};
      }
    } catch (err: any) {
      logger.warn(`Could not fetch client ad accounts for BM ${bmId}: ${err.message}`);
    }

    return accounts;
  }

  /**
   * Get pages owned by a Business Manager
   */
  async getBMPages(accessToken: string, bmId: string): Promise<Array<{ id: string; name: string; picture?: string }>> {
    try {
      const pages: Array<{ id: string; name: string; picture?: string }> = [];
      let url: string | null = `${FACEBOOK_GRAPH_API}/${bmId}/owned_pages`;
      let params: any = {
        access_token: accessToken,
        fields: 'id,name,picture{url}',
        limit: 100,
      };

      while (url) {
        const response: { data: any } = await axios.get(url, { params });
        if (response.data.data) {
          for (const page of response.data.data) {
            pages.push({
              id: page.id,
              name: page.name,
              picture: page.picture?.data?.url,
            });
          }
        }
        url = response.data.paging?.next || null;
        params = {};
      }

      return pages;
    } catch (error: any) {
      logger.warn(`Failed to fetch pages for BM ${bmId}: ${error.message}`);
      return [];
    }
  }

  /**
   * Get pixels owned by a Business Manager
   */
  async getBMPixels(accessToken: string, bmId: string): Promise<Array<{ id: string; name: string; isActive: boolean; lastFiredTime?: string }>> {
    try {
      const pixels: Array<{ id: string; name: string; isActive: boolean; lastFiredTime?: string }> = [];
      let url: string | null = `${FACEBOOK_GRAPH_API}/${bmId}/owned_pixels`;
      let params: any = {
        access_token: accessToken,
        fields: 'id,name,is_unavailable,last_fired_time',
        limit: 100,
      };

      while (url) {
        const response: { data: any } = await axios.get(url, { params });
        if (response.data.data) {
          for (const pixel of response.data.data) {
            pixels.push({
              id: pixel.id,
              name: pixel.name || `Pixel ${pixel.id}`,
              isActive: !pixel.is_unavailable && !!pixel.last_fired_time,
              lastFiredTime: pixel.last_fired_time || undefined,
            });
          }
        }
        url = response.data.paging?.next || null;
        params = {};
      }

      return pixels;
    } catch (error: any) {
      logger.warn(`Failed to fetch pixels for BM ${bmId}: ${error.message}`);
      return [];
    }
  }

  /**
   * Get pages the user administrates (via /me/accounts)
   */
  async getUserPages(accessToken: string): Promise<Array<{ id: string; name: string; picture?: string; accessToken: string }>> {
    try {
      const pages: Array<{ id: string; name: string; picture?: string; accessToken: string }> = [];
      let url: string | null = `${FACEBOOK_GRAPH_API}/me/accounts`;
      let params: any = {
        access_token: accessToken,
        fields: 'id,name,picture{url},access_token',
        limit: 100,
      };

      while (url) {
        const response: { data: any } = await axios.get(url, { params });
        if (response.data.data) {
          for (const page of response.data.data) {
            pages.push({
              id: page.id,
              name: page.name,
              picture: page.picture?.data?.url,
              accessToken: page.access_token,
            });
          }
        }
        url = response.data.paging?.next || null;
        params = {};
      }

      return pages;
    } catch (error: any) {
      logger.error('Facebook getUserPages error:', error.response?.data || error.message);
      return [];
    }
  }

  /**
   * Upload an image to an ad account for use in creatives
   */
  async uploadImage(
    accessToken: string,
    accountId: string,
    imageBase64: string
  ): Promise<{ hash: string; url: string }> {
    try {
      const response = await axios.post(
        `${FACEBOOK_GRAPH_API}/${accountId}/adimages`,
        { bytes: imageBase64 },
        { params: { access_token: accessToken } }
      );

      const images = response.data.images;
      const key = Object.keys(images)[0];
      const imageData = images[key];

      logger.info(`Uploaded image to ${accountId}: hash=${imageData.hash}`);
      return { hash: imageData.hash, url: imageData.url };
    } catch (error: any) {
      logger.error('Facebook uploadImage error:', error.response?.data || error.message);
      throw new Error(error.response?.data?.error?.message || 'Failed to upload image');
    }
  }

  /**
   * Get recent posts from a Facebook page
   */
  async getPagePosts(
    accessToken: string,
    pageId: string
  ): Promise<Array<{ id: string; message?: string; fullPicture?: string; createdTime: string; permalinkUrl?: string }>> {
    try {
      const response = await axios.get(`${FACEBOOK_GRAPH_API}/${pageId}/posts`, {
        params: {
          access_token: accessToken,
          fields: 'id,message,full_picture,created_time,permalink_url',
          limit: 20,
        },
      });

      if (!response.data.data) return [];

      return response.data.data.map((post: any) => ({
        id: post.id,
        message: post.message,
        fullPicture: post.full_picture,
        createdTime: post.created_time,
        permalinkUrl: post.permalink_url,
      }));
    } catch (error: any) {
      logger.error('Facebook getPagePosts error:', error.response?.data || error.message);
      return [];
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
      // Purchase / E-commerce
      'purchase',
      'omni_purchase',
      'offsite_conversion.fb_pixel_purchase',
      // Leads
      'lead',
      'onsite_conversion.lead_grouped',
      'offsite_conversion.fb_pixel_lead',
      // Registration
      'complete_registration',
      'offsite_conversion.fb_pixel_complete_registration',
      // Cart / Checkout
      'add_to_cart',
      'initiate_checkout',
      'offsite_conversion.fb_pixel_add_to_cart',
      'offsite_conversion.fb_pixel_initiate_checkout',
      // Messaging
      'onsite_conversion.messaging_conversation_started_7d',
      'onsite_conversion.messaging_first_reply',
      'messaging_conversation_started_7d',
      // Landing page
      'landing_page_view',
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

    const revenueActions = [
      'purchase',
      'omni_purchase',
      'offsite_conversion.fb_pixel_purchase',
    ];

    let total = 0;
    for (const av of actionValues) {
      if (revenueActions.includes(av.action_type)) {
        total += Number(av.value) || 0;
      }
    }
    return total;
  }
}

export const facebookService = new FacebookService();
