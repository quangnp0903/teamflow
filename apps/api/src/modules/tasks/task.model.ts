import type { TaskStatus } from '@teamflow/contracts/tasks';

export { TASK_STATUSES, type TaskStatus } from '@teamflow/contracts/tasks';

export type Task = Readonly<{
  id: string;
  ownerId: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  createdAt: string;
  updatedAt: string;
}>;
