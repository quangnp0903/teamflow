import { randomUUID } from 'node:crypto';

import { PrismaPg } from '@prisma/adapter-pg';
import { config } from 'dotenv';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { PrismaClient } from '../../generated/prisma/client.ts';
import { PrismaUserRepository } from './prisma-user.repository.ts';

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
const repository = new PrismaUserRepository(prisma);

const createdUserIds: string[] = [];

describe('PrismaUserRepository', () => {
  beforeAll(async () => {
    await prisma.$connect();
  });

  afterEach(async () => {
    const idsToDelete = createdUserIds.splice(0);

    if (idsToDelete.length > 0) {
      await prisma.user.deleteMany({
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

  it('creates a public user and retrieves its password hash', async () => {
    const email = `alice.${randomUUID()}@example.com`;
    const passwordHash = 'test-password-hash';

    const result = await repository.create({
      email,
      displayName: 'Alice Nguyen',
      passwordHash,
    });

    expect(result.status).toBe('created');

    if (result.status !== 'created') {
      throw new Error('Expected user creation to succeed');
    }

    const createdUser = result.user;
    createdUserIds.push(createdUser.id);

    expect(createdUser).toMatchObject({
      email,
      displayName: 'Alice Nguyen',
    });
    expect(createdUser.id).toEqual(expect.any(String));
    expect(createdUser.createdAt).toEqual(expect.any(String));
    expect(createdUser.updatedAt).toEqual(expect.any(String));
    expect(createdUser).not.toHaveProperty('passwordHash');

    await expect(repository.findByEmail(email)).resolves.toEqual({
      ...createdUser,
      passwordHash,
    });
    await expect(repository.findById(createdUser.id)).resolves.toEqual(
      createdUser
    );
  });

  it('returns null when an email does not exist', async () => {
    const email = `missing.${randomUUID()}@example.com`;

    await expect(repository.findByEmail(email)).resolves.toBeNull();
  });

  it('returns an email conflict for a duplicate email', async () => {
    const email = `duplicate.${randomUUID()}@example.com`;

    const firstResult = await repository.create({
      email,
      displayName: 'First User',
      passwordHash: 'first-password-hash',
    });

    if (firstResult.status !== 'created') {
      throw new Error('Expected first user creation to succeed');
    }

    createdUserIds.push(firstResult.user.id);

    await expect(
      repository.create({
        email,
        displayName: 'Second User',
        passwordHash: 'second-password-hash',
      })
    ).resolves.toEqual({
      status: 'email_conflict',
    });
  });

  it('returns null when a user ID does not exist', async () => {
    await expect(repository.findById(randomUUID())).resolves.toBeNull();
  });
});
