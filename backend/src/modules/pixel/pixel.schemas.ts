import { z } from 'zod';

export const createPixelConfigSchema = z.object({
  platform: z.enum(['meta', 'google']),
  pixelId: z.string().min(1, 'Pixel ID é obrigatório'),
  accessToken: z.string().min(1, 'Access Token é obrigatório'),
  testEventCode: z.string().optional().nullable(),
  isActive: z.boolean().optional().default(true),
});

export const updatePixelConfigSchema = createPixelConfigSchema.partial();

export type CreatePixelConfigInput = z.infer<typeof createPixelConfigSchema>;
export type UpdatePixelConfigInput = z.infer<typeof updatePixelConfigSchema>;
