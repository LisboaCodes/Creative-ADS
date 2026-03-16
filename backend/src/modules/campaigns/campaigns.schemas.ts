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
  platformId: z.string().optional(),
  status: z.nativeEnum(CampaignStatus).optional(),
  search: z.string().optional(),
  hasSpend: z.enum(['true', 'false']).optional(),
  page: z.string().transform(Number).default('1'),
  limit: z.string().transform(Number).default('20'),
});

export const createCampaignSchema = z.object({
  platformId: z.string(),
  name: z.string().min(1, 'Nome é obrigatório'),
  objective: z.enum([
    'OUTCOME_AWARENESS',
    'OUTCOME_TRAFFIC',
    'OUTCOME_ENGAGEMENT',
    'OUTCOME_LEADS',
    'OUTCOME_SALES',
    'OUTCOME_APP_PROMOTION',
  ]),
  dailyBudget: z.number().positive().optional(),
  lifetimeBudget: z.number().positive().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  saveAsDraft: z.boolean().optional().default(false),
  targeting: z
    .object({
      geoLocations: z
        .object({
          countries: z.array(z.string()).optional(),
          cities: z.array(z.object({ key: z.string() })).optional(),
        })
        .optional(),
      ageMin: z.number().min(13).max(65).optional(),
      ageMax: z.number().min(13).max(65).optional(),
      genders: z.array(z.number()).optional(),
      interests: z.array(z.object({ id: z.string(), name: z.string() })).optional(),
      customAudiences: z.array(z.object({ id: z.string() })).optional(),
    })
    .optional(),
  creative: z
    .object({
      pageId: z.string(),
      message: z.string().optional(),
      headline: z.string().optional(),
      description: z.string().optional(),
      linkUrl: z.string().url().optional(),
      callToAction: z.string().optional(),
      imageUrl: z.string().optional(),
      imageHash: z.string().optional(),
      useExistingPost: z.boolean().optional(),
      postId: z.string().optional(),
    })
    .optional(),
});

export const applyTemplateSchema = z.object({
  templateId: z.string(),
  platformId: z.string(),
  campaignName: z.string().min(1, 'Nome da campanha é obrigatório'),
  budget: z.number().positive(),
  budgetType: z.enum(['daily', 'lifetime']),
  targeting: z.object({
    geoLocations: z.object({
      countries: z.array(z.string()).optional(),
      cities: z.array(z.object({ key: z.string() })).optional(),
    }).optional(),
    ageMin: z.number().min(13).max(65).optional(),
    ageMax: z.number().min(13).max(65).optional(),
    genders: z.array(z.number()).optional(),
    interests: z.array(z.object({ id: z.string(), name: z.string() })).optional(),
  }).optional(),
  pageId: z.string().optional(),
  websiteUrl: z.string().optional(),
  creative: z.object({
    headline: z.string().optional(),
    primaryText: z.string().optional(),
    description: z.string().optional(),
    cta: z.string().optional(),
    imageHash: z.string().optional(),
  }).optional(),
});

export const updateDraftSchema = z.object({
  name: z.string().min(1).optional(),
  objective: z.string().optional(),
  dailyBudget: z.number().positive().optional(),
  lifetimeBudget: z.number().positive().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  targeting: z.any().optional(),
  creative: z.any().optional(),
});

export const aiSuggestSchema = z.object({
  type: z.enum(['names', 'audience', 'budget', 'copy']),
  context: z.object({
    campaignName: z.string().optional(),
    objective: z.string().optional(),
    platformId: z.string().optional(),
    budgetType: z.string().optional(),
    interests: z.array(z.string()).optional(),
  }).optional(),
});

export type UpdateCampaignStatusInput = z.infer<typeof updateCampaignStatusSchema>;
export type UpdateCampaignBudgetInput = z.infer<typeof updateCampaignBudgetSchema>;
export type BulkActionInput = z.infer<typeof bulkActionSchema>;
export type CampaignFiltersInput = z.infer<typeof campaignFiltersSchema>;
export type CreateCampaignInput = z.infer<typeof createCampaignSchema>;
export type AISuggestInput = z.infer<typeof aiSuggestSchema>;
export type ApplyTemplateInput = z.infer<typeof applyTemplateSchema>;
export type UpdateDraftInput = z.infer<typeof updateDraftSchema>;
