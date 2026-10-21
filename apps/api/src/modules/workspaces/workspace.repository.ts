import type {
  Workspace,
  WorkspaceMemberSummary,
  WorkspaceWithRole,
} from './workspace.model.ts';

export type CreateWorkspaceRecord = Readonly<{
  name: string;
  ownerId: string;
}>;

export interface WorkspaceRepository {
  /**
   * Creates a workspace and its owner's membership atomically.
   */
  createWithOwner(input: CreateWorkspaceRecord): Promise<Workspace>;

  listForUser(userId: string): Promise<readonly WorkspaceWithRole[]>;

  findForUser(
    userId: string,
    workspaceId: string
  ): Promise<WorkspaceWithRole | null>;

  /** Returns null when the requester cannot access the workspace. */
  listWorkspaceMembersForUser(
    userId: string,
    workspaceId: string
  ): Promise<readonly WorkspaceMemberSummary[] | null>;
}
