import { z } from 'zod';

export const createProjectSchema = z.object({
  name: z
    .string({ required_error: 'Project name is required' })
    .min(2, 'Project name must be at least 2 characters')
    .max(100, 'Project name cannot exceed 100 characters')
    .trim(),
  description: z
    .string()
    .max(500, 'Description cannot exceed 500 characters')
    .optional(),
  isPublic: z
    .boolean()
    .optional()
    .default(false),
  template: z
    .enum(['python', 'javascript', 'typescript', 'cpp', 'empty'])
    .optional()
    .default('python')
});

export const updateProjectSchema = z.object({
  name: z.string().min(2).max(100).trim().optional(),
  description: z.string().max(500).optional(),
  isPublic: z.boolean().optional()
});

export const inviteMemberSchema = z.object({
  email: z.string().email('Invalid member email'),
  role: z.enum(['editor', 'viewer']).default('editor')
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
export type InviteMemberInput = z.infer<typeof inviteMemberSchema>;
