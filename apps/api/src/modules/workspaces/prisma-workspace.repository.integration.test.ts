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

describe('PrismaWorkspaceRepository', () => {
  beforeAll(async () => {
    await prisma.$connect();

    await prisma.user.create({
      data: {
        id: ownerId,
        email: `workspace-owner-${ownerId}@example.com`,
        displayName: 'Workspace owner',
        passwordHash: 'unused-in-repository-test',
      },
    });
  });

  afterAll(async () => {
    try {
      await prisma.workspace.deleteMany({
        where: {
          name: {
            in: [successName, rollbackName],
          },
        },
      });

      await prisma.user.deleteMany({
        where: {
          id: ownerId,
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
});
