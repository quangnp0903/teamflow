import { describe, expect, it } from 'vitest';

import { InMemoryTaskRepository } from './in-memory-task.repository.ts';
import { TaskService } from './task.service.ts';

describe('TaskService', () => {
  it('applies server-owned defaults when creating a task', async () => {
    const repository = new InMemoryTaskRepository();
    const service = new TaskService(repository);

    const task = await service.createTask({
      title: 'Write backend tests',
    });

    expect(task).toMatchObject({
      title: 'Write backend tests',
      description: null,
      status: 'todo',
    });

    expect(task.id).toEqual(expect.any(String));
    expect(task.createdAt).toEqual(expect.any(String));
    expect(task.updatedAt).toEqual(expect.any(String));
  });

  it('returns tasks stored in the repository', async () => {
    const repository = new InMemoryTaskRepository();
    const service = new TaskService(repository);

    const createdTask = await service.createTask({
      title: 'Learn test boundaries',
      description: 'Compare service and HTTP tests',
    });

    const tasks = await service.listTasks();

    expect(tasks).toEqual([createdTask]);
  });
});
