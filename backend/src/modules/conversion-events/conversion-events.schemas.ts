import { z } from 'zod';

export const createConversionEventSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  platform: z.enum(['meta', 'google']),
  metaEventName: z.enum([
    'ViewContent', 'Lead', 'Purchase', 'AddPaymentInfo', 'AddToCart',
    'AddToWishlist', 'CompleteRegistration', 'Contact', 'CustomizeProduct',
    'Donate', 'FindLocation', 'InitiateCheckout', 'Schedule', 'Search',
    'StartTrial', 'SubmitApplication', 'Subscribe',
  ]).optional().nullable(),
  metaPixelId: z.string().optional().nullable(),
  metaAccessToken: z.string().optional().nullable(),
  googleConversionAction: z.string().optional().nullable(),
  googleCustomerId: z.string().optional().nullable(),
  isActive: z.boolean().optional().default(true),
  autoSend: z.boolean().optional().default(false),
  journeyStageId: z.string().optional().nullable(),
});

export const updateConversionEventSchema = createConversionEventSchema.partial();

export type CreateConversionEventInput = z.infer<typeof createConversionEventSchema>;
export type UpdateConversionEventInput = z.infer<typeof updateConversionEventSchema>;
