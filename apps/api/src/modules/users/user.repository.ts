import type { User, UserWithPasswordHash } from './user.model.ts';

export type CreateUserRecord = Readonly<{
  email: string;
  displayName: string;
  passwordHash: string;
}>;

export interface UserRepository {
  findByEmail(email: string): Promise<UserWithPasswordHash | null>;
  create(input: CreateUserRecord): Promise<User>;
}
