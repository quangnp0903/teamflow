import { PrismaPg } from '@prisma/adapter-pg';
import { config } from 'dotenv';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { PrismaClient } from '../../generated/prisma/client.ts';
import { PrismaTaskRepository } from './prisma-task.repository.ts';

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
const repository = new PrismaTaskRepository(prisma);

const createdTaskIds: string[] = [];

describe('PrismaTaskRepository', () => {
  beforeAll(async () => {
    await prisma.$connect();
  });

  afterEach(async () => {
    const idsToDelete = createdTaskIds.splice(0);

    if (idsToDelete.length > 0) {
      await prisma.task.deleteMany({
        where: {
          id: {
            in: idsToDelete,
          },
        },
      });
    }
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('creates, finds, and lists a persisted task', async () => {
    const createdTask = await repository.create({
      title: 'Test Prisma repository',
      description: null,
      status: 'todo',
    });

    createdTaskIds.push(createdTask.id);

    expect(createdTask).toMatchObject({
      title: 'Test Prisma repository',
      description: null,
      status: 'todo',
    });

    expect(createdTask.createdAt).toEqual(expect.any(String));
    expect(createdTask.updatedAt).toEqual(expect.any(String));

    await expect(repository.findById(createdTask.id)).resolves.toEqual(
      createdTask
    );

    await expect(repository.list()).resolves.toContainEqual(createdTask);
  });

  it('updates a persisted task', async () => {
    const createdTask = await repository.create({
      title: 'Original title',
      description: null,
      status: 'todo',
    });

    createdTaskIds.push(createdTask.id);

    const updatedTask = await repository.update(createdTask.id, {
      title: 'Updated title',
      description: 'Stored in PostgreSQL',
      status: 'done',
    });

    expect(updatedTask).toMatchObject({
      id: createdTask.id,
      title: 'Updated title',
      description: 'Stored in PostgreSQL',
      status: 'done',
    });
  });

  it('returns null when a task does not exist', async () => {
    const missingId = '00000000-0000-4000-8000-000000000000';

    await expect(repository.findById(missingId)).resolves.toBeNull();

    await expect(
      repository.update(missingId, {
        status: 'done',
      })
    ).resolves.toBeNull();
  });
});
