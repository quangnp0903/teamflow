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
                in: [...renameWorkspaceIds, ...additionWorkspaceIds],
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
});
