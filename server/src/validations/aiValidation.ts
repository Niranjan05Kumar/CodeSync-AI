import { z } from 'zod';

export const reviewCodeSchema = z.object({
  projectId: z.string().uuid({ message: 'Invalid project ID format' }),
  filePath: z.string().min(1, { message: 'File path is required' }),
  code: z.string().min(1, { message: 'Code cannot be empty' }),
  language: z.string().optional().default('plaintext')
});

export const debugCodeSchema = z.object({
  code: z.string().min(1, { message: 'Code cannot be empty' }),
  errorMessage: z.string().optional().default(''),
  language: z.string().optional().default('plaintext')
});

export const explainCodeSchema = z.object({
  code: z.string().min(1, { message: 'Code cannot be empty' }),
  language: z.string().optional().default('plaintext'),
  detailLevel: z.enum(['brief', 'detailed']).optional().default('detailed')
});

export const chatCodeSchema = z.object({
  messages: z.array(
    z.object({
      role: z.enum(['user', 'assistant', 'system']),
      content: z.string().min(1, { message: 'Message content cannot be empty' })
    })
  ).min(1, { message: 'At least one message is required' }),
  activeFile: z.object({
    path: z.string(),
    content: z.string(),
    language: z.string()
  }).optional()
});

export type ReviewCodeInput = z.infer<typeof reviewCodeSchema>;
export type DebugCodeInput = z.infer<typeof debugCodeSchema>;
export type ExplainCodeInput = z.infer<typeof explainCodeSchema>;
export type ChatCodeInput = z.infer<typeof chatCodeSchema>;
