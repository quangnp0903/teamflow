import { PrismaPg } from '@prisma/adapter-pg';
import { config } from 'dotenv';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';

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

    const page = await repository.list({ page: 1, pageSize: 20 });

    expect(page.items).toContainEqual(createdTask);
    expect(page.total).toBeGreaterThanOrEqual(1);
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

  it('filters and paginates persisted tasks', async () => {
    const searchToken = `Db${randomUUID().replaceAll('-', '')}`;

    const titleMatch = await repository.create({
      title: `${searchToken.toUpperCase()} title match`,
      description: null,
      status: 'done',
    });

    const descriptionMatch = await repository.create({
      title: 'Description match',
      description: `${searchToken.toLowerCase()} description`,
      status: 'done',
    });

    const wrongStatus = await repository.create({
      title: `${searchToken} wrong status`,
      description: null,
      status: 'todo',
    });

    createdTaskIds.push(titleMatch.id, descriptionMatch.id, wrongStatus.id);

    const firstPage = await repository.list({
      status: 'done',
      search: searchToken,
      page: 1,
      pageSize: 1,
    });

    const secondPage = await repository.list({
      status: 'done',
      search: searchToken,
      page: 2,
      pageSize: 1,
    });

    expect(firstPage.total).toBe(2);
    expect(firstPage.items).toHaveLength(1);

    expect(secondPage.total).toBe(2);
    expect(secondPage.items).toHaveLength(1);

    const returnedIds = [firstPage.items[0]?.id, secondPage.items[0]?.id];

    expect(returnedIds).toEqual(
      expect.arrayContaining([titleMatch.id, descriptionMatch.id])
    );

    expect(returnedIds).not.toContain(wrongStatus.id);
  });

  it('deletes a persisted task', async () => {
    const createdTask = await repository.create({
      title: 'Delete persisted task',
      description: null,
      status: 'todo',
    });

    createdTaskIds.push(createdTask.id);

    await expect(repository.delete(createdTask.id)).resolves.toBe(true);

    await expect(repository.findById(createdTask.id)).resolves.toBeNull();

    await expect(repository.delete(createdTask.id)).resolves.toBe(false);
  });
});
