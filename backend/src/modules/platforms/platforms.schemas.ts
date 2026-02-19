import { z } from 'zod';
import { PlatformType } from '@prisma/client';

export const connectPlatformSchema = z.object({
  code: z.string().min(1, 'Authorization code is required'),
  state: z.string().min(1, 'State parameter is required'),
});

export const platformTypeSchema = z.nativeEnum(PlatformType);

export type ConnectPlatformInput = z.infer<typeof connectPlatformSchema>;
