import { z } from 'zod';

import {
  TASK_STATUSES,
  type CreateWorkspaceTaskInput,
  type UpdateWorkspaceTaskStatusInput,
} from '@teamflow/contracts/tasks';

import type { ListWorkspaceTasksQuery } from './workspace-task.repository.ts';

export const workspaceTaskCollectionParamsSchema = z.strictObject({
  workspaceId: z.uuid(),
});

export const listWorkspaceTasksQuerySchema = z.strictObject({
  status: z.enum(TASK_STATUSES).optional(),
  search: z.string().trim().min(1).max(120).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
}) satisfies z.ZodType<ListWorkspaceTasksQuery>;

export const createWorkspaceTaskSchema = z.strictObject({
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().max(1_000).nullable().default(null),
}) satisfies z.ZodType<CreateWorkspaceTaskInput>;

export const workspaceTaskItemParamsSchema = z.strictObject({
  workspaceId: z.uuid(),
  taskId: z.uuid(),
});

export const updateWorkspaceTaskStatusSchema = z.strictObject({
  status: z.enum(TASK_STATUSES),
}) satisfies z.ZodType<UpdateWorkspaceTaskStatusInput>;
