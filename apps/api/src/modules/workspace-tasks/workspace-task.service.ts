import { AppError } from '../../lib/errors/app-error.ts';

import type {
  ListWorkspaceTasksQuery,
  WorkspaceTaskPage,
  WorkspaceTaskRepository,
} from './workspace-task.repository.ts';

export class WorkspaceTaskService {
  private readonly repository: WorkspaceTaskRepository;

  constructor(repository: WorkspaceTaskRepository) {
    this.repository = repository;
  }

  async listWorkspaceTasks(
    userId: string,
    workspaceId: string,
    query: ListWorkspaceTasksQuery
  ): Promise<WorkspaceTaskPage> {
    const page = await this.repository.listForMember(
      userId,
      workspaceId,
      query
    );

    if (page === null) {
      throw new AppError(404, 'WORKSPACE_NOT_FOUND', 'Workspace not found');
    }

    return page;
  }
}
