import { TASK_STATUSES } from '@teamflow/contracts/tasks';
import { z } from 'zod';

import type { ListWorkspaceTasksQuery } from './workspace-task.repository.ts';

export const workspaceTaskListParamsSchema = z.strictObject({
  workspaceId: z.uuid(),
});

export const listWorkspaceTasksQuerySchema = z.strictObject({
  status: z.enum(TASK_STATUSES).optional(),
  search: z.string().trim().min(1).max(120).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
}) satisfies z.ZodType<ListWorkspaceTasksQuery>;
