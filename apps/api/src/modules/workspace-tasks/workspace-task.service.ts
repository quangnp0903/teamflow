import type {
  CreateWorkspaceTaskInput,
  UpdateWorkspaceTaskStatusInput,
  WorkspaceTask,
} from '@teamflow/contracts/tasks';

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

  async createWorkspaceTask(
    userId: string,
    workspaceId: string,
    input: CreateWorkspaceTaskInput
  ): Promise<WorkspaceTask> {
    const task = await this.repository.createForMember(userId, workspaceId, {
      title: input.title,
      description: input.description ?? null,
    });

    if (task === null) {
      throw new AppError(404, 'WORKSPACE_NOT_FOUND', 'Workspace not found');
    }

    return task;
  }

  async updateTaskStatus(
    userId: string,
    workspaceId: string,
    taskId: string,
    input: UpdateWorkspaceTaskStatusInput
  ): Promise<WorkspaceTask> {
    const task = await this.repository.updateStatusForUser(
      userId,
      workspaceId,
      taskId,
      input
    );

    if (task === null) {
      throw new AppError(
        404,
        'TASK_UNAVAILABLE',
        'Task not found or you do not have permission to update it'
      );
    }

    return task;
  }
}
