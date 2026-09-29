import type { User, UserWithPasswordHash } from './user.model.ts';

export type CreateUserRecord = Readonly<{
  email: string;
  displayName: string;
  passwordHash: string;
}>;

export type CreateUserResult =
  | Readonly<{
      status: 'created';
      user: User;
    }>
  | Readonly<{
      status: 'email_conflict';
    }>;

export interface UserRepository {
  findByEmail(email: string): Promise<UserWithPasswordHash | null>;
  create(input: CreateUserRecord): Promise<CreateUserResult>;
}
