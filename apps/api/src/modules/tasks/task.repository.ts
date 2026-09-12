import type { Task, TaskStatus } from './task.model.ts';

export type CreateTaskRecord = {
  title: string;
  description: string | null;
  status: TaskStatus;
};

export interface TaskRepository {
  list(): Promise<readonly Task[]>;
  create(input: CreateTaskRecord): Promise<Task>;
}
