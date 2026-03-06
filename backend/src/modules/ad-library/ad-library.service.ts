import axios from 'axios';
import { prisma } from '../../config/database';
import { decrypt } from '../../utils/encryption';
import { logger } from '../../utils/logger';

const FACEBOOK_GRAPH_API = 'https://graph.facebook.com/v21.0';

export interface AdLibrarySearchParams {
  searchTerms?: string;
  pageId?: string;
  country?: string;
  adType?: 'ALL' | 'POLITICAL_AND_ISSUE_ADS';
  limit?: number;
  after?: string;
}

export interface AdLibraryResult {
  id: string;
  adCreativeBodies?: string[];
  adCreativeLinkTitles?: string[];
  adCreativeLinkCaptions?: string[];
  adSnapshotUrl?: string;
  pageName?: string;
  pageId?: string;
  adDeliveryStartTime?: string;
  adDeliveryStopTime?: string;
  impressions?: { lowerBound: string; upperBound: string };
  spend?: { lowerBound: string; upperBound: string };
  currency?: string;
}

export class AdLibraryService {
  /**
   * Search the Meta Ad Library
   */
  async searchAds(userId: string, params: AdLibrarySearchParams): Promise<{
    ads: AdLibraryResult[];
    nextCursor?: string;
    totalCount?: number;
  }> {
    // Get an access token from any connected Facebook platform
    const platform = await prisma.platform.findFirst({
      where: {
        userId,
        type: 'FACEBOOK',
        isConnected: true,
      },
    });

    if (!platform) {
      throw new Error('Nenhuma conta Facebook conectada. Conecte uma conta para usar a Ad Library.');
    }

    let accessToken: string;
    try {
      accessToken = decrypt(platform.accessToken);
    } catch {
      throw new Error('Token de acesso inválido. Reconecte sua conta Facebook.');
    }

    try {
      const queryParams: any = {
        access_token: accessToken,
        ad_reached_countries: params.country || 'BR',
        ad_type: params.adType || 'ALL',
        fields: [
          'id',
          'ad_creative_bodies',
          'ad_creative_link_titles',
          'ad_creative_link_captions',
          'ad_snapshot_url',
          'page_name',
          'page_id',
          'ad_delivery_start_time',
          'ad_delivery_stop_time',
          'impressions',
          'spend',
          'currency',
        ].join(','),
        limit: Math.min(params.limit || 25, 50),
      };

      if (params.searchTerms) {
        queryParams.search_terms = params.searchTerms;
      }

      if (params.pageId) {
        queryParams.search_page_ids = params.pageId;
      }

      if (params.after) {
        queryParams.after = params.after;
      }

      // At least one of search_terms or search_page_ids is required
      if (!params.searchTerms && !params.pageId) {
        throw new Error('Informe um termo de busca ou ID de página.');
      }

      const response = await axios.get(`${FACEBOOK_GRAPH_API}/ads_archive`, {
        params: queryParams,
      });

      const data = response.data;

      const ads: AdLibraryResult[] = (data.data || []).map((ad: any) => ({
        id: ad.id,
        adCreativeBodies: ad.ad_creative_bodies,
        adCreativeLinkTitles: ad.ad_creative_link_titles,
        adCreativeLinkCaptions: ad.ad_creative_link_captions,
        adSnapshotUrl: ad.ad_snapshot_url,
        pageName: ad.page_name,
        pageId: ad.page_id,
        adDeliveryStartTime: ad.ad_delivery_start_time,
        adDeliveryStopTime: ad.ad_delivery_stop_time,
        impressions: ad.impressions,
        spend: ad.spend,
        currency: ad.currency,
      }));

      const nextCursor = data.paging?.cursors?.after;

      logger.info(`Ad Library search: found ${ads.length} ads for query "${params.searchTerms || params.pageId}"`);

      return {
        ads,
        nextCursor,
        totalCount: ads.length,
      };
    } catch (error: any) {
      if (error.response?.data?.error) {
        const fbError = error.response.data.error;
        logger.error('Ad Library API error:', fbError);
        throw new Error(fbError.message || 'Falha ao buscar na Ad Library');
      }
      throw error;
    }
  }
}

export const adLibraryService = new AdLibraryService();
