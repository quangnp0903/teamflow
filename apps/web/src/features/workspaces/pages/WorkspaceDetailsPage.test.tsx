import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  AuthContext,
  type AuthContextValue,
} from 'src/features/auth/auth.context';
import { ApiError } from 'src/lib/http';

import { getWorkspace } from '../api/workspace.api';
import { workspaceRoutes } from '../workspace.routes';
import type { WorkspaceWithRole } from '../workspace.types';

vi.mock('../api/workspace.api', () => ({
  getWorkspace: vi.fn(),
  listWorkspaces: vi.fn(),
  createWorkspace: vi.fn(),
}));

const getWorkspaceMock = vi.mocked(getWorkspace);

const TEST_WORKSPACE = {
  id: '00000000-0000-4000-8000-000000000001',
  name: 'Product team',
  role: 'member',
  createdAt: '2026-10-14T10:00:00.000Z',
  updatedAt: '2026-10-14T10:00:00.000Z',
} satisfies WorkspaceWithRole;

const SECOND_WORKSPACE_ID = '00000000-0000-4000-8000-000000000003';

let testRouter: ReturnType<typeof createMemoryRouter> | undefined;

function renderWorkspaceDetails(workspaceId = TEST_WORKSPACE.id) {
  const authContextValue = {
    state: {
      status: 'authenticated',
      user: {
        id: '00000000-0000-4000-8000-000000000002',
        email: 'alice@example.com',
        displayName: 'Alice',
        createdAt: '2026-10-01T00:00:00.000Z',
        updatedAt: '2026-10-01T00:00:00.000Z',
      },
    },
    login: vi.fn().mockResolvedValue(undefined),
    logout: vi.fn().mockResolvedValue(undefined),
    register: vi.fn().mockResolvedValue(undefined),
  } satisfies AuthContextValue;

  const router = createMemoryRouter(
    [
      {
        path: '/workspaces',
        children: workspaceRoutes,
      },
    ],
    {
      initialEntries: [`/workspaces/${workspaceId}`],
    }
  );

  testRouter = router;

  const view = render(
    <AuthContext value={authContextValue}>
      <RouterProvider router={router} />
    </AuthContext>,
    { reactStrictMode: false }
  );

  return { router, ...view };
}

beforeEach(() => {
  getWorkspaceMock.mockReset();
});

afterEach(() => {
  testRouter?.dispose();
  testRouter = undefined;
});

describe('WorkspaceDetailsPage', () => {
  it('loads the workspace from the URL and displays its details', async () => {
    getWorkspaceMock.mockResolvedValue(TEST_WORKSPACE);

    renderWorkspaceDetails();

    expect(screen.getByRole('status')).toHaveTextContent('Loading workspace');

    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: TEST_WORKSPACE.name,
      })
    ).toBeInTheDocument();

    expect(screen.getByText('Member')).toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();

    expect(
      screen.getByRole('link', { name: 'Back to workspaces' })
    ).toHaveAttribute('href', '/workspaces');

    expect(getWorkspaceMock).toHaveBeenCalledOnce();
    expect(getWorkspaceMock).toHaveBeenCalledWith(
      TEST_WORKSPACE.id,
      expect.any(AbortSignal)
    );
  });

  it('shows an unavailable message without retrying a 404', async () => {
    getWorkspaceMock.mockRejectedValue(
      new ApiError(404, 'Workspace not found', 'WORKSPACE_NOT_FOUND')
    );

    renderWorkspaceDetails();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'This workspace does not exist, or you do not have access to it.'
    );

    expect(
      screen.queryByRole('button', { name: 'Try again' })
    ).not.toBeInTheDocument();

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(getWorkspaceMock).toHaveBeenCalledOnce();
  });

  it('recovers from a temporary failure when the user retries', async () => {
    const user = userEvent.setup();

    getWorkspaceMock
      .mockRejectedValueOnce(new Error('Network unavailable'))
      .mockResolvedValueOnce(TEST_WORKSPACE);

    renderWorkspaceDetails();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Network unavailable'
    );

    await user.click(screen.getByRole('button', { name: 'Try again' }));

    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: TEST_WORKSPACE.name,
      })
    ).toBeInTheDocument();

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(getWorkspaceMock).toHaveBeenCalledTimes(2);
  });

  it('resets details on ID changes and aborts requests during cleanup', async () => {
    getWorkspaceMock
      .mockResolvedValueOnce(TEST_WORKSPACE)
      .mockImplementationOnce(
        () =>
          new Promise<WorkspaceWithRole>(() => {
            // Keep the second request pending to inspect loading and cleanup.
          })
      );

    const { router, unmount } = renderWorkspaceDetails();

    await screen.findByRole('heading', {
      level: 1,
      name: TEST_WORKSPACE.name,
    });

    const firstSignal = getWorkspaceMock.mock.calls[0]?.[1];

    await act(async () => {
      await router.navigate(`/workspaces/${SECOND_WORKSPACE_ID}`);
    });

    expect(screen.getByRole('status')).toHaveTextContent('Loading workspace');

    expect(
      screen.queryByRole('heading', {
        level: 1,
        name: TEST_WORKSPACE.name,
      })
    ).not.toBeInTheDocument();

    expect(getWorkspaceMock).toHaveBeenLastCalledWith(
      SECOND_WORKSPACE_ID,
      expect.any(AbortSignal)
    );

    expect(firstSignal?.aborted).toBe(true);

    const secondSignal = getWorkspaceMock.mock.calls[1]?.[1];

    expect(secondSignal?.aborted).toBe(false);

    unmount();

    expect(secondSignal?.aborted).toBe(true);
  });
});
