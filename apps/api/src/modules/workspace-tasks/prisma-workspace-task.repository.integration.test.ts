import { randomUUID } from 'node:crypto';

import { PrismaPg } from '@prisma/adapter-pg';
import { config } from 'dotenv';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { PrismaClient } from '../../generated/prisma/client.ts';
import { PrismaWorkspaceTaskRepository } from './prisma-workspace-task.repository.ts';

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

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: databaseUrl }),
});

const repository = new PrismaWorkspaceTaskRepository(prisma);

const userIds = {
  owner: randomUUID(),
  admin: randomUUID(),
  member: randomUUID(),
  outsider: randomUUID(),
};

const workspaceIds: string[] = [];
const pageQuery = { page: 1, pageSize: 20 };

async function createWorkspace(): Promise<string> {
  const workspaceId = randomUUID();

  workspaceIds.push(workspaceId);

  await prisma.workspace.create({
    data: {
      id: workspaceId,
      name: 'Workspace task fixture',
      members: {
        create: [
          { userId: userIds.owner, role: 'owner' },
          { userId: userIds.admin, role: 'admin' },
          { userId: userIds.member, role: 'member' },
        ],
      },
    },
  });

  return workspaceId;
}

describe('PrismaWorkspaceTaskRepository', () => {
  beforeAll(async () => {
    await prisma.$connect();

    await prisma.user.createMany({
      data: Object.values(userIds).map((id) => ({
        id,
        email: `workspace-task-${id}@example.com`,
        displayName: 'Workspace task fixture',
        passwordHash: 'unused-in-repository-test',
      })),
    });
  });

  afterAll(async () => {
    try {
      await prisma.task.deleteMany({
        where: {
          ownerId: { in: Object.values(userIds) },
        },
      });

      await prisma.workspace.deleteMany({
        where: {
          id: { in: workspaceIds },
        },
      });

      await prisma.user.deleteMany({
        where: {
          id: { in: Object.values(userIds) },
        },
      });
    } finally {
      await prisma.$disconnect();
    }
  });

  it.each(['owner', 'admin', 'member'] as const)(
    "allows a current %s to read another member's task",
    async (role) => {
      const workspaceId = await createWorkspace();
      const creatorId = role === 'member' ? userIds.owner : userIds.member;

      const task = await prisma.task.create({
        data: {
          ownerId: creatorId,
          workspaceId,
          title: 'Shared task',
          description: 'Visible to workspace members',
          status: 'todo',
        },
      });

      const page = await repository.listForMember(
        userIds[role],
        workspaceId,
        pageQuery
      );

      expect(page).toEqual({
        items: [
          {
            id: task.id,
            workspaceId,
            createdById: creatorId,
            title: task.title,
            description: task.description,
            status: task.status,
            createdAt: task.createdAt.toISOString(),
            updatedAt: task.updatedAt.toISOString(),
          },
        ],
        total: 1,
      });
    }
  );

  it('returns an empty page for an accessible empty workspace', async () => {
    const workspaceId = await createWorkspace();

    await expect(
      repository.listForMember(userIds.member, workspaceId, pageQuery)
    ).resolves.toEqual({
      items: [],
      total: 0,
    });
  });

  it('returns null for an outsider or a missing workspace', async () => {
    const workspaceId = await createWorkspace();

    await expect(
      repository.listForMember(userIds.outsider, workspaceId, pageQuery)
    ).resolves.toBeNull();

    await expect(
      repository.listForMember(userIds.member, randomUUID(), pageQuery)
    ).resolves.toBeNull();
  });

  it("revokes a removed creator's access while preserving the task", async () => {
    const workspaceId = await createWorkspace();

    const task = await prisma.task.create({
      data: {
        ownerId: userIds.member,
        workspaceId,
        title: 'Task created before removal',
      },
    });

    await expect(
      repository.listForMember(userIds.member, workspaceId, pageQuery)
    ).resolves.toMatchObject({ total: 1 });

    await prisma.workspaceMember.delete({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId: userIds.member,
        },
      },
    });

    await expect(
      repository.listForMember(userIds.member, workspaceId, pageQuery)
    ).resolves.toBeNull();

    await expect(
      repository.listForMember(userIds.owner, workspaceId, pageQuery)
    ).resolves.toEqual({
      items: [
        expect.objectContaining({
          id: task.id,
          createdById: userIds.member,
        }),
      ],
      total: 1,
    });
  });

  it('excludes personal tasks and tasks from other accessible workspaces', async () => {
    const workspaceId = await createWorkspace();
    const otherWorkspaceId = await createWorkspace();
    const visibleTaskId = randomUUID();

    await prisma.task.createMany({
      data: [
        {
          id: visibleTaskId,
          ownerId: userIds.member,
          workspaceId,
          title: 'Visible workspace task',
        },
        {
          ownerId: userIds.member,
          workspaceId: otherWorkspaceId,
          title: 'Another workspace task',
        },
        {
          ownerId: userIds.member,
          workspaceId: null,
          title: 'Personal task',
        },
      ],
    });

    await expect(
      repository.listForMember(userIds.member, workspaceId, pageQuery)
    ).resolves.toEqual({
      items: [expect.objectContaining({ id: visibleTaskId })],
      total: 1,
    });
  });

  it('filters title and description matches and paginates their total', async () => {
    const workspaceId = await createWorkspace();
    const newerTaskId = randomUUID();
    const olderTaskId = randomUUID();

    await prisma.task.createMany({
      data: [
        {
          id: newerTaskId,
          ownerId: userIds.owner,
          workspaceId,
          title: 'SHIP frontend',
          status: 'done',
          createdAt: new Date('2026-01-02T00:00:00.000Z'),
        },
        {
          id: olderTaskId,
          ownerId: userIds.member,
          workspaceId,
          title: 'Backend preparation',
          description: 'Prepare the ship checklist',
          status: 'done',
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
        },
        {
          ownerId: userIds.owner,
          workspaceId,
          title: 'Ship later',
          status: 'todo',
        },
        {
          ownerId: userIds.owner,
          workspaceId,
          title: 'Unrelated completed task',
          status: 'done',
        },
      ],
    });

    const query = {
      status: 'done',
      search: 'sHiP',
      pageSize: 1,
    } as const;

    await expect(
      repository.listForMember(userIds.member, workspaceId, {
        ...query,
        page: 1,
      })
    ).resolves.toEqual({
      items: [expect.objectContaining({ id: newerTaskId })],
      total: 2,
    });

    await expect(
      repository.listForMember(userIds.member, workspaceId, {
        ...query,
        page: 2,
      })
    ).resolves.toEqual({
      items: [expect.objectContaining({ id: olderTaskId })],
      total: 2,
    });

    await expect(
      repository.listForMember(userIds.member, workspaceId, {
        ...query,
        page: 3,
      })
    ).resolves.toEqual({
      items: [],
      total: 2,
    });
  });
});
