import { randomUUID } from 'node:crypto';

import type { Session } from './session.model.ts';
import type {
  CreateSessionRecord,
  SessionRepository,
} from './session.repository.ts';

export class InMemorySessionRepository implements SessionRepository {
  private readonly sessions: Session[];

  constructor(initialSessions: readonly Session[] = []) {
    this.sessions = [...initialSessions];
  }

  async create(input: CreateSessionRecord): Promise<Session> {
    const session: Session = {
      id: randomUUID(),
      userId: input.userId,
      tokenHash: input.tokenHash,
      expiresAt: input.expiresAt.toISOString(),
      createdAt: new Date().toISOString(),
    };

    this.sessions.push(session);

    return session;
  }

  async findByTokenHash(tokenHash: string): Promise<Session | null> {
    return (
      this.sessions.find((session) => session.tokenHash === tokenHash) ?? null
    );
  }

  async deleteByTokenHash(tokenHash: string): Promise<boolean> {
    const index = this.sessions.findIndex(
      (session) => session.tokenHash === tokenHash
    );

    if (index === -1) {
      return false;
    }

    this.sessions.splice(index, 1);

    return true;
  }
}
