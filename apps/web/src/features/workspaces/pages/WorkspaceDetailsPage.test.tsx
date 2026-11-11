import { act, render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  AuthContext,
  type AuthContextValue,
} from 'src/features/auth/auth.context';
import { ApiError } from 'src/lib/http';

import {
  getWorkspace,
  listWorkspaceMembers,
  renameWorkspace,
  addWorkspaceMember,
} from '../api/workspace.api';
import { workspaceRoutes } from '../workspace.routes';
import type {
  Workspace,
  WorkspaceMemberSummary,
  WorkspaceWithRole,
} from '../workspace.types';

vi.mock('../api/workspace.api', () => ({
  getWorkspace: vi.fn(),
  listWorkspaces: vi.fn(),
  createWorkspace: vi.fn(),
  listWorkspaceMembers: vi.fn(),
  renameWorkspace: vi.fn(),
  addWorkspaceMember: vi.fn(),
  updateWorkspaceMemberRole: vi.fn(),
}));

const getWorkspaceMock = vi.mocked(getWorkspace);
const listWorkspaceMembersMock = vi.mocked(listWorkspaceMembers);
const renameWorkspaceMock = vi.mocked(renameWorkspace);
const addWorkspaceMemberMock = vi.mocked(addWorkspaceMember);

const TEST_WORKSPACE = {
  id: '00000000-0000-4000-8000-000000000001',
  name: 'Product team',
  role: 'member',
  createdAt: '2026-10-14T10:00:00.000Z',
  updatedAt: '2026-10-14T10:00:00.000Z',
} satisfies WorkspaceWithRole;

const RENAMED_WORKSPACE = {
  id: TEST_WORKSPACE.id,
  name: 'Platform team',
  createdAt: TEST_WORKSPACE.createdAt,
  updatedAt: '2026-10-27T10:00:00.000Z',
} satisfies Workspace;

const TEST_MEMBERS = [
  {
    id: '00000000-0000-4000-8000-000000000011',
    userId: '00000000-0000-4000-8000-000000000002',
    displayName: 'Alice',
    role: 'owner',
    joinedAt: '2026-10-20T10:00:00.000Z',
  },
  {
    id: '00000000-0000-4000-8000-000000000012',
    userId: '00000000-0000-4000-8000-000000000004',
    displayName: 'Bob',
    role: 'member',
    joinedAt: '2026-10-20T11:00:00.000Z',
  },
] satisfies readonly WorkspaceMemberSummary[];

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

const ADDED_MEMBER = {
  id: '00000000-0000-4000-8000-000000000013',
  userId: '00000000-0000-4000-8000-000000000005',
  displayName: 'Carol',
  role: 'member',
  joinedAt: '2026-11-03T10:00:00.000Z',
} satisfies WorkspaceMemberSummary;

async function renderMemberForm(role: 'owner' | 'admin' = 'owner') {
  getWorkspaceMock.mockResolvedValue({
    ...TEST_WORKSPACE,
    role,
  });

  listWorkspaceMembersMock.mockResolvedValue(TEST_MEMBERS);

  renderWorkspaceDetails();

  return screen.findByRole('form', {
    name: 'Add a member',
  });
}

beforeEach(() => {
  getWorkspaceMock.mockReset();
  listWorkspaceMembersMock.mockReset().mockResolvedValue([]);
  renameWorkspaceMock.mockReset();
  addWorkspaceMemberMock.mockReset();
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

    const details = screen.getByRole('region', {
      name: 'Workspace details',
    });

    expect(within(details).getByText('Member')).toBeInTheDocument();

    expect(within(details).queryByRole('status')).not.toBeInTheDocument();

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

  it('displays workspace members and their roles', async () => {
    getWorkspaceMock.mockResolvedValue(TEST_WORKSPACE);
    listWorkspaceMembersMock.mockResolvedValue(TEST_MEMBERS);

    renderWorkspaceDetails();

    const members = await screen.findByRole('region', {
      name: 'Members',
    });

    const roster = await within(members).findByRole('list', {
      name: 'Workspace members',
    });

    const cards = within(roster).getAllByRole('listitem');

    expect(cards).toHaveLength(2);

    for (const card of cards) {
      const member = within(card);

      if (member.queryByText('Alice')) {
        expect(member.getByText('Owner')).toBeInTheDocument();
      } else {
        expect(member.getByText('Bob')).toBeInTheDocument();
        expect(member.getByText('Member')).toBeInTheDocument();
      }
    }

    expect(within(roster).getByText('Alice')).toBeInTheDocument();
    expect(within(roster).getByText('Bob')).toBeInTheDocument();
    expect(within(members).queryByRole('status')).not.toBeInTheDocument();

    expect(listWorkspaceMembersMock).toHaveBeenCalledOnce();
    expect(listWorkspaceMembersMock).toHaveBeenCalledWith(
      TEST_WORKSPACE.id,
      expect.any(AbortSignal)
    );
  });

  it('retries member loading without reloading workspace details', async () => {
    const user = userEvent.setup();

    getWorkspaceMock.mockResolvedValue(TEST_WORKSPACE);
    listWorkspaceMembersMock
      .mockRejectedValueOnce(new Error('Members could not be loaded'))
      .mockResolvedValueOnce(TEST_MEMBERS);

    renderWorkspaceDetails();

    const members = await screen.findByRole('region', {
      name: 'Members',
    });

    expect(await within(members).findByRole('alert')).toHaveTextContent(
      'Members could not be loaded'
    );

    expect(
      screen.getByRole('heading', {
        level: 1,
        name: TEST_WORKSPACE.name,
      })
    ).toBeInTheDocument();

    await user.click(
      within(members).getByRole('button', { name: 'Retry members' })
    );

    expect(await within(members).findByText('Alice')).toBeInTheDocument();
    expect(within(members).getByText('Bob')).toBeInTheDocument();
    expect(within(members).queryByRole('alert')).not.toBeInTheDocument();
    expect(
      within(members).queryByRole('button', { name: 'Retry members' })
    ).not.toBeInTheDocument();

    expect(listWorkspaceMembersMock).toHaveBeenCalledTimes(2);
    expect(getWorkspaceMock).toHaveBeenCalledOnce();
  });

  it.each([
    { role: 'owner', roleLabel: 'Owner' },
    { role: 'admin', roleLabel: 'Admin' },
  ] as const)(
    'lets an $role rename the workspace while preserving their role',
    async ({ role, roleLabel }) => {
      const user = userEvent.setup();

      getWorkspaceMock.mockResolvedValue({
        ...TEST_WORKSPACE,
        role,
      });
      renameWorkspaceMock.mockResolvedValue(RENAMED_WORKSPACE);

      renderWorkspaceDetails();

      const renamePanel = await screen.findByRole('region', {
        name: 'Rename workspace',
      });

      const nameInput = within(renamePanel).getByRole('textbox', {
        name: 'Workspace name',
      });

      expect(nameInput).toHaveValue(TEST_WORKSPACE.name);

      await user.clear(nameInput);
      await user.type(nameInput, '  Platform team  ');
      await user.click(
        within(renamePanel).getByRole('button', {
          name: 'Save changes',
        })
      );

      expect(
        await screen.findByRole('heading', {
          level: 1,
          name: RENAMED_WORKSPACE.name,
        })
      ).toBeInTheDocument();

      expect(renameWorkspaceMock).toHaveBeenCalledOnce();
      expect(renameWorkspaceMock).toHaveBeenCalledWith(TEST_WORKSPACE.id, {
        name: 'Platform team',
      });

      const details = screen.getByRole('region', {
        name: 'Workspace details',
      });

      expect(within(details).getByText(roleLabel)).toBeInTheDocument();

      await waitFor(() => {
        expect(nameInput).toHaveValue(RENAMED_WORKSPACE.name);
      });

      expect(await within(renamePanel).findByRole('status')).toHaveTextContent(
        'Workspace name saved.'
      );
    }
  );

  it('hides the rename form from regular members', async () => {
    getWorkspaceMock.mockResolvedValue(TEST_WORKSPACE);

    renderWorkspaceDetails();

    await screen.findByRole('heading', {
      level: 1,
      name: TEST_WORKSPACE.name,
    });

    expect(
      screen.queryByRole('region', { name: 'Rename workspace' })
    ).not.toBeInTheDocument();

    expect(renameWorkspaceMock).not.toHaveBeenCalled();
  });

  it('preserves the draft after failure and allows a successful retry', async () => {
    const user = userEvent.setup();

    getWorkspaceMock.mockResolvedValue({
      ...TEST_WORKSPACE,
      role: 'owner',
    });

    renameWorkspaceMock
      .mockRejectedValueOnce(new Error('Network unavailable'))
      .mockResolvedValueOnce(RENAMED_WORKSPACE);

    renderWorkspaceDetails();

    const renamePanel = await screen.findByRole('region', {
      name: 'Rename workspace',
    });

    const nameInput = within(renamePanel).getByRole('textbox', {
      name: 'Workspace name',
    });

    const saveButton = within(renamePanel).getByRole('button', {
      name: 'Save changes',
    });

    await user.clear(nameInput);
    await user.type(nameInput, 'Platform team');
    await user.click(saveButton);

    expect(await within(renamePanel).findByRole('alert')).toHaveTextContent(
      'Network unavailable'
    );

    expect(nameInput).toHaveValue('Platform team');

    expect(
      screen.getByRole('heading', {
        level: 1,
        name: TEST_WORKSPACE.name,
      })
    ).toBeInTheDocument();

    await waitFor(() => {
      expect(saveButton).toBeEnabled();
    });

    await user.click(saveButton);

    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: RENAMED_WORKSPACE.name,
      })
    ).toBeInTheDocument();

    expect(await within(renamePanel).findByRole('status')).toHaveTextContent(
      'Workspace name saved.'
    );

    expect(within(renamePanel).queryByRole('alert')).not.toBeInTheDocument();

    expect(renameWorkspaceMock).toHaveBeenCalledTimes(2);
    expect(renameWorkspaceMock).toHaveBeenLastCalledWith(TEST_WORKSPACE.id, {
      name: 'Platform team',
    });
  });

  it.each(['owner', 'admin'] as const)(
    'lets an %s add a member and updates the roster',
    async (role) => {
      const user = userEvent.setup();

      addWorkspaceMemberMock.mockResolvedValue(ADDED_MEMBER);

      const form = await renderMemberForm(role);
      const emailInput = within(form).getByRole('textbox', {
        name: 'Member email',
      });

      await user.type(emailInput, '  CAROL@EXAMPLE.COM  ');
      await user.click(
        within(form).getByRole('button', { name: 'Add member' })
      );

      expect(await within(form).findByRole('status')).toHaveTextContent(
        'Member added.'
      );

      expect(addWorkspaceMemberMock).toHaveBeenCalledOnce();
      expect(addWorkspaceMemberMock).toHaveBeenCalledWith(TEST_WORKSPACE.id, {
        email: 'carol@example.com',
      });

      expect(emailInput).toHaveValue('');

      const roster = screen.getByRole('list', {
        name: 'Workspace members',
      });

      expect(within(roster).getAllByRole('listitem')).toHaveLength(3);
      expect(within(roster).getByText('Alice')).toBeInTheDocument();
      expect(within(roster).getByText('Bob')).toBeInTheDocument();
      expect(within(roster).getByText('Carol')).toBeInTheDocument();
    }
  );

  it('hides the add-member form from regular members', async () => {
    getWorkspaceMock.mockResolvedValue(TEST_WORKSPACE);
    listWorkspaceMembersMock.mockResolvedValue(TEST_MEMBERS);

    renderWorkspaceDetails();

    await screen.findByRole('list', {
      name: 'Workspace members',
    });

    expect(
      screen.queryByRole('form', { name: 'Add a member' })
    ).not.toBeInTheDocument();

    expect(addWorkspaceMemberMock).not.toHaveBeenCalled();
  });

  it('preserves the email and roster after failure and allows retry', async () => {
    const user = userEvent.setup();

    addWorkspaceMemberMock
      .mockRejectedValueOnce(new Error('Network unavailable'))
      .mockResolvedValueOnce(ADDED_MEMBER);

    const form = await renderMemberForm();
    const emailInput = within(form).getByRole('textbox', {
      name: 'Member email',
    });
    const addButton = within(form).getByRole('button', {
      name: 'Add member',
    });

    await user.type(emailInput, 'carol@example.com');
    await user.click(addButton);

    expect(await within(form).findByRole('alert')).toHaveTextContent(
      'Network unavailable'
    );

    expect(emailInput).toHaveValue('carol@example.com');

    const roster = screen.getByRole('list', {
      name: 'Workspace members',
    });

    expect(within(roster).getAllByRole('listitem')).toHaveLength(2);
    expect(within(roster).queryByText('Carol')).not.toBeInTheDocument();

    await waitFor(() => {
      expect(addButton).toBeEnabled();
    });

    await user.click(addButton);

    expect(await within(form).findByRole('status')).toHaveTextContent(
      'Member added.'
    );

    expect(within(form).queryByRole('alert')).not.toBeInTheDocument();
    expect(emailInput).toHaveValue('');
    expect(within(roster).getAllByRole('listitem')).toHaveLength(3);
    expect(within(roster).getByText('Carol')).toBeInTheDocument();

    expect(addWorkspaceMemberMock).toHaveBeenCalledTimes(2);
    expect(addWorkspaceMemberMock).toHaveBeenLastCalledWith(TEST_WORKSPACE.id, {
      email: 'carol@example.com',
    });
  });

  it('rejects an invalid email before calling the API', async () => {
    const user = userEvent.setup();

    const form = await renderMemberForm();
    const emailInput = within(form).getByRole('textbox', {
      name: 'Member email',
    });

    await user.type(emailInput, 'not-an-email');
    await user.click(within(form).getByRole('button', { name: 'Add member' }));

    expect(await within(form).findByRole('alert')).toHaveTextContent(
      'Enter a valid email address'
    );

    expect(emailInput).toHaveAttribute('aria-invalid', 'true');
    expect(emailInput).toHaveValue('not-an-email');
    expect(addWorkspaceMemberMock).not.toHaveBeenCalled();
  });
});
