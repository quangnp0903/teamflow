export const WORKSPACE_ROLES = ['owner', 'admin', 'member'] as const;

export type WorkspaceRole = (typeof WORKSPACE_ROLES)[number];

export type Workspace = Readonly<{
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}>;

export type WorkspaceWithRole = Workspace &
  Readonly<{
    role: WorkspaceRole;
  }>;

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

export type WorkspaceMemberSummary = Readonly<{
  id: string;
  userId: string;
  displayName: string;
  role: WorkspaceRole;
  joinedAt: string;
}>;

export type WorkspaceMemberListResponse = Readonly<{
  data: readonly WorkspaceMemberSummary[];
}>;
