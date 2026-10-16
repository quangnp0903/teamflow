import type { Workspace, WorkspaceWithRole } from './workspace.model.ts';
import type { WorkspaceRepository } from './workspace.repository.ts';
import type { CreateWorkspaceInput } from './workspace.schema.ts';
import { AppError } from '../../lib/errors/app-error.ts';

export class WorkspaceService {
  private readonly repository: WorkspaceRepository;

  constructor(repository: WorkspaceRepository) {
    this.repository = repository;
  }

  async createWorkspace(
    ownerId: string,
    input: CreateWorkspaceInput
  ): Promise<Workspace> {
    return this.repository.createWithOwner({
      name: input.name,
      ownerId,
    });
  }

  async listWorkspaces(userId: string): Promise<readonly WorkspaceWithRole[]> {
    return this.repository.listForUser(userId);
  }

  async getWorkspaceById(
    userId: string,
    workspaceId: string
  ): Promise<WorkspaceWithRole> {
    const workspace = await this.repository.findForUser(userId, workspaceId);

    if (workspace === null) {
      throw new AppError(404, 'WORKSPACE_NOT_FOUND', 'Workspace not found');
    }

    return workspace;
  }
}
