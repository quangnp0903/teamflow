import { useEffect, useState } from 'react';

import { ApiError } from 'src/lib/http';

import type { WorkspaceMemberSummary } from '../workspace.types';
import { listWorkspaceMembers } from '../api/workspace.api';

type WorkspaceMembersState =
  | Readonly<{ status: 'loading' }>
  | Readonly<{
      status: 'success';
      members: readonly WorkspaceMemberSummary[];
    }>
  | Readonly<{ status: 'not-found' }>
  | Readonly<{
      status: 'error';
      message: string;
    }>;

function useWorkspaceMembers(workspaceId: string) {
  const [state, setState] = useState<WorkspaceMembersState>({
    status: 'loading',
  });
  const [refreshVersion, setRefreshVersion] = useState(0);

  function retry(): void {
    setState({ status: 'loading' });
    setRefreshVersion((currentVersion) => currentVersion + 1);
  }

  useEffect(() => {
    let isCurrent = true;
    const controller = new AbortController();

    async function loadMembers(): Promise<void> {
      try {
        const members = await listWorkspaceMembers(
          workspaceId,
          controller.signal
        );

        if (isCurrent) {
          setState({
            status: 'success',
            members,
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
              : 'Workspace members could not be loaded',
        });
      }
    }

    void loadMembers();

    return () => {
      isCurrent = false;
      controller.abort();
    };
  }, [workspaceId, refreshVersion]);

  return { state, retry };
}

export default useWorkspaceMembers;
