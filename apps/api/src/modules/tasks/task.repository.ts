import type { Task, TaskStatus } from './task.model.ts';

export type CreateTaskRecord = {
  ownerId: string;
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
  list(ownerId: string, query: ListTasksQuery): Promise<TaskPage>;
  findById(ownerId: string, id: string): Promise<Task | null>;
  create(input: CreateTaskRecord): Promise<Task>;
  update(
    ownerId: string,
    id: string,
    input: UpdateTaskRecord
  ): Promise<Task | null>;
  delete(ownerId: string, id: string): Promise<boolean>;
}
