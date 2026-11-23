import { requestJson } from 'src/lib/http';

import type {
  CreateWorkspaceTaskInput,
  ListWorkspaceTasksParams,
  WorkspaceTask,
  WorkspaceTaskPage,
} from '../workspace-task.types';

function collectionPath(workspaceId: string): string {
  return `/api/workspaces/${encodeURIComponent(workspaceId)}/tasks`;
}

export function listWorkspaceTasks(
  workspaceId: string,
  params: ListWorkspaceTasksParams = {},
  signal?: AbortSignal
): Promise<WorkspaceTaskPage> {
  const query = new URLSearchParams();

  if (params.page !== undefined) {
    query.set('page', String(params.page));
  }

  if (params.pageSize !== undefined) {
    query.set('pageSize', String(params.pageSize));
  }

  const queryString = query.toString();
  const path = collectionPath(workspaceId);
  const url = queryString === '' ? path : `${path}?${queryString}`;

  return requestJson<WorkspaceTaskPage>(url, {
    credentials: 'include',
    signal,
  });
}

export async function createWorkspaceTask(
  workspaceId: string,
  input: CreateWorkspaceTaskInput
): Promise<WorkspaceTask> {
  const response = await requestJson<Readonly<{ data: WorkspaceTask }>>(
    collectionPath(workspaceId),
    {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: input.title,
        description: input.description ?? null,
      }),
    }
  );

  return response.data;
}
