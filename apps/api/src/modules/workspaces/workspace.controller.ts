import type { Request, Response } from 'express';

import { AppError } from '../../lib/errors/app-error.ts';
import {
  createWorkspaceSchema,
  listWorkspacesQuerySchema,
  workspaceParamsSchema,
} from './workspace.schema.ts';
import type { WorkspaceService } from './workspace.service.ts';

export class WorkspaceController {
  private readonly service: WorkspaceService;

  constructor(service: WorkspaceService) {
    this.service = service;
  }

  create = async (request: Request, response: Response) => {
    const user = request.user;

    if (user === undefined) {
      throw new AppError(401, 'UNAUTHENTICATED', 'Authentication required');
    }

    const input = createWorkspaceSchema.parse(request.body);
    const workspace = await this.service.createWorkspace(user.id, input);

    response.status(201).json({
      data: workspace,
    });
  };

  list = async (request: Request, response: Response) => {
    const user = request.user;

    if (user === undefined) {
      throw new AppError(401, 'UNAUTHENTICATED', 'Authentication required');
    }

    listWorkspacesQuerySchema.parse(request.query);

    const workspaces = await this.service.listWorkspaces(user.id);

    response.status(200).json({
      data: workspaces,
    });
  };

  getById = async (request: Request, response: Response) => {
    const user = request.user;

    if (user === undefined) {
      throw new AppError(401, 'UNAUTHENTICATED', 'Authentication required');
    }

    const { workspaceId } = workspaceParamsSchema.parse(request.params);

    const workspace = await this.service.getWorkspaceById(user.id, workspaceId);

    response.status(200).json({
      data: workspace,
    });
  };
}
