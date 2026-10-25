import type { WorkspaceRole } from './workspace.model.ts';

export const WORKSPACE_MANAGER_ROLES = [
  'owner',
  'admin',
] as const satisfies readonly WorkspaceRole[];

export function canManageWorkspace(role: WorkspaceRole): boolean {
  return WORKSPACE_MANAGER_ROLES.some((allowedRole) => allowedRole === role);
}
