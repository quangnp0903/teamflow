import type { Request, Response } from 'express';

import { AppError } from '../../lib/errors/app-error.ts';

import {
  listWorkspaceTasksQuerySchema,
  workspaceTaskListParamsSchema,
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

    const { workspaceId } = workspaceTaskListParamsSchema.parse(request.params);

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
}
