import type { Workspace } from './workspace.model.ts';
import type { WorkspaceRepository } from './workspace.repository.ts';
import type { CreateWorkspaceInput } from './workspace.schema.ts';

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
}
