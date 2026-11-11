import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  listWorkspaceMembers,
  updateWorkspaceMemberRole,
} from '../../api/workspace.api';
import type {
  WorkspaceMemberSummary,
  WorkspaceRole,
} from '../../workspace.types';
import WorkspaceMembersPanel from './WorkspaceMembersPanel';

vi.mock('../../api/workspace.api', () => ({
  listWorkspaceMembers: vi.fn(),
  addWorkspaceMember: vi.fn(),
  updateWorkspaceMemberRole: vi.fn(),
}));

const listMembersMock = vi.mocked(listWorkspaceMembers);
const updateRoleMock = vi.mocked(updateWorkspaceMemberRole);

const WORKSPACE_ID = '00000000-0000-4000-8000-000000000001';

const OWNER_MEMBER = {
  id: '00000000-0000-4000-8000-000000000011',
  userId: '00000000-0000-4000-8000-000000000002',
  displayName: 'Alice',
  role: 'owner',
  joinedAt: '2026-10-20T10:00:00.000Z',
} satisfies WorkspaceMemberSummary;

const TARGET_MEMBER = {
  id: '00000000-0000-4000-8000-000000000012',
  userId: '00000000-0000-4000-8000-000000000004',
  displayName: 'Bob',
  role: 'member',
  joinedAt: '2026-10-20T11:00:00.000Z',
} satisfies WorkspaceMemberSummary;

const OTHER_MEMBER = {
  ...TARGET_MEMBER,
  id: '00000000-0000-4000-8000-000000000013',
  userId: '00000000-0000-4000-8000-000000000005',
  displayName: 'Carol',
} satisfies WorkspaceMemberSummary;

const PROMOTED_MEMBER = {
  ...TARGET_MEMBER,
  role: 'admin',
} satisfies WorkspaceMemberSummary;

beforeEach(() => {
  listMembersMock
    .mockReset()
    .mockResolvedValue([OWNER_MEMBER, TARGET_MEMBER, OTHER_MEMBER]);

  updateRoleMock.mockReset();
});

async function renderMembers(requesterRole: WorkspaceRole = 'owner') {
  render(
    <WorkspaceMembersPanel
      workspaceId={WORKSPACE_ID}
      requesterRole={requesterRole}
    />,
    { reactStrictMode: false }
  );

  return screen.findByRole('list', {
    name: 'Workspace members',
  });
}

function getMemberCard(roster: HTMLElement, displayName: string) {
  const card = within(roster)
    .getAllByRole('listitem')
    .find((item) => within(item).queryByText(displayName) !== null);

  if (card === undefined) {
    throw new Error(`Missing member card for ${displayName}`);
  }

  return card;
}

describe('WorkspaceMembersPanel role management', () => {
  it('lets an owner promote and demote a member while protecting owner controls', async () => {
    const user = userEvent.setup();

    updateRoleMock
      .mockResolvedValueOnce(PROMOTED_MEMBER)
      .mockResolvedValueOnce(TARGET_MEMBER);

    const roster = await renderMembers();
    const card = getMemberCard(roster, 'Bob');
    const roleSelect = within(card).getByRole('combobox', {
      name: 'Role for Bob',
    });

    expect(roleSelect).toHaveValue('member');

    expect(
      within(roster).queryByRole('combobox', {
        name: 'Role for Alice',
      })
    ).not.toBeInTheDocument();

    expect(
      within(roleSelect).queryByRole('option', {
        name: 'Owner',
      })
    ).not.toBeInTheDocument();

    await user.selectOptions(roleSelect, 'admin');

    await waitFor(() => {
      expect(roleSelect).toHaveValue('admin');
      expect(roleSelect).toBeEnabled();
    });

    expect(updateRoleMock).toHaveBeenCalledWith(
      WORKSPACE_ID,
      TARGET_MEMBER.id,
      { role: 'admin' }
    );

    await user.selectOptions(roleSelect, 'member');

    await waitFor(() => {
      expect(roleSelect).toHaveValue('member');
      expect(within(card).getByRole('status')).toHaveTextContent('Role saved.');
    });

    expect(updateRoleMock).toHaveBeenCalledTimes(2);
    expect(updateRoleMock).toHaveBeenLastCalledWith(
      WORKSPACE_ID,
      TARGET_MEMBER.id,
      { role: 'member' }
    );

    expect(within(roster).getAllByRole('listitem')).toHaveLength(3);
    expect(within(roster).getByText('Owner')).toBeInTheDocument();

    expect(
      within(roster).getByRole('combobox', {
        name: 'Role for Carol',
      })
    ).toHaveValue('member');
  });

  it.each(['admin', 'member'] as const)(
    'hides role selectors from a requester with the %s role',
    async (role) => {
      const roster = await renderMembers(role);

      expect(within(roster).queryByRole('combobox')).not.toBeInTheDocument();

      expect(updateRoleMock).not.toHaveBeenCalled();
    }
  );

  it('preserves the saved role after failure and allows retry', async () => {
    const user = userEvent.setup();

    updateRoleMock
      .mockRejectedValueOnce(new Error('Network unavailable'))
      .mockResolvedValueOnce(PROMOTED_MEMBER);

    const roster = await renderMembers();
    const card = getMemberCard(roster, 'Bob');
    const roleSelect = within(card).getByRole('combobox', {
      name: 'Role for Bob',
    });

    await user.selectOptions(roleSelect, 'admin');

    expect(await within(card).findByRole('alert')).toHaveTextContent(
      'Network unavailable'
    );

    expect(roleSelect).toHaveValue('member');
    expect(roleSelect).toHaveAccessibleDescription('Network unavailable');

    await waitFor(() => {
      expect(roleSelect).toBeEnabled();
    });

    await user.selectOptions(roleSelect, 'admin');

    await waitFor(() => {
      expect(roleSelect).toHaveValue('admin');
      expect(within(card).getByRole('status')).toHaveTextContent('Role saved.');
    });

    expect(within(card).queryByRole('alert')).not.toBeInTheDocument();
    expect(updateRoleMock).toHaveBeenCalledTimes(2);
  });

  it('disables only the updating selector until the request finishes', async () => {
    const user = userEvent.setup();

    let resolveUpdate: ((member: WorkspaceMemberSummary) => void) | undefined;

    updateRoleMock.mockImplementationOnce(
      () =>
        new Promise<WorkspaceMemberSummary>((resolve) => {
          resolveUpdate = resolve;
        })
    );

    const roster = await renderMembers();
    const card = getMemberCard(roster, 'Bob');
    const roleSelect = within(card).getByRole('combobox', {
      name: 'Role for Bob',
    });

    await user.selectOptions(roleSelect, 'admin');

    expect(roleSelect).toBeDisabled();
    expect(roleSelect).toHaveValue('member');
    expect(within(card).getByRole('status')).toHaveTextContent('Saving role');

    expect(
      within(roster).getByRole('combobox', {
        name: 'Role for Carol',
      })
    ).toBeEnabled();

    expect(updateRoleMock).toHaveBeenCalledOnce();

    await act(async () => {
      if (resolveUpdate === undefined) {
        throw new Error('Expected a pending role update');
      }

      resolveUpdate(PROMOTED_MEMBER);
    });

    await waitFor(() => {
      expect(roleSelect).toHaveValue('admin');
      expect(roleSelect).toBeEnabled();
      expect(within(card).getByRole('status')).toHaveTextContent('Role saved.');
    });
  });
});
