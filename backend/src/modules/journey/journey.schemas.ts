import { z } from 'zod';

export const createJourneyStageSchema = z.object({
  name: z.string().min(1, 'Nome da etapa é obrigatório'),
  conversionEvent: z.enum([
    'ViewContent', 'Lead', 'Purchase', 'AddPaymentInfo', 'AddToCart',
    'AddToWishlist', 'CompleteRegistration', 'Contact', 'CustomizeProduct',
    'Donate', 'FindLocation', 'InitiateCheckout', 'Schedule', 'Search',
    'StartTrial', 'SubmitApplication', 'Subscribe',
  ]).optional().nullable(),
  isSaleStage: z.boolean().optional().default(false),
  isFirstContact: z.boolean().optional().default(false),
  triggerKeyword: z.string().optional().nullable(),
});

export const updateJourneyStageSchema = createJourneyStageSchema.partial();

export const reorderStagesSchema = z.object({
  orderedIds: z.array(z.string().min(1)),
});

export const moveLeadSchema = z.object({
  journeyStageId: z.string().min(1, 'ID da etapa é obrigatório'),
});

export type CreateJourneyStageInput = z.infer<typeof createJourneyStageSchema>;
export type UpdateJourneyStageInput = z.infer<typeof updateJourneyStageSchema>;
export type ReorderStagesInput = z.infer<typeof reorderStagesSchema>;
export type MoveLeadInput = z.infer<typeof moveLeadSchema>;
