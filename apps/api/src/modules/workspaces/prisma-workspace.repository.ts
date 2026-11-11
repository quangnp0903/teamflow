import {
  ASSIGNABLE_WORKSPACE_ROLES,
  type UpdateWorkspaceMemberRoleInput,
} from '@teamflow/contracts/workspaces';

import {
  Prisma,
  type PrismaClient,
  type Workspace as PrismaWorkspace,
} from '../../generated/prisma/client.ts';

import type {
  Workspace,
  WorkspaceMemberSummary,
  WorkspaceWithRole,
} from './workspace.model.ts';
import {
  REMOVABLE_WORKSPACE_ROLES,
  WORKSPACE_MANAGER_ROLES,
} from './workspace.permission.ts';
import type {
  AddWorkspaceMemberResult,
  CreateWorkspaceRecord,
  RenameWorkspaceRecord,
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

  async listWorkspaceMembersForUser(
    userId: string,
    workspaceId: string
  ): Promise<readonly WorkspaceMemberSummary[] | null> {
    const workspace = await this.client.workspace.findFirst({
      where: {
        id: workspaceId,
        members: {
          some: {
            userId,
          },
        },
      },
      select: {
        members: {
          select: {
            id: true,
            userId: true,
            role: true,
            createdAt: true,
            user: {
              select: {
                displayName: true,
              },
            },
          },
          orderBy: [
            {
              createdAt: 'asc',
            },
            {
              id: 'asc',
            },
          ],
        },
      },
    });

    if (workspace === null) {
      return null;
    }

    return workspace.members.map((member) => ({
      id: member.id,
      userId: member.userId,
      displayName: member.user.displayName,
      role: member.role,
      joinedAt: member.createdAt.toISOString(),
    }));
  }

  async renameForManager(
    userId: string,
    workspaceId: string,
    input: RenameWorkspaceRecord
  ): Promise<Workspace | null> {
    const [workspace] = await this.client.workspace.updateManyAndReturn({
      where: {
        id: workspaceId,
        members: {
          some: {
            userId,
            role: {
              in: [...WORKSPACE_MANAGER_ROLES],
            },
          },
        },
      },
      data: {
        name: input.name,
      },
    });

    return workspace === undefined ? null : toWorkspace(workspace);
  }

  async addMemberForManager(
    requesterId: string,
    workspaceId: string,
    targetUserId: string
  ): Promise<AddWorkspaceMemberResult> {
    try {
      const membership = await this.client.workspaceMember.create({
        data: {
          role: 'member',
          workspace: {
            connect: {
              id: workspaceId,
              members: {
                some: {
                  userId: requesterId,
                  role: {
                    in: [...WORKSPACE_MANAGER_ROLES],
                  },
                },
              },
            },
          },
          user: {
            connect: {
              id: targetUserId,
            },
          },
        },
        select: {
          id: true,
          userId: true,
          role: true,
          createdAt: true,
          user: {
            select: {
              displayName: true,
            },
          },
        },
      });

      return {
        status: 'added',
        member: {
          id: membership.id,
          userId: membership.userId,
          displayName: membership.user.displayName,
          role: membership.role,
          joinedAt: membership.createdAt.toISOString(),
        },
      };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          return { status: 'already_member' };
        }

        if (error.code === 'P2025') {
          return { status: 'unavailable' };
        }
      }

      throw error;
    }
  }

  async updateMemberRoleForOwner(
    requesterId: string,
    workspaceId: string,
    memberId: string,
    input: UpdateWorkspaceMemberRoleInput
  ): Promise<WorkspaceMemberSummary | null> {
    const [membership] = await this.client.workspaceMember.updateManyAndReturn({
      where: {
        id: memberId,
        workspaceId,
        role: {
          in: [...ASSIGNABLE_WORKSPACE_ROLES],
        },
        workspace: {
          members: {
            some: {
              userId: requesterId,
              role: 'owner',
            },
          },
        },
      },
      data: {
        role: input.role,
      },
      select: {
        id: true,
        userId: true,
        role: true,
        createdAt: true,
        user: {
          select: {
            displayName: true,
          },
        },
      },
    });

    if (membership === undefined) {
      return null;
    }

    return {
      id: membership.id,
      userId: membership.userId,
      displayName: membership.user.displayName,
      role: membership.role,
      joinedAt: membership.createdAt.toISOString(),
    };
  }

  async removeMemberForOwner(
    requesterId: string,
    workspaceId: string,
    memberId: string
  ): Promise<boolean> {
    const result = await this.client.workspaceMember.deleteMany({
      where: {
        id: memberId,
        workspaceId,
        role: {
          in: [...REMOVABLE_WORKSPACE_ROLES],
        },
        workspace: {
          members: {
            some: {
              userId: requesterId,
              role: 'owner',
            },
          },
        },
      },
    });

    return result.count === 1;
  }
}
