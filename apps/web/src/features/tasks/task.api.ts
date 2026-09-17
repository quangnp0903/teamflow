import type { ListTasksParams, TaskPage } from './task.types.ts';

type ErrorResponse = {
  error?: {
    code?: string;
    message?: string;
  };
};

export class ApiError extends Error {
  readonly statusCode: number;
  readonly code: string | undefined;

  constructor(statusCode: number, message: string, code?: string) {
    super(message);

    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

async function request<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    let errorBody: ErrorResponse = {};

    try {
      errorBody = (await response.json()) as ErrorResponse;
    } catch {
      // The server did not return a JSON error body.
    }

    throw new ApiError(
      response.status,
      errorBody.error?.message ?? 'The request failed',
      errorBody.error?.code
    );
  }

  return (await response.json()) as T;
}

export function listTasks(params: ListTasksParams = {}): Promise<TaskPage> {
  const query = new URLSearchParams();

  if (params.status !== undefined) {
    query.set('status', params.status);
  }

  if (params.search !== undefined) {
    query.set('search', params.search);
  }

  if (params.page !== undefined) {
    query.set('page', String(params.page));
  }

  if (params.pageSize !== undefined) {
    query.set('pageSize', String(params.pageSize));
  }

  const queryString = query.toString();
  const url = queryString === '' ? '/api/tasks' : `/api/tasks?${queryString}`;

  return request<TaskPage>(url);
}
