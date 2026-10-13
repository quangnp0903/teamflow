import { randomUUID } from 'node:crypto';

import type {
  Workspace,
  WorkspaceMember,
  WorkspaceWithRole,
} from './workspace.model.ts';
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

  async listForUser(userId: string): Promise<readonly WorkspaceWithRole[]> {
    const membershipsByWorkspaceId = new Map<string, WorkspaceMember>();

    for (const member of this.members) {
      if (member.userId === userId) {
        membershipsByWorkspaceId.set(member.workspaceId, member);
      }
    }

    const result: WorkspaceWithRole[] = [];

    for (const workspace of this.workspaces) {
      const membership = membershipsByWorkspaceId.get(workspace.id);

      if (membership !== undefined) {
        result.push({
          ...workspace,
          role: membership.role,
        });
      }
    }

    return result.sort((first, second) => {
      const dateComparison = second.createdAt.localeCompare(first.createdAt);

      if (dateComparison !== 0) {
        return dateComparison;
      }

      return second.id.localeCompare(first.id);
    });
  }
}
