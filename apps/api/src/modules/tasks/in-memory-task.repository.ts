import { randomUUID } from 'node:crypto';

import type { Task } from './task.model.ts';
import type { CreateTaskRecord, TaskRepository } from './task.repository.ts';

export class InMemoryTaskRepository implements TaskRepository {
  private readonly tasks: Task[] = [];

  async list(): Promise<readonly Task[]> {
    return [...this.tasks];
  }

  async create(input: CreateTaskRecord): Promise<Task> {
    const now = new Date().toISOString();

    const task: Task = {
      id: randomUUID(),
      ...input,
      createdAt: now,
      updatedAt: now,
    };

    this.tasks.push(task);

    return task;
  }
}
