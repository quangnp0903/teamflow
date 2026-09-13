import { randomUUID } from 'node:crypto';

import type { Task } from './task.model.ts';
import type {
  CreateTaskRecord,
  TaskRepository,
  UpdateTaskRecord,
} from './task.repository.ts';

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

  async update(id: string, input: UpdateTaskRecord): Promise<Task | null> {
    const index = this.tasks.findIndex((task) => task.id === id);
    const currentTask = this.tasks[index];

    if (currentTask === undefined) {
      return null;
    }

    const updateTask: Task = {
      ...currentTask,
      ...input,
      updatedAt: new Date().toISOString(),
    };

    this.tasks[index] = updateTask;

    return updateTask;
  }

  async findById(id: string): Promise<Task | null> {
    return this.tasks.find((task) => task.id === id) ?? null;
  }
}
