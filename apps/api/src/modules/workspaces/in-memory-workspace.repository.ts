import { randomUUID } from 'node:crypto';

import type {
  Workspace,
  WorkspaceMember,
  WorkspaceMemberSummary,
  WorkspaceWithRole,
} from './workspace.model.ts';
import type {
  CreateWorkspaceRecord,
  WorkspaceRepository,
} from './workspace.repository.ts';
import type { UserRepository } from '../users/user.repository.ts';

export class InMemoryWorkspaceRepository implements WorkspaceRepository {
  private readonly workspaces: Workspace[] = [];
  private readonly members: WorkspaceMember[] = [];
  private readonly userRepository: Pick<UserRepository, 'findById'>;

  constructor(userRepository: Pick<UserRepository, 'findById'>) {
    this.userRepository = userRepository;
  }

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

  async findForUser(
    userId: string,
    workspaceId: string
  ): Promise<WorkspaceWithRole | null> {
    const membership = this.members.find(
      (member) => member.userId === userId && member.workspaceId === workspaceId
    );

    if (membership === undefined) {
      return null;
    }

    const workspace = this.workspaces.find(
      (workspace) => workspace.id === workspaceId
    );

    if (workspace === undefined) {
      return null;
    }

    return {
      ...workspace,
      role: membership.role,
    };
  }

  async listWorkspaceMembersForUser(
    userId: string,
    workspaceId: string
  ): Promise<readonly WorkspaceMemberSummary[] | null> {
    const workspace = await this.findForUser(userId, workspaceId);

    if (workspace === null) {
      return null;
    }

    const memberships = this.members
      .filter((member) => member.workspaceId === workspaceId)
      .sort((first, second) => {
        const dateComparison = first.createdAt.localeCompare(second.createdAt);

        if (dateComparison !== 0) {
          return dateComparison;
        }

        return first.id.localeCompare(second.id);
      });

    const summaries: WorkspaceMemberSummary[] = [];

    for (const membership of memberships) {
      const user = await this.userRepository.findById(membership.userId);

      if (user === null) {
        throw new Error('Workspace membership references a missing user');
      }

      summaries.push({
        id: membership.id,
        userId: membership.userId,
        displayName: user.displayName,
        role: membership.role,
        joinedAt: membership.createdAt,
      });
    }

    return summaries;
  }
}
