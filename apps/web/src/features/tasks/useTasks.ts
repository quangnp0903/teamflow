import { useEffect, useState } from 'react';

import {
  createTask as createTaskRequest,
  deleteTask as deleteTaskRequest,
  listTasks,
  updateTask as updateTaskRequest,
} from './task.api';
import type {
  CreateTaskInput,
  ListTasksParams,
  Task,
  TaskPageMeta,
  UpdateTaskInput,
} from './task.types';

const PAGE_SIZE = 5;

const INITIAL_PAGE_META = {
  page: 1,
  pageSize: PAGE_SIZE,
  total: 0,
  totalPages: 0,
} satisfies TaskPageMeta;

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Tasks could not be loaded';
}

type UseTasksResult = Readonly<{
  tasks: readonly Task[];
  isLoading: boolean;
  errorMessage: string | null;
  hasActiveFilters: boolean;
  pageMeta: TaskPageMeta;
  createTask(input: CreateTaskInput): Promise<void>;
  updateTask(taskId: string, input: UpdateTaskInput): Promise<void>;
  deleteTask(taskId: string): Promise<void>;
  applyFilters(filters: ListTasksParams): void;
  changePage(page: number): void;
}>;

function useTasks(): UseTasksResult {
  const [tasks, setTasks] = useState<readonly Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [filters, setFilters] = useState<ListTasksParams>({});
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [page, setPage] = useState(1);
  const [pageMeta, setPageMeta] = useState<TaskPageMeta>(INITIAL_PAGE_META);

  const hasActiveFilters =
    filters.search !== undefined || filters.status !== undefined;

  const refreshTasks = () => {
    setIsLoading(true);
    setErrorMessage(null);
    setRefreshVersion((currentVersion) => currentVersion + 1);
  };

  const createTask = async (input: CreateTaskInput): Promise<void> => {
    await createTaskRequest(input);
    refreshTasks();
  };

  const updateTask = async (
    taskId: string,
    input: UpdateTaskInput
  ): Promise<void> => {
    await updateTaskRequest(taskId, input);
    refreshTasks();
  };

  const deleteTask = async (taskId: string): Promise<void> => {
    await deleteTaskRequest(taskId);
    refreshTasks();
  };

  const applyFilters = (nextFilters: ListTasksParams) => {
    setIsLoading(true);
    setErrorMessage(null);
    setPage(1);
    setFilters(nextFilters);
  };

  const changePage = (nextPage: number) => {
    setIsLoading(true);
    setErrorMessage(null);
    setPage(nextPage);
  };

  useEffect(() => {
    let isCurrent = true;

    async function loadTasks() {
      let shouldFinishLoading = true;

      try {
        const taskPage = await listTasks({
          ...filters,
          page,
          pageSize: PAGE_SIZE,
        });

        if (isCurrent) {
          const lastAvailablePage = Math.max(taskPage.meta.totalPages, 1);

          if (page > lastAvailablePage) {
            shouldFinishLoading = false;
            setPage(lastAvailablePage);
            return;
          }

          setTasks(taskPage.data);
          setPageMeta(taskPage.meta);
        }
      } catch (error) {
        if (isCurrent) {
          setErrorMessage(getErrorMessage(error));
        }
      } finally {
        if (isCurrent && shouldFinishLoading) {
          setIsLoading(false);
        }
      }
    }

    void loadTasks();

    return () => {
      isCurrent = false;
    };
  }, [filters, page, refreshVersion]);

  return {
    tasks,
    isLoading,
    errorMessage,
    hasActiveFilters,
    pageMeta,
    createTask,
    updateTask,
    deleteTask,
    applyFilters,
    changePage,
  };
}

export default useTasks;
