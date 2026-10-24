import type { WorkspaceRole } from '@teamflow/contracts/workspaces';

export { WORKSPACE_ROLES } from '@teamflow/contracts/workspaces';

export type {
  Workspace,
  WorkspaceRole,
  WorkspaceWithRole,
  WorkspaceMemberSummary,
} from '@teamflow/contracts/workspaces';

export type WorkspaceMember = Readonly<{
  id: string;
  workspaceId: string;
  userId: string;
  role: WorkspaceRole;
  createdAt: string;
  updatedAt: string;
}>;
