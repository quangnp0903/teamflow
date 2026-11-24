import type {
  WorkspaceTask,
  UpdateWorkspaceTaskInput,
} from '@teamflow/contracts/tasks';

import {
  Prisma,
  type PrismaClient,
  type Task as PrismaTask,
} from '../../generated/prisma/client.ts';

import type {
  ListWorkspaceTasksQuery,
  WorkspaceTaskPage,
  WorkspaceTaskRepository,
  CreateWorkspaceTaskRecord,
} from './workspace-task.repository.ts';
import { WORKSPACE_MANAGER_ROLES } from '../workspaces/workspace.permission.ts';

function toWorkspaceTask(task: PrismaTask): WorkspaceTask {
  if (task.workspaceId === null) {
    throw new Error('Expected a task belonging to a workspace');
  }

  return {
    id: task.id,
    workspaceId: task.workspaceId,
    createdById: task.ownerId,
    title: task.title,
    description: task.description,
    status: task.status,
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
  };
}

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
      items: workspace.tasks.map(toWorkspaceTask),
      total: workspace._count.tasks,
    };
  }

  async createForMember(
    userId: string,
    workspaceId: string,
    input: CreateWorkspaceTaskRecord
  ): Promise<WorkspaceTask | null> {
    try {
      const task = await this.client.task.create({
        data: {
          title: input.title,
          description: input.description,
          status: 'todo',
          owner: {
            connect: {
              id: userId,
            },
          },
          workspace: {
            connect: {
              id: workspaceId,
              members: {
                some: {
                  userId,
                },
              },
            },
          },
        },
      });

      return toWorkspaceTask(task);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        return null;
      }

      throw error;
    }
  }

  async updateForUser(
    userId: string,
    workspaceId: string,
    taskId: string,
    input: UpdateWorkspaceTaskInput
  ): Promise<WorkspaceTask | null> {
    const data: Prisma.TaskUpdateManyMutationInput = {};

    if (input.title !== undefined) {
      data.title = input.title;
    }

    if (input.description !== undefined) {
      data.description = input.description;
    }

    if (input.status !== undefined) {
      data.status = input.status;
    }

    const [task] = await this.client.task.updateManyAndReturn({
      where: {
        id: taskId,
        workspaceId,
        workspace: {
          members: {
            some: {
              userId,
            },
          },
        },
        OR: [
          {
            ownerId: userId,
          },
          {
            workspace: {
              members: {
                some: {
                  userId,
                  role: {
                    in: [...WORKSPACE_MANAGER_ROLES],
                  },
                },
              },
            },
          },
        ],
      },
      data,
    });

    return task === undefined ? null : toWorkspaceTask(task);
  }
}
