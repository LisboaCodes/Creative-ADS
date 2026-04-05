import { z } from 'zod';

export const createTrackableMessageSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  messageTemplate: z.string().min(1, 'Template da mensagem é obrigatório'),
  gclid: z.string().optional().nullable(),
  isActive: z.boolean().optional().default(true),
});

export const updateTrackableMessageSchema = createTrackableMessageSchema.partial();

export type CreateTrackableMessageInput = z.infer<typeof createTrackableMessageSchema>;
export type UpdateTrackableMessageInput = z.infer<typeof updateTrackableMessageSchema>;
