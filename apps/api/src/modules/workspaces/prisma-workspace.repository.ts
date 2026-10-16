import type {
  PrismaClient,
  Workspace as PrismaWorkspace,
} from '../../generated/prisma/client.ts';

import type { Workspace, WorkspaceWithRole } from './workspace.model.ts';
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

  async listForUser(userId: string): Promise<readonly WorkspaceWithRole[]> {
    const memberships = await this.client.workspaceMember.findMany({
      where: {
        userId,
      },
      select: {
        role: true,
        workspace: true,
      },
      orderBy: [
        {
          workspace: {
            createdAt: 'desc',
          },
        },
        {
          workspaceId: 'desc',
        },
      ],
    });

    return memberships.map(({ workspace, role }) => ({
      ...toWorkspace(workspace),
      role,
    }));
  }

  async findForUser(
    userId: string,
    workspaceId: string
  ): Promise<WorkspaceWithRole | null> {
    const membership = await this.client.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId,
        },
      },
      select: {
        role: true,
        workspace: true,
      },
    });

    if (membership === null) {
      return null;
    }

    return {
      ...toWorkspace(membership.workspace),
      role: membership.role,
    };
  }
}
