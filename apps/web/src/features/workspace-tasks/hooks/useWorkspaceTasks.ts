import { useEffect, useState } from 'react';

import { ApiError } from 'src/lib/http';

import {
  createWorkspaceTask as createWorkspaceTaskRequest,
  listWorkspaceTasks,
} from '../api/workspace-task.api';
import type {
  CreateWorkspaceTaskInput,
  WorkspaceTaskPage,
} from '../workspace-task.types';

type WorkspaceTasksState =
  | Readonly<{ status: 'loading' }>
  | Readonly<{
      status: 'success';
      result: WorkspaceTaskPage;
    }>
  | Readonly<{ status: 'not-found' }>
  | Readonly<{
      status: 'error';
      message: string;
    }>;

const PAGE_SIZE = 10;

function useWorkspaceTasks(workspaceId: string) {
  const [state, setState] = useState<WorkspaceTasksState>({
    status: 'loading',
  });
  const [page, setPage] = useState(1);
  const [refreshVersion, setRefreshVersion] = useState(0);

  function refresh(nextPage = page): void {
    setState({ status: 'loading' });
    setPage(nextPage);
    setRefreshVersion((currentVersion) => currentVersion + 1);
  }

  function retry(): void {
    refresh();
  }

  function changePage(nextPage: number): void {
    if (nextPage !== page) {
      refresh(nextPage);
    }
  }

  async function createTask(input: CreateWorkspaceTaskInput): Promise<void> {
    await createWorkspaceTaskRequest(workspaceId, input);
    refresh(1);
  }

  useEffect(() => {
    let isCurrent = true;
    const controller = new AbortController();

    async function loadTasks(): Promise<void> {
      try {
        const result = await listWorkspaceTasks(
          workspaceId,
          { page, pageSize: PAGE_SIZE },
          controller.signal
        );

        if (!isCurrent) {
          return;
        }

        const lastPage = Math.max(result.meta.totalPages, 1);

        if (page > lastPage) {
          setPage(lastPage);
          return;
        }

        setState({ status: 'success', result });
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
              : 'Workspace tasks could not be loaded',
        });
      }
    }

    void loadTasks();

    return () => {
      isCurrent = false;
      controller.abort();
    };
  }, [workspaceId, page, refreshVersion]);

  return { state, retry, changePage, createTask };
}

export default useWorkspaceTasks;
