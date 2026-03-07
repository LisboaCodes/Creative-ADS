import axios from 'axios';
import { env } from '../../config/env';
import { logger } from '../../utils/logger';

export class EvolutionService {
  private baseUrl: string;
  private apiKey: string;
  private instance: string;

  constructor() {
    this.baseUrl = env.EVOLUTION_API_URL || '';
    this.apiKey = env.EVOLUTION_API_KEY || '';
    this.instance = env.EVOLUTION_INSTANCE || '';
  }

  isConfigured(): boolean {
    return !!(this.baseUrl && this.apiKey && this.instance);
  }

  async sendTextMessage(groupJid: string, text: string): Promise<void> {
    if (!this.isConfigured()) {
      logger.warn('Evolution API not configured, skipping message');
      return;
    }

    try {
      await axios.post(
        `${this.baseUrl}/message/sendText/${this.instance}`,
        { number: groupJid, text },
        { headers: { apikey: this.apiKey }, timeout: 10000 }
      );
      logger.info(`WhatsApp message sent to ${groupJid}`);
    } catch (error: any) {
      logger.error(`Failed to send WhatsApp message to ${groupJid}:`, error.message);
      throw error;
    }
  }

  async fetchGroups(): Promise<Array<{ id: string; subject: string; size: number; desc?: string }>> {
    if (!this.isConfigured()) {
      return [];
    }

    try {
      const response = await axios.get(
        `${this.baseUrl}/group/fetchAllGroups/${this.instance}`,
        {
          params: { getParticipants: false },
          headers: { apikey: this.apiKey },
          timeout: 15000,
        }
      );
      return response.data || [];
    } catch (error: any) {
      logger.error('Failed to fetch WhatsApp groups:', error.message);
      throw error;
    }
  }

  async checkConnection(): Promise<{ connected: boolean; instance: string }> {
    if (!this.isConfigured()) {
      return { connected: false, instance: '' };
    }

    try {
      await axios.get(
        `${this.baseUrl}/group/fetchAllGroups/${this.instance}`,
        {
          params: { getParticipants: false },
          headers: { apikey: this.apiKey },
          timeout: 5000,
        }
      );
      return { connected: true, instance: this.instance };
    } catch {
      return { connected: false, instance: this.instance };
    }
  }
}

export const evolutionService = new EvolutionService();
