import { randomUUID } from 'node:crypto';

import type { User, UserWithPasswordHash } from './user.model.ts';
import type { CreateUserRecord, UserRepository } from './user.repository.ts';

function toPublicUser(user: UserWithPasswordHash): User {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export class InMemoryUserRepository implements UserRepository {
  private readonly users: UserWithPasswordHash[];

  constructor(initialUsers: readonly UserWithPasswordHash[] = []) {
    this.users = [...initialUsers];
  }

  async findByEmail(email: string): Promise<UserWithPasswordHash | null> {
    return this.users.find((user) => user.email === email) ?? null;
  }

  async create(input: CreateUserRecord): Promise<User> {
    const now = new Date().toISOString();

    const user: UserWithPasswordHash = {
      id: randomUUID(),
      ...input,
      createdAt: now,
      updatedAt: now,
    };

    this.users.push(user);

    return toPublicUser(user);
  }
}
