import type {
  PrismaClient,
  Session as PrismaSession,
} from '../../generated/prisma/client.ts';

import type { Session } from './session.model.ts';
import type {
  CreateSessionRecord,
  SessionRepository,
} from './session.repository.ts';

function toSession(session: PrismaSession): Session {
  return {
    id: session.id,
    userId: session.userId,
    tokenHash: session.tokenHash,
    expiresAt: session.expiresAt.toISOString(),
    createdAt: session.createdAt.toISOString(),
  };
}

export class PrismaSessionRepository implements SessionRepository {
  private readonly client: PrismaClient;

  constructor(client: PrismaClient) {
    this.client = client;
  }

  async create(input: CreateSessionRecord): Promise<Session> {
    const session = await this.client.session.create({
      data: input,
    });

    return toSession(session);
  }

  async findByTokenHash(tokenHash: string): Promise<Session | null> {
    const session = await this.client.session.findUnique({
      where: {
        tokenHash,
      },
    });

    return session === null ? null : toSession(session);
  }

  async deleteByTokenHash(tokenHash: string): Promise<boolean> {
    const result = await this.client.session.deleteMany({
      where: {
        tokenHash,
      },
    });

    return result.count > 0;
  }
}
