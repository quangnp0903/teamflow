import type { Session } from './session.model.ts';

export type CreateSessionRecord = Readonly<{
  userId: string;
  tokenHash: string;
  expiresAt: Date;
}>;

export interface SessionRepository {
  create(input: CreateSessionRecord): Promise<Session>;

  findByTokenHash(tokenHash: string): Promise<Session | null>;

  deleteByTokenHash(tokenHash: string): Promise<boolean>;
}
