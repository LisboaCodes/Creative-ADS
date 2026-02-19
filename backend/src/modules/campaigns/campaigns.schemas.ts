import { z } from 'zod';
import { CampaignStatus } from '@prisma/client';

export const updateCampaignStatusSchema = z.object({
  status: z.nativeEnum(CampaignStatus),
});

export const updateCampaignBudgetSchema = z.object({
  dailyBudget: z.number().positive().optional(),
  lifetimeBudget: z.number().positive().optional(),
});

export const bulkActionSchema = z.object({
  campaignIds: z.array(z.string()),
  action: z.enum(['pause', 'activate', 'archive']),
});

export const campaignFiltersSchema = z.object({
  platformType: z.string().optional(),
  status: z.nativeEnum(CampaignStatus).optional(),
  search: z.string().optional(),
  page: z.string().transform(Number).default('1'),
  limit: z.string().transform(Number).default('20'),
});

export type UpdateCampaignStatusInput = z.infer<typeof updateCampaignStatusSchema>;
export type UpdateCampaignBudgetInput = z.infer<typeof updateCampaignBudgetSchema>;
export type BulkActionInput = z.infer<typeof bulkActionSchema>;
export type CampaignFiltersInput = z.infer<typeof campaignFiltersSchema>;
