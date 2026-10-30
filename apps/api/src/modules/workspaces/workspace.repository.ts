import type {
  Workspace,
  WorkspaceMemberSummary,
  WorkspaceWithRole,
} from './workspace.model.ts';

export type CreateWorkspaceRecord = Readonly<{
  name: string;
  ownerId: string;
}>;

export type RenameWorkspaceRecord = Pick<Workspace, 'name'>;

export type AddWorkspaceMemberResult =
  | Readonly<{
      status: 'added';
      member: WorkspaceMemberSummary;
    }>
  | Readonly<{
      status: 'already_member';
    }>
  | Readonly<{
      status: 'unavailable';
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

  /**
   * Renames a workspace only when the requester is an owner or admin.
   * Returns null when no workspace matches that permission scope.
   */
  renameForManager(
    userId: string,
    workspaceId: string,
    input: RenameWorkspaceRecord
  ): Promise<Workspace | null>;

  /**
   * Adds an existing user as a member when the requester is an owner or admin.
   * Returns unavailable when the required workspace/user cannot be connected
   * within that permission scope.
   */
  addMemberForManager(
    requesterId: string,
    workspaceId: string,
    targetUserId: string
  ): Promise<AddWorkspaceMemberResult>;
}
