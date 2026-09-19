import { afterEach, describe, expect, it, vi } from 'vitest';

import { ApiError, listTasks, createTask, updateTask } from './task.api.ts';
import type { Task, UpdateTaskInput } from './task.types.ts';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('task API', () => {
  it('serializes list parameters into the request URL', async () => {
    const responseBody = {
      data: [],
      meta: {
        page: 2,
        pageSize: 10,
        total: 0,
        totalPages: 0,
      },
    };

    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify(responseBody), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      })
    );

    vi.stubGlobal('fetch', fetchMock);

    const result = await listTasks({
      status: 'done',
      search: 'release plan',
      page: 2,
      pageSize: 10,
    });

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/tasks?status=done&search=release+plan&page=2&pageSize=10',
      {
        headers: {
          Accept: 'application/json',
        },
      }
    );

    expect(result).toEqual(responseBody);
  });

  it('converts an unsuccessful response into ApiError', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          error: {
            code: 'TASK_NOT_FOUND',
            message: 'Task not found',
          },
        }),
        {
          status: 404,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      )
    );

    vi.stubGlobal('fetch', fetchMock);

    try {
      await listTasks();

      expect.unreachable('The request should have failed');
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
      expect(error).toMatchObject({
        name: 'ApiError',
        statusCode: 404,
        code: 'TASK_NOT_FOUND',
        message: 'Task not found',
      });
    }
  });

  it('creates a task with a JSON request', async () => {
    const input = {
      title: 'Create tasks from React',
      description: 'Submit the controlled form',
    };

    const createdTask = {
      id: '00000000-0000-4000-8000-000000000001',
      title: input.title,
      description: input.description,
      status: 'todo',
      createdAt: '2026-09-17T10:00:00.000Z',
      updatedAt: '2026-09-17T10:00:00.000Z',
    } satisfies Task;

    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          data: createdTask,
        }),
        {
          status: 201,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      )
    );

    vi.stubGlobal('fetch', fetchMock);

    const result = await createTask(input);

    expect(fetchMock).toHaveBeenCalledWith('/api/tasks', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(input),
    });

    expect(result).toEqual(createdTask);
  });

  it('updates a task with a JSON PATCH request', async () => {
    const taskId = '00000000-0000-4000-8000-000000000001';

    const input = {
      status: 'in_progress',
    } satisfies UpdateTaskInput;

    const updatedTask = {
      id: taskId,
      title: 'Learn task updates',
      description: null,
      status: input.status,
      createdAt: '2026-09-19T10:00:00.000Z',
      updatedAt: '2026-09-19T11:00:00.000Z',
    } satisfies Task;

    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          data: updatedTask,
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      )
    );

    vi.stubGlobal('fetch', fetchMock);

    const result = await updateTask(taskId, input);

    expect(fetchMock).toHaveBeenCalledOnce();

    expect(fetchMock).toHaveBeenCalledWith(`/api/tasks/${taskId}`, {
      method: 'PATCH',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(input),
    });

    expect(result).toEqual(updatedTask);
  });
});
