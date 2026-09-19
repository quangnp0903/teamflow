export const TASK_STATUSES = ['todo', 'in_progress', 'done'] as const;

export type TaskStatus = (typeof TASK_STATUSES)[number];

export type Task = Readonly<{
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  createdAt: string;
  updatedAt: string;
}>;

export type TaskPage = Readonly<{
  data: readonly Task[];
  meta: Readonly<{
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  }>;
}>;

export type ListTasksParams = Readonly<{
  status?: TaskStatus;
  search?: string;
  page?: number;
  pageSize?: number;
}>;

export type CreateTaskInput = Readonly<{
  title: string;
  description?: string | null;
}>;

export type TaskResponse = Readonly<{
  data: Task;
}>;
