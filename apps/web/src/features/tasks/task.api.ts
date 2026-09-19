import type {
  ListTasksParams,
  TaskPage,
  CreateTaskInput,
  Task,
  TaskResponse,
  UpdateTaskInput,
} from './task.types';

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

type JsonRequestInit = Omit<RequestInit, 'headers'> & {
  headers?: Readonly<Record<string, string>>;
};

async function request<T>(url: string, init: JsonRequestInit = {}): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      Accept: 'application/json',
      ...init.headers,
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

export async function createTask(input: CreateTaskInput): Promise<Task> {
  const response = await request<TaskResponse>('/api/tasks', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });

  return response.data;
}

export async function updateTask(
  taskId: string,
  input: UpdateTaskInput
): Promise<Task> {
  const response = await request<TaskResponse>(
    `/api/tasks/${encodeURIComponent(taskId)}`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(input),
    }
  );

  return response.data;
}
