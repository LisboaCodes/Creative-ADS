import { z } from 'zod';

// ─── Tracking Links ─────────────

export const createTrackingLinkSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  destinationUrl: z.string().url('URL de destino inválida'),
  utmSource: z.string().optional(),
  utmMedium: z.string().optional(),
  utmCampaign: z.string().optional(),
  utmContent: z.string().optional(),
  utmTerm: z.string().optional(),
  customParams: z.record(z.string()).optional(),
  campaignId: z.string().optional(),
  platformId: z.string().optional(),
});

export const updateTrackingLinkSchema = createTrackingLinkSchema.partial().extend({
  isActive: z.boolean().optional(),
});

export type CreateTrackingLinkInput = z.infer<typeof createTrackingLinkSchema>;
export type UpdateTrackingLinkInput = z.infer<typeof updateTrackingLinkSchema>;

// ─── Leads ─────────────

export const createLeadSchema = z.object({
  name: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  source: z.enum(['FACEBOOK', 'GOOGLE', 'INSTAGRAM', 'TIKTOK', 'LINKEDIN', 'ORGANIC', 'DIRECT', 'WHATSAPP', 'REFERRAL', 'OTHER']).optional(),
  status: z.enum(['NEW', 'CONTACTED', 'QUALIFIED', 'SOLD', 'LOST']).optional(),
  value: z.number().optional(),
  utmSource: z.string().optional(),
  utmMedium: z.string().optional(),
  utmCampaign: z.string().optional(),
  utmContent: z.string().optional(),
  utmTerm: z.string().optional(),
  trackingLinkId: z.string().optional(),
  campaignId: z.string().optional(),
  platformId: z.string().optional(),
  clientId: z.string().optional(),
  metadata: z.record(z.any()).optional(),
  notes: z.string().optional(),
});

export const updateLeadSchema = createLeadSchema.partial();

export type CreateLeadInput = z.infer<typeof createLeadSchema>;
export type UpdateLeadInput = z.infer<typeof updateLeadSchema>;

// ─── Webhook ─────────────

export const webhookLeadSchema = z.object({
  name: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  source: z.string().optional(),
  value: z.number().optional(),
  utmSource: z.string().optional(),
  utmMedium: z.string().optional(),
  utmCampaign: z.string().optional(),
  utmContent: z.string().optional(),
  utmTerm: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

export type WebhookLeadInput = z.infer<typeof webhookLeadSchema>;

// ─── Dashboard Query ─────────────

export const dashboardQuerySchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  source: z.string().optional(),
  status: z.string().optional(),
  campaignId: z.string().optional(),
});

export type DashboardQueryInput = z.infer<typeof dashboardQuerySchema>;
