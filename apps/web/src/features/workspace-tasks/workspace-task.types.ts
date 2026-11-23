import type { WorkspaceTask } from '@teamflow/contracts/tasks';

export type {
  CreateWorkspaceTaskInput,
  WorkspaceTask,
} from '@teamflow/contracts/tasks';

export type WorkspaceTaskPage = Readonly<{
  data: readonly WorkspaceTask[];
  meta: Readonly<{
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  }>;
}>;

export type ListWorkspaceTasksParams = Readonly<{
  page?: number;
  pageSize?: number;
}>;
