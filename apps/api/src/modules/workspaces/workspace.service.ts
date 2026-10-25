import type { RenameWorkspaceInput } from '@teamflow/contracts/workspaces';

import type {
  Workspace,
  WorkspaceMemberSummary,
  WorkspaceWithRole,
} from './workspace.model.ts';
import type { WorkspaceRepository } from './workspace.repository.ts';
import type { CreateWorkspaceInput } from './workspace.schema.ts';
import { AppError } from '../../lib/errors/app-error.ts';
import { canManageWorkspace } from './workspace.permission.ts';

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

  async listWorkspaceMembersForUser(
    userId: string,
    workspaceId: string
  ): Promise<readonly WorkspaceMemberSummary[]> {
    const members = await this.repository.listWorkspaceMembersForUser(
      userId,
      workspaceId
    );

    if (members === null) {
      throw new AppError(404, 'WORKSPACE_NOT_FOUND', 'Workspace not found');
    }

    return members;
  }

  async renameWorkspace(
    userId: string,
    workspaceId: string,
    input: RenameWorkspaceInput
  ): Promise<Workspace> {
    const workspace = await this.getWorkspaceById(userId, workspaceId);

    if (!canManageWorkspace(workspace.role)) {
      throw new AppError(
        403,
        'WORKSPACE_FORBIDDEN',
        'You do not have permission to rename this workspace'
      );
    }

    const renamedWorkspace = await this.repository.renameForManager(
      userId,
      workspaceId,
      { name: input.name }
    );

    if (renamedWorkspace === null) {
      throw new AppError(404, 'WORKSPACE_NOT_FOUND', 'Workspace not found');
    }

    return renamedWorkspace;
  }
}
