import type { Request, Response } from 'express';

import { AppError } from '../../lib/errors/app-error.ts';

import {
  createWorkspaceTaskSchema,
  listWorkspaceTasksQuerySchema,
  updateWorkspaceTaskStatusSchema,
  workspaceTaskCollectionParamsSchema,
  workspaceTaskItemParamsSchema,
} from './workspace-task.schema.ts';
import type { WorkspaceTaskService } from './workspace-task.service.ts';

export class WorkspaceTaskController {
  private readonly service: WorkspaceTaskService;

  constructor(service: WorkspaceTaskService) {
    this.service = service;
  }

  list = async (request: Request, response: Response) => {
    const user = request.user;

    if (user === undefined) {
      throw new AppError(401, 'UNAUTHENTICATED', 'Authentication required');
    }

    const { workspaceId } = workspaceTaskCollectionParamsSchema.parse(
      request.params
    );

    const query = listWorkspaceTasksQuerySchema.parse(request.query);

    const page = await this.service.listWorkspaceTasks(
      user.id,
      workspaceId,
      query
    );

    response.status(200).json({
      data: page.items,
      meta: {
        page: query.page,
        pageSize: query.pageSize,
        total: page.total,
        totalPages: Math.ceil(page.total / query.pageSize),
      },
    });
  };

  create = async (request: Request, response: Response) => {
    const user = request.user;

    if (user === undefined) {
      throw new AppError(401, 'UNAUTHENTICATED', 'Authentication required');
    }

    const { workspaceId } = workspaceTaskCollectionParamsSchema.parse(
      request.params
    );

    const input = createWorkspaceTaskSchema.parse(request.body);

    const task = await this.service.createWorkspaceTask(
      user.id,
      workspaceId,
      input
    );

    response.status(201).json({
      data: task,
    });
  };

  updateStatus = async (request: Request, response: Response) => {
    const user = request.user;

    if (user === undefined) {
      throw new AppError(401, 'UNAUTHENTICATED', 'Authentication required');
    }

    const { workspaceId, taskId } = workspaceTaskItemParamsSchema.parse(
      request.params
    );

    const input = updateWorkspaceTaskStatusSchema.parse(request.body);

    const task = await this.service.updateTaskStatus(
      user.id,
      workspaceId,
      taskId,
      input
    );

    response.status(200).json({
      data: task,
    });
  };
}
