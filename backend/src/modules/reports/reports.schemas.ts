import { z } from 'zod';

export const generateReportSchema = z.object({
  title: z.string().min(1).max(200),
  template: z.enum(['executive', 'detailed', 'financial']),
  platformId: z.string().optional(),
  startDate: z.string().transform((str) => new Date(str)),
  endDate: z.string().transform((str) => new Date(str)),
});

export type GenerateReportInput = z.infer<typeof generateReportSchema>;
