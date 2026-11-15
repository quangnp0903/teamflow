export const TASK_STATUSES = ['todo', 'in_progress', 'done'] as const;

export type TaskStatus = (typeof TASK_STATUSES)[number];

export type WorkspaceTask = Readonly<{
  id: string;
  workspaceId: string;
  createdById: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  createdAt: string;
  updatedAt: string;
}>;

export type CreateWorkspaceTaskInput = Readonly<{
  title: string;
  description?: string | null;
}>;
