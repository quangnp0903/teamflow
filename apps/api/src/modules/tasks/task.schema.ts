import { z } from 'zod';

export const createTaskSchema = z
  .object({
    title: z.string().trim().min(1).max(120),
    description: z.string().trim().max(1_1000).nullable().optional(),
  })
  .strict();

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
