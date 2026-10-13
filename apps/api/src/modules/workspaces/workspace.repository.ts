import type { Workspace } from './workspace.model.ts';

export type CreateWorkspaceRecord = Readonly<{
  name: string;
  ownerId: string;
}>;

export interface WorkspaceRepository {
  /**
   * Creates a workspace and its owner's membership atomically.
   */
  createWithOwner(input: CreateWorkspaceRecord): Promise<Workspace>;
}
