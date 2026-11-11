import type { WorkspaceRole } from './workspace.model.ts';

export const WORKSPACE_MANAGER_ROLES = [
  'owner',
  'admin',
] as const satisfies readonly WorkspaceRole[];

export const REMOVABLE_WORKSPACE_ROLES = [
  'admin',
  'member',
] as const satisfies readonly WorkspaceRole[];

export function canRemoveWorkspaceMembers(role: WorkspaceRole): boolean {
  return role === 'owner';
}

export function canManageWorkspace(role: WorkspaceRole): boolean {
  return WORKSPACE_MANAGER_ROLES.some((allowedRole) => allowedRole === role);
}

export function canChangeWorkspaceMemberRoles(role: WorkspaceRole): boolean {
  return role === 'owner';
}
