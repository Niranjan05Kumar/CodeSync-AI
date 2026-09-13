import { z } from 'zod';

export const ragSyncSchema = z.object({
  projectId: z.string().uuid({ message: 'Invalid project ID format' })
});

export const ragQuerySchema = z.object({
  projectId: z.string().uuid({ message: 'Invalid project ID format' }),
  query: z.string().min(1, { message: 'Query cannot be empty' }),
  minSimilarity: z.number().min(0).max(1).optional().default(0.70),
  limit: z.number().int().min(1).max(20).optional().default(5)
});

export type RagSyncInput = z.infer<typeof ragSyncSchema>;
export type RagQueryInput = z.infer<typeof ragQuerySchema>;
