import { afterEach, describe, expect, it, vi } from 'vitest';

import { ApiError, listTasks } from './task.api.ts';

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
});
