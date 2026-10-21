export const WORKSPACE_ROLES = ['owner', 'admin', 'member'] as const;

export type WorkspaceRole = (typeof WORKSPACE_ROLES)[number];

export type Workspace = Readonly<{
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}>;

export type WorkspaceMember = Readonly<{
  id: string;
  workspaceId: string;
  userId: string;
  role: WorkspaceRole;
  createdAt: string;
  updatedAt: string;
}>;

export type WorkspaceWithRole = Workspace &
  Readonly<{
    role: WorkspaceRole;
  }>;

export type WorkspaceMemberSummary = Readonly<{
  id: string;
  userId: string;
  displayName: string;
  role: WorkspaceRole;
  joinedAt: string;
}>;
