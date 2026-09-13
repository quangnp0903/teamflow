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

export interface TaskRepository {
  list(): Promise<readonly Task[]>;
  findById(id: string): Promise<Task | null>;
  create(input: CreateTaskRecord): Promise<Task>;
  update(id: string, input: UpdateTaskRecord): Promise<Task | null>;
}
