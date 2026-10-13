import { randomUUID } from 'node:crypto';

import type { Workspace, WorkspaceMember } from './workspace.model.ts';
import type {
  CreateWorkspaceRecord,
  WorkspaceRepository,
} from './workspace.repository.ts';

export class InMemoryWorkspaceRepository implements WorkspaceRepository {
  private readonly workspaces: Workspace[] = [];
  private readonly members: WorkspaceMember[] = [];

  async createWithOwner(input: CreateWorkspaceRecord): Promise<Workspace> {
    const now = new Date().toISOString();

    const workspace: Workspace = {
      id: randomUUID(),
      name: input.name,
      createdAt: now,
      updatedAt: now,
    };

    const member: WorkspaceMember = {
      id: randomUUID(),
      workspaceId: workspace.id,
      userId: input.ownerId,
      role: 'owner',
      createdAt: now,
      updatedAt: now,
    };

    this.workspaces.push(workspace);
    this.members.push(member);

    return workspace;
  }
}
