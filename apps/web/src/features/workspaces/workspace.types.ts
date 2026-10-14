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
