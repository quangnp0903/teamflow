import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthContext, type AuthContextValue } from '../../auth/auth.context';

import { createWorkspace, listWorkspaces } from '../api/workspace.api';
import type { Workspace, WorkspaceWithRole } from '../workspace.types';
import WorkspacesPage from './WorkspacesPage';

vi.mock('../api/workspace.api', () => ({
  createWorkspace: vi.fn(),
  listWorkspaces: vi.fn(),
}));

const createWorkspaceMock = vi.mocked(createWorkspace);
const listWorkspacesMock = vi.mocked(listWorkspaces);

const TEST_WORKSPACE = {
  id: '00000000-0000-4000-8000-000000000001',
  name: 'Product team',
  createdAt: '2026-10-14T10:00:00.000Z',
  updatedAt: '2026-10-14T10:00:00.000Z',
} satisfies Workspace;

const LISTED_WORKSPACE = {
  ...TEST_WORKSPACE,
  role: 'owner',
} satisfies WorkspaceWithRole;

function renderWorkspacesPage() {
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

  return render(
    <AuthContext value={authContextValue}>
      <WorkspacesPage />
    </AuthContext>,
    { reactStrictMode: false }
  );
}

beforeEach(() => {
  createWorkspaceMock.mockReset();
  listWorkspacesMock.mockReset();
});

describe('WorkspacesPage', () => {
  it('loads an empty list and refreshes it after workspace creation', async () => {
    const user = userEvent.setup();

    listWorkspacesMock
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([LISTED_WORKSPACE]);

    createWorkspaceMock.mockResolvedValue(TEST_WORKSPACE);

    renderWorkspacesPage();

    expect(screen.getByRole('status')).toHaveTextContent('Loading workspaces');

    expect(
      await screen.findByText("You don't belong to any workspaces yet.")
    ).toBeInTheDocument();

    const nameInput = screen.getByRole('textbox', {
      name: 'Workspace name',
    });

    await user.type(nameInput, '  Product team  ');
    await user.click(screen.getByRole('button', { name: 'Create workspace' }));

    expect(
      await screen.findByRole('heading', {
        level: 3,
        name: TEST_WORKSPACE.name,
      })
    ).toBeInTheDocument();

    expect(screen.getByText('Your role: Owner')).toBeInTheDocument();
    expect(createWorkspaceMock).toHaveBeenCalledOnce();
    expect(createWorkspaceMock).toHaveBeenCalledWith({
      name: 'Product team',
    });
    expect(listWorkspacesMock).toHaveBeenCalledTimes(2);

    await waitFor(() => {
      expect(nameInput).toHaveValue('');
    });
  });

  it('recovers from a failed list request when the user retries', async () => {
    const user = userEvent.setup();

    listWorkspacesMock
      .mockRejectedValueOnce(new Error('Workspaces could not be loaded'))
      .mockResolvedValueOnce([LISTED_WORKSPACE]);

    renderWorkspacesPage();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Workspaces could not be loaded'
    );

    await user.click(screen.getByRole('button', { name: 'Try again' }));

    expect(
      await screen.findByRole('heading', {
        level: 3,
        name: TEST_WORKSPACE.name,
      })
    ).toBeInTheDocument();

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(listWorkspacesMock).toHaveBeenCalledTimes(2);
    expect(createWorkspaceMock).not.toHaveBeenCalled();
  });

  it('does not repeat creation when refreshing the list fails', async () => {
    const user = userEvent.setup();

    listWorkspacesMock
      .mockResolvedValueOnce([])
      .mockRejectedValueOnce(new Error('Workspace list could not be refreshed'))
      .mockResolvedValueOnce([LISTED_WORKSPACE]);

    createWorkspaceMock.mockResolvedValue(TEST_WORKSPACE);

    renderWorkspacesPage();

    await screen.findByText("You don't belong to any workspaces yet.");

    const nameInput = screen.getByRole('textbox', {
      name: 'Workspace name',
    });

    await user.type(nameInput, TEST_WORKSPACE.name);
    await user.click(screen.getByRole('button', { name: 'Create workspace' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Workspace list could not be refreshed'
    );

    await waitFor(() => {
      expect(nameInput).toHaveValue('');
    });

    await user.click(screen.getByRole('button', { name: 'Try again' }));

    expect(
      await screen.findByRole('heading', {
        level: 3,
        name: TEST_WORKSPACE.name,
      })
    ).toBeInTheDocument();

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(createWorkspaceMock).toHaveBeenCalledOnce();
    expect(listWorkspacesMock).toHaveBeenCalledTimes(3);
  });
});
