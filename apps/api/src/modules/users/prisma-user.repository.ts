import {
  Prisma,
  type PrismaClient,
  type User as PrismaUser,
} from '../../generated/prisma/client.ts';

import type { User, UserWithPasswordHash } from './user.model.ts';
import type {
  CreateUserRecord,
  CreateUserResult,
  UserRepository,
} from './user.repository.ts';

function toPublicUser(user: PrismaUser): User {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

function toUserWithPasswordHash(user: PrismaUser): UserWithPasswordHash {
  return {
    ...toPublicUser(user),
    passwordHash: user.passwordHash,
  };
}

export class PrismaUserRepository implements UserRepository {
  private readonly client: PrismaClient;

  constructor(client: PrismaClient) {
    this.client = client;
  }

  async findByEmail(email: string): Promise<UserWithPasswordHash | null> {
    const user = await this.client.user.findUnique({
      where: {
        email,
      },
    });

    return user === null ? null : toUserWithPasswordHash(user);
  }

  async create(input: CreateUserRecord): Promise<CreateUserResult> {
    try {
      const user = await this.client.user.create({
        data: input,
      });

      return {
        status: 'created',
        user: toPublicUser(user),
      };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        return { status: 'email_conflict' };
      }

      throw error;
    }
  }

  async findById(id: string): Promise<User | null> {
    const user = await this.client.user.findUnique({
      where: {
        id,
      },
    });

    return user === null ? null : toPublicUser(user);
  }
}
