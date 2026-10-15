import { requestJson } from 'src/lib/http';

import type {
  CreateWorkspaceInput,
  Workspace,
  WorkspaceListResponse,
  WorkspaceResponse,
  WorkspaceWithRole,
} from './workspace.types';

export async function listWorkspaces(
  signal?: AbortSignal
): Promise<readonly WorkspaceWithRole[]> {
  const response = await requestJson<WorkspaceListResponse>('/api/workspaces', {
    credentials: 'include',
    signal,
  });

  return response.data;
}

export async function createWorkspace(
  input: CreateWorkspaceInput
): Promise<Workspace> {
  const response = await requestJson<WorkspaceResponse>('/api/workspaces', {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: input.name,
    }),
  });

  return response.data;
}
