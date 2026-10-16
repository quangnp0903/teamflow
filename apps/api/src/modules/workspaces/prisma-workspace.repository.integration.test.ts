import { randomUUID } from 'node:crypto';

import { PrismaPg } from '@prisma/adapter-pg';
import { config } from 'dotenv';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { PrismaClient } from '../../generated/prisma/client.ts';
import { PrismaWorkspaceRepository } from './prisma-workspace.repository.ts';

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

const fixtureUserIds = [ownerId, listingUserId, otherOwnerId, detailsMemberId];

const fixtureWorkspaceNames = [
  successName,
  rollbackName,
  ownedListName,
  sharedListName,
  hiddenListName,
  detailsName,
];

describe('PrismaWorkspaceRepository', () => {
  beforeAll(async () => {
    await prisma.$connect();

    await prisma.user.createMany({
      data: fixtureUserIds.map((id) => ({
        id,
        email: `workspace-fixture-${id}@example.com`,
        displayName: 'Workspace fixture user',
        passwordHash: 'unused-in-repository-test',
      })),
    });
  });

  afterAll(async () => {
    try {
      await prisma.workspace.deleteMany({
        where: {
          name: {
            in: fixtureWorkspaceNames,
          },
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
});
