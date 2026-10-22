import type { WorkspaceRole } from './workspace.types';

export const WORKSPACE_ROLE_LABELS = {
  owner: 'Owner',
  admin: 'Admin',
  member: 'Member',
} satisfies Record<WorkspaceRole, string>;
