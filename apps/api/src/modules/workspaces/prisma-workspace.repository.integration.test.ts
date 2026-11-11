import { randomUUID } from 'node:crypto';

import { PrismaPg } from '@prisma/adapter-pg';
import { config } from 'dotenv';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { PrismaClient } from '../../generated/prisma/client.ts';
import { PrismaWorkspaceRepository } from './prisma-workspace.repository.ts';
import type { WorkspaceMemberSummary } from './workspace.model.ts';

const { parsed, error } = config({ path: '.env.test' });

if (error) {
  throw new Error('Could not load .env.test', { cause: error });
}

const databaseUrl = parsed?.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL is missing from .env.test');
}

const databaseName = new URL(databaseUrl).pathname.slice(1);

if (!databaseName.endsWith('_test')) {
  throw new Error(
    `Integration tests require a test database; received "${databaseName}"`
  );
}

const adapter = new PrismaPg({
  connectionString: databaseUrl,
});

const prisma = new PrismaClient({ adapter });
const repository = new PrismaWorkspaceRepository(prisma);

const runId = randomUUID();
const ownerId = randomUUID();
const successName = `workspace-success-${runId}`;
const rollbackName = `workspace-rollback-${runId}`;
const listingUserId = randomUUID();
const otherOwnerId = randomUUID();
const detailsMemberId = randomUUID();
const detailsName = `workspace-details-${runId}`;

const ownedListName = `workspace-list-owned-${runId}`;
const sharedListName = `workspace-list-shared-${runId}`;
const hiddenListName = `workspace-list-hidden-${runId}`;

const rosterOwnerId = randomUUID();
const rosterMemberId = randomUUID();
const rosterOutsiderId = randomUUID();
const rosterName = `workspace-roster-${runId}`;

const renameUsers = {
  owner: randomUUID(),
  admin: randomUUID(),
  member: randomUUID(),
  outsider: randomUUID(),
};

const renameWorkspaceIds: string[] = [];

const additionUsers = {
  owner: randomUUID(),
  admin: randomUUID(),
  member: randomUUID(),
  outsider: randomUUID(),
  target: randomUUID(),
};

const additionWorkspaceIds: string[] = [];

const membershipUserIds = {
  owner: randomUUID(),
  admin: randomUUID(),
  member: randomUUID(),
  outsider: randomUUID(),
};

const membershipWorkspaceIds: string[] = [];

const fixtureUserIds = [
  ownerId,
  listingUserId,
  otherOwnerId,
  detailsMemberId,
  rosterOwnerId,
  rosterMemberId,
  rosterOutsiderId,
  ...Object.values(renameUsers),
  ...Object.values(additionUsers),
  ...Object.values(membershipUserIds),
];

const fixtureWorkspaceNames = [
  successName,
  rollbackName,
  ownedListName,
  sharedListName,
  hiddenListName,
  detailsName,
  rosterName,
];

async function createMemberAdditionWorkspace(): Promise<string> {
  const workspaceId = randomUUID();

  additionWorkspaceIds.push(workspaceId);

  await prisma.workspace.create({
    data: {
      id: workspaceId,
      name: `workspace-member-addition-${workspaceId}`,
      members: {
        create: [
          { userId: additionUsers.owner, role: 'owner' },
          { userId: additionUsers.admin, role: 'admin' },
          { userId: additionUsers.member, role: 'member' },
        ],
      },
    },
  });

  return workspaceId;
}

async function createWorkspaceMembersFixture() {
  const workspaceId = randomUUID();

  membershipWorkspaceIds.push(workspaceId);

  const workspace = await prisma.workspace.create({
    data: {
      id: workspaceId,
      name: `workspace-role-change-${workspaceId}`,
      members: {
        create: [
          { userId: membershipUserIds.owner, role: 'owner' },
          { userId: membershipUserIds.admin, role: 'admin' },
          { userId: membershipUserIds.member, role: 'member' },
        ],
      },
    },
    include: {
      members: true,
    },
  });

  const owner = workspace.members.find(
    (membership) => membership.userId === membershipUserIds.owner
  );
  const admin = workspace.members.find(
    (membership) => membership.userId === membershipUserIds.admin
  );
  const member = workspace.members.find(
    (membership) => membership.userId === membershipUserIds.member
  );

  if (owner === undefined || admin === undefined || member === undefined) {
    throw new Error('Expected role-change fixture memberships');
  }

  return { workspaceId, owner, admin, member };
}

describe('PrismaWorkspaceRepository', () => {
  beforeAll(async () => {
    await prisma.$connect();

    await prisma.user.createMany({
      data: fixtureUserIds.map((id) => ({
        id,
        email: `workspace-fixture-${id}@example.com`,
        displayName: `Workspace fixture ${id}`,
        passwordHash: 'unused-in-repository-test',
      })),
    });
  });

  afterAll(async () => {
    try {
      await prisma.workspace.deleteMany({
        where: {
          OR: [
            {
              name: {
                in: fixtureWorkspaceNames,
              },
            },
            {
              id: {
                in: [
                  ...renameWorkspaceIds,
                  ...additionWorkspaceIds,
                  ...membershipWorkspaceIds,
                ],
              },
            },
          ],
        },
      });

      await prisma.user.deleteMany({
        where: {
          id: {
            in: fixtureUserIds,
          },
        },
      });
    } finally {
      await prisma.$disconnect();
    }
  });

  it('creates a workspace with exactly one owner membership', async () => {
    const workspace = await repository.createWithOwner({
      name: successName,
      ownerId,
    });

    const stored = await prisma.workspace.findUniqueOrThrow({
      where: {
        id: workspace.id,
      },
      include: {
        members: true,
      },
    });

    expect(workspace.name).toBe(successName);

    expect(workspace).toEqual({
      id: stored.id,
      name: stored.name,
      createdAt: stored.createdAt.toISOString(),
      updatedAt: stored.updatedAt.toISOString(),
    });

    expect(stored.members).toHaveLength(1);

    expect(stored.members[0]).toMatchObject({
      workspaceId: workspace.id,
      userId: ownerId,
      role: 'owner',
    });
  });

  it('does not persist a workspace when its owner does not exist', async () => {
    const missingOwnerId = randomUUID();

    await expect(
      repository.createWithOwner({
        name: rollbackName,
        ownerId: missingOwnerId,
      })
    ).rejects.toThrow();

    await expect(
      prisma.workspace.count({
        where: {
          name: rollbackName,
        },
      })
    ).resolves.toBe(0);

    await expect(
      prisma.workspaceMember.count({
        where: {
          userId: missingOwnerId,
        },
      })
    ).resolves.toBe(0);
  });

  it('lists owned and shared workspaces with requester-specific roles', async () => {
    await expect(repository.listForUser(listingUserId)).resolves.toEqual([]);

    const owned = await repository.createWithOwner({
      name: ownedListName,
      ownerId: listingUserId,
    });

    const shared = await repository.createWithOwner({
      name: sharedListName,
      ownerId: otherOwnerId,
    });

    const hidden = await repository.createWithOwner({
      name: hiddenListName,
      ownerId: otherOwnerId,
    });

    const sharedMembership = await prisma.workspaceMember.create({
      data: {
        workspaceId: shared.id,
        userId: listingUserId,
        role: 'admin',
      },
    });

    const userWorkspaces = await repository.listForUser(listingUserId);

    expect(userWorkspaces).toHaveLength(2);
    expect(userWorkspaces).toEqual(
      expect.arrayContaining([
        { ...owned, role: 'owner' },
        { ...shared, role: 'admin' },
      ])
    );

    const otherWorkspaces = await repository.listForUser(otherOwnerId);

    expect(otherWorkspaces).toHaveLength(2);
    expect(otherWorkspaces).toEqual(
      expect.arrayContaining([
        { ...shared, role: 'owner' },
        { ...hidden, role: 'owner' },
      ])
    );

    await prisma.workspaceMember.update({
      where: {
        id: sharedMembership.id,
      },
      data: {
        role: 'member',
      },
    });

    const afterRoleChange = await repository.listForUser(listingUserId);

    expect(afterRoleChange).toHaveLength(2);
    expect(afterRoleChange).toEqual(
      expect.arrayContaining([
        { ...owned, role: 'owner' },
        { ...shared, role: 'member' },
      ])
    );
  });

  it('looks up workspaces by membership and reflects access changes', async () => {
    const workspace = await repository.createWithOwner({
      name: detailsName,
      ownerId,
    });

    const membership = await prisma.workspaceMember.create({
      data: {
        workspaceId: workspace.id,
        userId: detailsMemberId,
        role: 'member',
      },
    });

    await expect(
      repository.findForUser(ownerId, workspace.id)
    ).resolves.toEqual({
      ...workspace,
      role: 'owner',
    });

    await expect(
      repository.findForUser(detailsMemberId, workspace.id)
    ).resolves.toEqual({
      ...workspace,
      role: 'member',
    });

    await expect(
      repository.findForUser(otherOwnerId, workspace.id)
    ).resolves.toBeNull();

    await expect(
      repository.findForUser(ownerId, randomUUID())
    ).resolves.toBeNull();

    await prisma.workspaceMember.update({
      where: {
        id: membership.id,
      },
      data: {
        role: 'admin',
      },
    });

    await expect(
      repository.findForUser(detailsMemberId, workspace.id)
    ).resolves.toEqual({
      ...workspace,
      role: 'admin',
    });

    await prisma.workspaceMember.delete({
      where: {
        id: membership.id,
      },
    });

    await expect(
      repository.findForUser(detailsMemberId, workspace.id)
    ).resolves.toBeNull();
  });

  it('lists safe member summaries and respects membership changes', async () => {
    const ownerJoinedAt = new Date('2026-10-20T10:00:00.000Z');
    const memberJoinedAt = new Date('2026-10-20T11:00:00.000Z');

    const workspace = await repository.createWithOwner({
      name: rosterName,
      ownerId: rosterOwnerId,
    });

    const ownerMembership = await prisma.workspaceMember.update({
      where: {
        workspaceId_userId: {
          workspaceId: workspace.id,
          userId: rosterOwnerId,
        },
      },
      data: {
        createdAt: ownerJoinedAt,
      },
    });

    const memberMembership = await prisma.workspaceMember.create({
      data: {
        workspaceId: workspace.id,
        userId: rosterMemberId,
        role: 'member',
        createdAt: memberJoinedAt,
      },
    });

    const ownerSummary = {
      id: ownerMembership.id,
      userId: rosterOwnerId,
      displayName: `Workspace fixture ${rosterOwnerId}`,
      role: 'owner',
      joinedAt: ownerJoinedAt.toISOString(),
    } satisfies WorkspaceMemberSummary;

    const memberSummary = {
      id: memberMembership.id,
      userId: rosterMemberId,
      displayName: `Workspace fixture ${rosterMemberId}`,
      role: 'member',
      joinedAt: memberJoinedAt.toISOString(),
    } satisfies WorkspaceMemberSummary;

    const expectedMembers = [ownerSummary, memberSummary];

    await expect(
      repository.listWorkspaceMembersForUser(rosterOwnerId, workspace.id)
    ).resolves.toEqual(expectedMembers);

    await expect(
      repository.listWorkspaceMembersForUser(rosterMemberId, workspace.id)
    ).resolves.toEqual(expectedMembers);

    await expect(
      repository.listWorkspaceMembersForUser(rosterOutsiderId, workspace.id)
    ).resolves.toBeNull();

    await expect(
      repository.listWorkspaceMembersForUser(rosterOwnerId, randomUUID())
    ).resolves.toBeNull();

    await prisma.workspaceMember.update({
      where: {
        id: memberMembership.id,
      },
      data: {
        role: 'admin',
      },
    });

    await expect(
      repository.listWorkspaceMembersForUser(rosterMemberId, workspace.id)
    ).resolves.toEqual([
      ownerSummary,
      {
        ...memberSummary,
        role: 'admin',
      },
    ]);

    await prisma.workspaceMember.delete({
      where: {
        id: memberMembership.id,
      },
    });

    await expect(
      repository.listWorkspaceMembersForUser(rosterMemberId, workspace.id)
    ).resolves.toBeNull();

    await expect(
      repository.listWorkspaceMembersForUser(rosterOwnerId, workspace.id)
    ).resolves.toEqual([ownerSummary]);
  });

  it.each([
    { actor: 'owner', canRename: true },
    { actor: 'admin', canRename: true },
    { actor: 'member', canRename: false },
    { actor: 'outsider', canRename: false },
  ] as const)(
    'enforces rename permissions for $actor',
    async ({ actor, canRename }) => {
      const workspaceId = randomUUID();
      const originalName = `workspace-rename-${actor}-${runId}`;
      const newName = `workspace-renamed-${actor}-${runId}`;

      renameWorkspaceIds.push(workspaceId);

      await prisma.workspace.create({
        data: {
          id: workspaceId,
          name: originalName,
          members: {
            create: [
              { userId: renameUsers.owner, role: 'owner' },
              { userId: renameUsers.admin, role: 'admin' },
              { userId: renameUsers.member, role: 'member' },
            ],
          },
        },
      });

      const result = await repository.renameForManager(
        renameUsers[actor],
        workspaceId,
        { name: newName }
      );

      const stored = await prisma.workspace.findUniqueOrThrow({
        where: { id: workspaceId },
      });

      if (canRename) {
        expect(stored.name).toBe(newName);

        expect(result).toEqual({
          id: stored.id,
          name: newName,
          createdAt: stored.createdAt.toISOString(),
          updatedAt: stored.updatedAt.toISOString(),
        });
      } else {
        expect(result).toBeNull();
        expect(stored.name).toBe(originalName);
      }
    }
  );

  it('checks the current role when writing after an admin is demoted', async () => {
    const workspaceId = randomUUID();
    const originalName = `workspace-rename-demotion-${runId}`;

    renameWorkspaceIds.push(workspaceId);

    await prisma.workspace.create({
      data: {
        id: workspaceId,
        name: originalName,
        members: {
          create: [
            { userId: renameUsers.owner, role: 'owner' },
            { userId: renameUsers.admin, role: 'admin' },
          ],
        },
      },
    });

    const earlierLookup = await repository.findForUser(
      renameUsers.admin,
      workspaceId
    );

    expect(earlierLookup?.role).toBe('admin');

    await prisma.workspaceMember.update({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId: renameUsers.admin,
        },
      },
      data: {
        role: 'member',
      },
    });

    await expect(
      repository.renameForManager(renameUsers.admin, workspaceId, {
        name: `workspace-demoted-update-${runId}`,
      })
    ).resolves.toBeNull();

    const stored = await prisma.workspace.findUniqueOrThrow({
      where: { id: workspaceId },
    });

    expect(stored.name).toBe(originalName);
  });

  it('returns null when renaming a missing workspace', async () => {
    await expect(
      repository.renameForManager(renameUsers.owner, randomUUID(), {
        name: 'Missing workspace',
      })
    ).resolves.toBeNull();
  });

  it.each([
    { actor: 'owner', canAdd: true },
    { actor: 'admin', canAdd: true },
    { actor: 'member', canAdd: false },
    { actor: 'outsider', canAdd: false },
  ] as const)(
    'enforces member-addition permissions for $actor',
    async ({ actor, canAdd }) => {
      const workspaceId = await createMemberAdditionWorkspace();

      const result = await repository.addMemberForManager(
        additionUsers[actor],
        workspaceId,
        additionUsers.target
      );

      const stored = await prisma.workspaceMember.findUnique({
        where: {
          workspaceId_userId: {
            workspaceId,
            userId: additionUsers.target,
          },
        },
      });

      if (!canAdd) {
        expect(result).toEqual({ status: 'unavailable' });
        expect(stored).toBeNull();
        return;
      }

      if (stored === null) {
        throw new Error('Expected the target membership to be persisted');
      }

      expect(stored.role).toBe('member');

      expect(result).toEqual({
        status: 'added',
        member: {
          id: stored.id,
          userId: additionUsers.target,
          displayName: `Workspace fixture ${additionUsers.target}`,
          role: 'member',
          joinedAt: stored.createdAt.toISOString(),
        },
      });
    }
  );

  it('creates only one membership for competing additions', async () => {
    const workspaceId = await createMemberAdditionWorkspace();

    const results = await Promise.all([
      repository.addMemberForManager(
        additionUsers.owner,
        workspaceId,
        additionUsers.target
      ),
      repository.addMemberForManager(
        additionUsers.admin,
        workspaceId,
        additionUsers.target
      ),
    ]);

    expect(results.map((result) => result.status).sort()).toEqual([
      'added',
      'already_member',
    ]);

    await expect(
      prisma.workspaceMember.count({
        where: {
          workspaceId,
          userId: additionUsers.target,
        },
      })
    ).resolves.toBe(1);
  });

  it.each(['workspace', 'user'] as const)(
    'returns unavailable when the required %s does not exist',
    async (missingRecord) => {
      const workspaceId = await createMemberAdditionWorkspace();

      const result = await repository.addMemberForManager(
        additionUsers.owner,
        missingRecord === 'workspace' ? randomUUID() : workspaceId,
        missingRecord === 'user' ? randomUUID() : additionUsers.target
      );

      expect(result).toEqual({ status: 'unavailable' });

      await expect(
        prisma.workspaceMember.count({
          where: { workspaceId },
        })
      ).resolves.toBe(3);
    }
  );

  it('rejects member addition after an admin has been demoted', async () => {
    const workspaceId = await createMemberAdditionWorkspace();

    const earlierLookup = await repository.findForUser(
      additionUsers.admin,
      workspaceId
    );

    expect(earlierLookup?.role).toBe('admin');

    await prisma.workspaceMember.update({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId: additionUsers.admin,
        },
      },
      data: {
        role: 'member',
      },
    });

    await expect(
      repository.addMemberForManager(
        additionUsers.admin,
        workspaceId,
        additionUsers.target
      )
    ).resolves.toEqual({ status: 'unavailable' });

    await expect(
      prisma.workspaceMember.count({
        where: {
          workspaceId,
          userId: additionUsers.target,
        },
      })
    ).resolves.toBe(0);
  });

  it.each([
    { actor: 'owner', canChange: true },
    { actor: 'admin', canChange: false },
    { actor: 'member', canChange: false },
    { actor: 'outsider', canChange: false },
  ] as const)(
    'enforces member-role permissions for $actor',
    async ({ actor, canChange }) => {
      const fixture = await createWorkspaceMembersFixture();

      const result = await repository.updateMemberRoleForOwner(
        membershipUserIds[actor],
        fixture.workspaceId,
        fixture.member.id,
        { role: 'admin' }
      );

      const stored = await prisma.workspaceMember.findUniqueOrThrow({
        where: { id: fixture.member.id },
      });

      if (!canChange) {
        expect(result).toBeNull();
        expect(stored).toEqual(fixture.member);
        return;
      }

      expect(stored.role).toBe('admin');

      expect(result).toEqual({
        id: fixture.member.id,
        userId: membershipUserIds.member,
        displayName: `Workspace fixture ${membershipUserIds.member}`,
        role: 'admin',
        joinedAt: fixture.member.createdAt.toISOString(),
      });
    }
  );

  it('rejects a role change after the requester loses ownership access', async () => {
    const fixture = await createWorkspaceMembersFixture();

    const earlierLookup = await repository.findForUser(
      membershipUserIds.owner,
      fixture.workspaceId
    );

    expect(earlierLookup?.role).toBe('owner');

    await prisma.workspaceMember.delete({
      where: { id: fixture.owner.id },
    });

    const result = await repository.updateMemberRoleForOwner(
      membershipUserIds.owner,
      fixture.workspaceId,
      fixture.member.id,
      { role: 'admin' }
    );

    expect(result).toBeNull();

    const stored = await prisma.workspaceMember.findUniqueOrThrow({
      where: { id: fixture.member.id },
    });

    expect(stored).toEqual(fixture.member);
  });

  it('allows an owner to demote an admin to member', async () => {
    const fixture = await createWorkspaceMembersFixture();

    const result = await repository.updateMemberRoleForOwner(
      membershipUserIds.owner,
      fixture.workspaceId,
      fixture.admin.id,
      { role: 'member' }
    );

    expect(result).toMatchObject({
      id: fixture.admin.id,
      userId: membershipUserIds.admin,
      role: 'member',
    });

    const stored = await prisma.workspaceMember.findUniqueOrThrow({
      where: { id: fixture.admin.id },
    });

    expect(stored.role).toBe('member');
  });

  it('does not change an existing owner membership', async () => {
    const fixture = await createWorkspaceMembersFixture();

    const result = await repository.updateMemberRoleForOwner(
      membershipUserIds.owner,
      fixture.workspaceId,
      fixture.owner.id,
      { role: 'member' }
    );

    expect(result).toBeNull();

    const stored = await prisma.workspaceMember.findUniqueOrThrow({
      where: { id: fixture.owner.id },
    });

    expect(stored).toEqual(fixture.owner);
  });

  it('rejects a membership belonging to another workspace', async () => {
    const first = await createWorkspaceMembersFixture();
    const second = await createWorkspaceMembersFixture();

    const result = await repository.updateMemberRoleForOwner(
      membershipUserIds.owner,
      first.workspaceId,
      second.member.id,
      { role: 'admin' }
    );

    expect(result).toBeNull();

    const stored = await prisma.workspaceMember.findUniqueOrThrow({
      where: { id: second.member.id },
    });

    expect(stored).toEqual(second.member);
  });

  it.each(['admin', 'member'] as const)(
    'removes a %s membership and revokes workspace access',
    async (role) => {
      const fixture = await createWorkspaceMembersFixture();
      const target = fixture[role];

      await expect(
        repository.findForUser(target.userId, fixture.workspaceId)
      ).resolves.toMatchObject({ role });

      const removed = await repository.removeMemberForOwner(
        membershipUserIds.owner,
        fixture.workspaceId,
        target.id
      );

      expect(removed).toBe(true);

      await expect(
        prisma.workspaceMember.findUnique({
          where: { id: target.id },
        })
      ).resolves.toBeNull();

      await expect(
        repository.findForUser(target.userId, fixture.workspaceId)
      ).resolves.toBeNull();

      await expect(
        prisma.workspaceMember.count({
          where: { workspaceId: fixture.workspaceId },
        })
      ).resolves.toBe(2);

      await expect(
        prisma.user.findUnique({
          where: { id: target.userId },
        })
      ).resolves.not.toBeNull();

      await expect(
        repository.removeMemberForOwner(
          membershipUserIds.owner,
          fixture.workspaceId,
          target.id
        )
      ).resolves.toBe(false);
    }
  );

  it.each(['admin', 'member', 'outsider'] as const)(
    'rejects membership removal requested by an %s',
    async (actor) => {
      const fixture = await createWorkspaceMembersFixture();

      const removed = await repository.removeMemberForOwner(
        membershipUserIds[actor],
        fixture.workspaceId,
        fixture.member.id
      );

      expect(removed).toBe(false);

      await expect(
        prisma.workspaceMember.findUniqueOrThrow({
          where: { id: fixture.member.id },
        })
      ).resolves.toEqual(fixture.member);
    }
  );

  it('protects the owner membership from removal', async () => {
    const fixture = await createWorkspaceMembersFixture();

    const removed = await repository.removeMemberForOwner(
      membershipUserIds.owner,
      fixture.workspaceId,
      fixture.owner.id
    );

    expect(removed).toBe(false);

    await expect(
      prisma.workspaceMember.findUniqueOrThrow({
        where: { id: fixture.owner.id },
      })
    ).resolves.toEqual(fixture.owner);

    await expect(
      prisma.workspaceMember.count({
        where: { workspaceId: fixture.workspaceId },
      })
    ).resolves.toBe(3);
  });

  it('rejects removal of a membership from another workspace', async () => {
    const first = await createWorkspaceMembersFixture();
    const second = await createWorkspaceMembersFixture();

    const removed = await repository.removeMemberForOwner(
      membershipUserIds.owner,
      first.workspaceId,
      second.member.id
    );

    expect(removed).toBe(false);

    await expect(
      prisma.workspaceMember.findUniqueOrThrow({
        where: { id: second.member.id },
      })
    ).resolves.toEqual(second.member);

    await expect(
      prisma.workspaceMember.count({
        where: { workspaceId: first.workspaceId },
      })
    ).resolves.toBe(3);
  });

  it('rejects removal after the requester loses ownership access', async () => {
    const fixture = await createWorkspaceMembersFixture();

    const earlierLookup = await repository.findForUser(
      membershipUserIds.owner,
      fixture.workspaceId
    );

    expect(earlierLookup?.role).toBe('owner');

    await prisma.workspaceMember.delete({
      where: { id: fixture.owner.id },
    });

    const removed = await repository.removeMemberForOwner(
      membershipUserIds.owner,
      fixture.workspaceId,
      fixture.member.id
    );

    expect(removed).toBe(false);

    await expect(
      prisma.workspaceMember.findUniqueOrThrow({
        where: { id: fixture.member.id },
      })
    ).resolves.toEqual(fixture.member);
  });
});
