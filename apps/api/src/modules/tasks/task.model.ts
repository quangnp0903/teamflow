export const TASK_STATUSES = ['todo', 'in_progress', 'done'] as const;

export type TaskStatus = (typeof TASK_STATUSES)[number];

export type Task = Readonly<{
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  createdAt: string;
  updatedAt: string;
}>


