import { z } from 'zod';

export const createFileSchema = z.object({
  name: z
    .string({ required_error: 'File name is required' })
    .min(1, 'File name cannot be empty')
    .max(255, 'File name cannot exceed 255 characters')
    .regex(/^[^\\/:\*\?"<>\|]+$/, 'File name contains invalid characters'),
  parentId: z
    .string()
    .uuid('Invalid parent directory ID')
    .optional()
    .nullable(),
  isDirectory: z
    .boolean()
    .optional()
    .default(false),
  content: z
    .string()
    .optional()
    .default('')
});

export const updateFileContentSchema = z.object({
  content: z.string({ required_error: 'Content is required' }),
  version: z.number().int().min(1).optional()
});

export const renameFileSchema = z.object({
  name: z
    .string({ required_error: 'New file name is required' })
    .min(1, 'File name cannot be empty')
    .max(255, 'File name cannot exceed 255 characters')
    .regex(/^[^\\/:\*\?"<>\|]+$/, 'File name contains invalid characters')
});

export type CreateFileInput = z.infer<typeof createFileSchema>;
export type UpdateFileContentInput = z.infer<typeof updateFileContentSchema>;
export type RenameFileInput = z.infer<typeof renameFileSchema>;
