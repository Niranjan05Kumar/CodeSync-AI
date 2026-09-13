import { z } from 'zod';

export const executeCodeSchema = z.object({
  projectId: z.string().uuid({ message: 'Invalid project ID format' }),
  language: z.string().min(1, { message: 'Language is required' }),
  code: z.string().min(1, { message: 'Code cannot be empty' }),
  stdin: z.string().optional().default('')
});

export type ExecuteCodeInput = z.infer<typeof executeCodeSchema>;
