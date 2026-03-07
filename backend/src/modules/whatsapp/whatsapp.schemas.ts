import { z } from 'zod';

export const createWhatsAppGroupSchema = z.object({
  groupJid: z.string().min(1, 'Group JID é obrigatório'),
  groupName: z.string().min(1, 'Nome do grupo é obrigatório'),
  clientName: z.string().min(1, 'Nome do cliente é obrigatório'),
  platformIds: z.array(z.string()).min(1, 'Selecione ao menos uma conta de anúncio'),
  notifyStatusChange: z.boolean().default(true),
  notifyBudgetChange: z.boolean().default(true),
  notifyPerformance: z.boolean().default(true),
  notifyDailySummary: z.boolean().default(true),
});

export const updateWhatsAppGroupSchema = z.object({
  groupName: z.string().min(1).optional(),
  clientName: z.string().min(1).optional(),
  platformIds: z.array(z.string()).min(1).optional(),
  isActive: z.boolean().optional(),
  notifyStatusChange: z.boolean().optional(),
  notifyBudgetChange: z.boolean().optional(),
  notifyPerformance: z.boolean().optional(),
  notifyDailySummary: z.boolean().optional(),
});

export const sendTestMessageSchema = z.object({
  groupId: z.string().min(1),
});

export type CreateWhatsAppGroupInput = z.infer<typeof createWhatsAppGroupSchema>;
export type UpdateWhatsAppGroupInput = z.infer<typeof updateWhatsAppGroupSchema>;
