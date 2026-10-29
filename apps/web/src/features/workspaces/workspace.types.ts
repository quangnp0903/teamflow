import type {
  Workspace,
  WorkspaceWithRole,
  WorkspaceMemberSummary,
} from '@teamflow/contracts/workspaces';

export { WORKSPACE_ROLES } from '@teamflow/contracts/workspaces';

export type {
  Workspace,
  WorkspaceRole,
  WorkspaceWithRole,
  WorkspaceMemberSummary,
  RenameWorkspaceInput,
} from '@teamflow/contracts/workspaces';

export type CreateWorkspaceInput = Readonly<{
  name: string;
}>;

export type WorkspaceResponse = Readonly<{
  data: Workspace;
}>;

export type WorkspaceListResponse = Readonly<{
  data: readonly WorkspaceWithRole[];
}>;

export type WorkspaceDetailsResponse = Readonly<{
  data: WorkspaceWithRole;
}>;

export type WorkspaceMemberListResponse = Readonly<{
  data: readonly WorkspaceMemberSummary[];
}>;
