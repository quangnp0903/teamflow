import { describe, expect, it } from 'vitest';

import { InMemoryTaskRepository } from './in-memory-task.repository.ts';
import { TaskService } from './task.service.ts';

const OWNER_ID = '00000000-0000-4000-8000-000000000001';

describe('TaskService', () => {
  it('applies server-owned defaults when creating a task', async () => {
    const repository = new InMemoryTaskRepository();
    const service = new TaskService(repository);

    const task = await service.createTask(OWNER_ID, {
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

    const createdTask = await service.createTask(OWNER_ID, {
      title: 'Learn test boundaries',
      description: 'Compare service and HTTP tests',
    });

    await service.createTask('00000000-0000-4000-8000-000000000002', {
      title: 'Another user’s task',
    });

    const tasks = await service.listTasks(OWNER_ID, { page: 1, pageSize: 20 });

    expect(tasks).toEqual({ items: [createdTask], total: 1 });
  });

  it('throws a typed error when a task does not exist', async () => {
    const repository = new InMemoryTaskRepository();
    const service = new TaskService(repository);

    await expect(
      service.getTaskById(OWNER_ID, '00000000-0000-4000-8000-000000000000')
    ).rejects.toMatchObject({
      name: 'AppError',
      statusCode: 404,
      code: 'TASK_NOT_FOUND',
      message: 'Task not found',
    });
  });

  it('throws a typed error when deleting a missing task', async () => {
    const repository = new InMemoryTaskRepository();
    const service = new TaskService(repository);

    await expect(
      service.deleteTask(OWNER_ID, '00000000-0000-4000-8000-000000000000')
    ).rejects.toMatchObject({
      name: 'AppError',
      statusCode: 404,
      code: 'TASK_NOT_FOUND',
      message: 'Task not found',
    });
  });
});
