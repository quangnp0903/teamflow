import { createHash, randomUUID } from 'node:crypto';

import { PrismaPg } from '@prisma/adapter-pg';
import { config } from 'dotenv';
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from 'vitest';

import { PrismaClient } from '../../generated/prisma/client.ts';
import { PrismaSessionRepository } from './prisma-session.repository.ts';

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
const repository = new PrismaSessionRepository(prisma);

let userId: string;

function createTokenHash(): string {
  return createHash('sha256').update(randomUUID()).digest('hex');
}

describe('PrismaSessionRepository', () => {
  beforeAll(async () => {
    await prisma.$connect();
  });

  beforeEach(async () => {
    const user = await prisma.user.create({
      data: {
        email: `session.${randomUUID()}@example.com`,
        displayName: 'Session User',
        passwordHash: 'test-password-hash',
      },
    });

    userId = user.id;
  });

  afterEach(async () => {
    await prisma.user.deleteMany({
      where: {
        id: userId,
      },
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('creates and finds a session by its token hash', async () => {
    const tokenHash = createTokenHash();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    const createdSession = await repository.create({
      userId,
      tokenHash,
      expiresAt,
    });

    expect(createdSession).toMatchObject({
      userId,
      tokenHash,
      expiresAt: expiresAt.toISOString(),
    });
    expect(createdSession.id).toEqual(expect.any(String));
    expect(createdSession.createdAt).toEqual(expect.any(String));

    await expect(repository.findByTokenHash(tokenHash)).resolves.toEqual(
      createdSession
    );
  });

  it('deletes a session by its token hash', async () => {
    const tokenHash = createTokenHash();

    await repository.create({
      userId,
      tokenHash,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    });

    await expect(repository.deleteByTokenHash(tokenHash)).resolves.toBe(true);
    await expect(repository.findByTokenHash(tokenHash)).resolves.toBeNull();
    await expect(repository.deleteByTokenHash(tokenHash)).resolves.toBe(false);
  });
});
