import type {
  ListTasksParams,
  TaskPage,
  CreateTaskInput,
  Task,
  TaskResponse,
  UpdateTaskInput,
} from './task.types';

import { request, requestJson } from '../../lib/http';

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

  return requestJson<TaskPage>(url);
}

export async function createTask(input: CreateTaskInput): Promise<Task> {
  const response = await requestJson<TaskResponse>('/api/tasks', {
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
  const response = await requestJson<TaskResponse>(
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

export async function deleteTask(taskId: string): Promise<void> {
  await request(`/api/tasks/${encodeURIComponent(taskId)}`, {
    method: 'DELETE',
  });
}
