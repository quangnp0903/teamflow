import type {
  PrismaClient,
  Workspace as PrismaWorkspace,
} from '../../generated/prisma/client.ts';

import type { Workspace } from './workspace.model.ts';
import type {
  CreateWorkspaceRecord,
  WorkspaceRepository,
} from './workspace.repository.ts';

function toWorkspace(workspace: PrismaWorkspace): Workspace {
  return {
    id: workspace.id,
    name: workspace.name,
    createdAt: workspace.createdAt.toISOString(),
    updatedAt: workspace.updatedAt.toISOString(),
  };
}

export class PrismaWorkspaceRepository implements WorkspaceRepository {
  private readonly client: PrismaClient;

  constructor(client: PrismaClient) {
    this.client = client;
  }

  async createWithOwner(input: CreateWorkspaceRecord): Promise<Workspace> {
    const workspace = await this.client.workspace.create({
      data: {
        name: input.name,
        members: {
          create: {
            role: 'owner',
            user: {
              connect: {
                id: input.ownerId,
              },
            },
          },
        },
      },
    });

    return toWorkspace(workspace);
  }
}
