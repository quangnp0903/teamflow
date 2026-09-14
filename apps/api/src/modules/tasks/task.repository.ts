import type { Task, TaskStatus } from './task.model.ts';

export type CreateTaskRecord = {
  title: string;
  description: string | null;
  status: TaskStatus;
};

export type UpdateTaskRecord = {
  title?: string;
  description?: string | null;
  status?: TaskStatus;
};

export type ListTasksQuery = {
  readonly status?: TaskStatus | undefined;
  readonly search?: string | undefined;
  readonly page: number;
  readonly pageSize: number;
};

export type TaskPage = {
  readonly items: readonly Task[];
  readonly total: number;
};

export interface TaskRepository {
  list(query: ListTasksQuery): Promise<TaskPage>;
  findById(id: string): Promise<Task | null>;
  create(input: CreateTaskRecord): Promise<Task>;
  update(id: string, input: UpdateTaskRecord): Promise<Task | null>;
}
