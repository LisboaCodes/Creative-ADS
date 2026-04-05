import { z } from 'zod';

export const createClientSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  phone: z.string().optional(),
  company: z.string().optional(),
  notes: z.string().optional(),
});

export const updateClientSchema = createClientSchema.partial().extend({
  isActive: z.boolean().optional(),
});

export type CreateClientInput = z.infer<typeof createClientSchema>;
export type UpdateClientInput = z.infer<typeof updateClientSchema>;

// ─── Client Access Sharing ─────────────

export const shareClientAccessSchema = z.object({
  email: z.string().email('Email inválido'),
  role: z.enum(['viewer', 'editor', 'admin']).optional().default('viewer'),
});

export type ShareClientAccessInput = z.infer<typeof shareClientAccessSchema>;
