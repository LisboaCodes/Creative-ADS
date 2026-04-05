import { z } from 'zod';

export const createWebhookEndpointSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  url: z.string().url('URL inválida'),
  secret: z.string().optional().nullable(),
  isActive: z.boolean().optional().default(true),
  events: z.array(z.enum(['NEW_LEAD', 'LEAD_STAGE_CHANGE', 'SALE_COMPLETED', 'LEAD_UPDATED'])).min(1, 'Selecione pelo menos um evento'),
  retryCount: z.number().int().min(0).max(10).optional().default(3),
  timeoutMs: z.number().int().min(1000).max(30000).optional().default(5000),
});

export const updateWebhookEndpointSchema = createWebhookEndpointSchema.partial();

export type CreateWebhookEndpointInput = z.infer<typeof createWebhookEndpointSchema>;
export type UpdateWebhookEndpointInput = z.infer<typeof updateWebhookEndpointSchema>;
