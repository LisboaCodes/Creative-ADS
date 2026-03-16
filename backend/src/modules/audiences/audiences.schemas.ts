import { z } from 'zod';

export const createAudienceSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  description: z.string().optional(),
  platformId: z.string().min(1, 'Plataforma é obrigatória'),
  emails: z
    .array(z.string().email('Email inválido'))
    .min(1, 'Pelo menos 1 email é necessário')
    .max(50000, 'Máximo de 50.000 emails por vez'),
  source: z.string().optional(),
});

export const updateAudienceSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
});

export type CreateAudienceInput = z.infer<typeof createAudienceSchema>;
export type UpdateAudienceInput = z.infer<typeof updateAudienceSchema>;
