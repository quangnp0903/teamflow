import { useEffect, useState } from 'react';

import {
  listWorkspaces,
  createWorkspace as createWorkspaceRequest,
} from './workspace.api';
import type {
  WorkspaceWithRole,
  CreateWorkspaceInput,
} from './workspace.types';

type UseWorkspacesResult = Readonly<{
  workspaces: readonly WorkspaceWithRole[];
  isLoading: boolean;
  errorMessage: string | null;
  refreshWorkspaces(): void;
  createWorkspace(input: CreateWorkspaceInput): Promise<void>;
}>;

function useWorkspaces(): UseWorkspacesResult {
  const [workspaces, setWorkspaces] = useState<readonly WorkspaceWithRole[]>(
    []
  );
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [refreshVersion, setRefreshVersion] = useState(0);

  function refreshWorkspaces(): void {
    setIsLoading(true);
    setErrorMessage(null);
    setRefreshVersion((currentVersion) => currentVersion + 1);
  }

  async function createWorkspace(input: CreateWorkspaceInput): Promise<void> {
    await createWorkspaceRequest(input);
    refreshWorkspaces();
  }

  useEffect(() => {
    let isCurrent = true;
    const controller = new AbortController();

    async function loadWorkspaces(): Promise<void> {
      try {
        const loadedWorkspaces = await listWorkspaces(controller.signal);

        if (isCurrent) {
          setWorkspaces(loadedWorkspaces);
        }
      } catch (error) {
        if (isCurrent) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : 'Workspaces could not be loaded'
          );
        }
      } finally {
        if (isCurrent) {
          setIsLoading(false);
        }
      }
    }

    void loadWorkspaces();

    return () => {
      isCurrent = false;
      controller.abort();
    };
  }, [refreshVersion]);

  return {
    workspaces,
    isLoading,
    errorMessage,
    refreshWorkspaces,
    createWorkspace,
  };
}

export default useWorkspaces;
