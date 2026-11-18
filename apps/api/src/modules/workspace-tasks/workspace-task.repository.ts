import type { TaskStatus, WorkspaceTask } from '@teamflow/contracts/tasks';

export type ListWorkspaceTasksQuery = Readonly<{
  status?: TaskStatus | undefined;
  search?: string | undefined;
  page: number;
  pageSize: number;
}>;

export type WorkspaceTaskPage = Readonly<{
  items: readonly WorkspaceTask[];
  total: number;
}>;

export type CreateWorkspaceTaskRecord = Pick<
  WorkspaceTask,
  'title' | 'description'
>;

export interface WorkspaceTaskRepository {
  /**
   * Returns null when the workspace is missing or the requester
   * is not a current member.
   */
  listForMember(
    userId: string,
    workspaceId: string,
    query: ListWorkspaceTasksQuery
  ): Promise<WorkspaceTaskPage | null>;

  /**
   * Creates a task when the requester can connect to the workspace
   * as a current member. Returns null when that context is unavailable.
   */
  createForMember(
    userId: string,
    workspaceId: string,
    input: CreateWorkspaceTaskRecord
  ): Promise<WorkspaceTask | null>;
}
