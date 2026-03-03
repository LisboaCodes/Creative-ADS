import { z } from 'zod';

export const chatMessageSchema = z.object({
  message: z.string().min(1).max(5000),
  conversationId: z.string().optional(),
  provider: z.enum(['CLAUDE', 'OPENAI']).optional(),
});

export const approveActionSchema = z.object({
  // No body needed, action ID is in params
});

export const bulkApproveSchema = z.object({
  actionIds: z.array(z.string()).min(1).max(50),
});

export type ChatMessageInput = z.infer<typeof chatMessageSchema>;
export type BulkApproveInput = z.infer<typeof bulkApproveSchema>;
