import { useEffect, useState } from 'react';

import { ApiError } from 'src/lib/http';

import {
  getWorkspace,
  renameWorkspace as renameWorkspaceRequest,
} from '../api/workspace.api';
import type {
  WorkspaceWithRole,
  RenameWorkspaceInput,
} from '../workspace.types';

type WorkspaceState =
  | Readonly<{ status: 'loading' }>
  | Readonly<{
      status: 'success';
      workspace: WorkspaceWithRole;
    }>
  | Readonly<{ status: 'not-found' }>
  | Readonly<{
      status: 'error';
      message: string;
    }>;

function useWorkspace(workspaceId: string) {
  const [state, setState] = useState<WorkspaceState>({
    status: 'loading',
  });
  const [refreshVersion, setRefreshVersion] = useState(0);

  function retry(): void {
    setState({ status: 'loading' });
    setRefreshVersion((currentVersion) => currentVersion + 1);
  }

  async function renameWorkspace(input: RenameWorkspaceInput): Promise<void> {
    const updatedWorkspace = await renameWorkspaceRequest(workspaceId, input);

    setState((currentState) => {
      if (
        currentState.status !== 'success' ||
        currentState.workspace.id !== updatedWorkspace.id
      ) {
        return currentState;
      }

      return {
        status: 'success',
        workspace: {
          ...updatedWorkspace,
          role: currentState.workspace.role,
        },
      };
    });
  }

  useEffect(() => {
    let isCurrent = true;
    const controller = new AbortController();

    async function loadWorkspace(): Promise<void> {
      try {
        const workspace = await getWorkspace(workspaceId, controller.signal);

        if (isCurrent) {
          setState({
            status: 'success',
            workspace,
          });
        }
      } catch (error) {
        if (!isCurrent) {
          return;
        }

        if (error instanceof ApiError && error.statusCode === 404) {
          setState({ status: 'not-found' });
          return;
        }

        setState({
          status: 'error',
          message:
            error instanceof Error
              ? error.message
              : 'Workspace could not be loaded',
        });
      }
    }

    void loadWorkspace();

    return () => {
      isCurrent = false;
      controller.abort();
    };
  }, [workspaceId, refreshVersion]);

  return { state, retry, renameWorkspace };
}

export default useWorkspace;
