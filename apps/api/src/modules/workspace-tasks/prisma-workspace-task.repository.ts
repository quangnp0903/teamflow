import { Prisma, type PrismaClient } from '../../generated/prisma/client.ts';

import type {
  ListWorkspaceTasksQuery,
  WorkspaceTaskPage,
  WorkspaceTaskRepository,
} from './workspace-task.repository.ts';

export class PrismaWorkspaceTaskRepository implements WorkspaceTaskRepository {
  private readonly client: PrismaClient;

  constructor(client: PrismaClient) {
    this.client = client;
  }

  async listForMember(
    userId: string,
    workspaceId: string,
    query: ListWorkspaceTasksQuery
  ): Promise<WorkspaceTaskPage | null> {
    const taskWhere: Prisma.TaskWhereInput = {};

    if (query.status !== undefined) {
      taskWhere.status = query.status;
    }

    if (query.search !== undefined) {
      taskWhere.OR = [
        {
          title: {
            contains: query.search,
            mode: 'insensitive',
          },
        },
        {
          description: {
            contains: query.search,
            mode: 'insensitive',
          },
        },
      ];
    }

    const offset = (query.page - 1) * query.pageSize;

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
        id: true,
        tasks: {
          where: taskWhere,
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          skip: offset,
          take: query.pageSize,
        },
        _count: {
          select: {
            tasks: {
              where: taskWhere,
            },
          },
        },
      },
    });

    if (workspace === null) {
      return null;
    }

    return {
      items: workspace.tasks.map((task) => ({
        id: task.id,
        workspaceId: workspace.id,
        createdById: task.ownerId,
        title: task.title,
        description: task.description,
        status: task.status,
        createdAt: task.createdAt.toISOString(),
        updatedAt: task.updatedAt.toISOString(),
      })),
      total: workspace._count.tasks,
    };
  }
}
