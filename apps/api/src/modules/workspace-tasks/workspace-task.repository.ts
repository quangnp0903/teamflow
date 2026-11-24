import type {
  TaskStatus,
  WorkspaceTask,
  UpdateWorkspaceTaskInput,
} from '@teamflow/contracts/tasks';

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

  /**
   * Updates a task when the requester is a current member and
   * either its creator or a workspace owner/admin.
   * Returns null when no task matches that permission scope.
   */
  updateForUser(
    userId: string,
    workspaceId: string,
    taskId: string,
    input: UpdateWorkspaceTaskInput
  ): Promise<WorkspaceTask | null>;
}
