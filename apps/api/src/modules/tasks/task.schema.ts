import { z } from 'zod';
import { TASK_STATUSES } from './task.model.ts';

export const taskTitleSchema = z.string().trim().min(1).max(120);

export const taskDescriptionSchema = z.string().trim().max(1_000).nullable();

export const createTaskSchema = z
  .object({
    title: taskTitleSchema,
    description: taskDescriptionSchema.optional(),
  })
  .strict();

export type CreateTaskInput = z.infer<typeof createTaskSchema>;

export const taskParamsSchema = z.object({ taskId: z.uuid() }).strict();

export const updateTaskSchema = z
  .object({
    title: taskTitleSchema.optional(),
    description: taskDescriptionSchema.optional(),
    status: z.enum(TASK_STATUSES).optional(),
  })
  .strict()
  .refine(
    (input) => Object.values(input).some((value) => value !== undefined),
    { message: 'At least one field must be provided' }
  );

export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
