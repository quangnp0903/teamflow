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
}
