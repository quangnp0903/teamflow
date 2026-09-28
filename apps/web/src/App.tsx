import { useEffect, useState } from 'react';

import {
  createTask,
  listTasks,
  updateTask,
  deleteTask,
} from './features/tasks/task.api';
import type {
  CreateTaskInput,
  ListTasksParams,
  Task,
  TaskPageMeta,
  TaskStatus,
} from './features/tasks/task.types';
import CreateTaskForm from './features/tasks/CreateTaskForm';
import TaskItem from './features/tasks/TaskItem';
import TaskFilters from './features/tasks/TaskFilters';
import TaskPagination from './features/tasks/TaskPagination';

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return 'Tasks could not be loaded';
}

const PAGE_SIZE = 5;

const INITIAL_PAGE_META = {
  page: 1,
  pageSize: PAGE_SIZE,
  total: 0,
  totalPages: 0,
} satisfies TaskPageMeta;

function App() {
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

  const handleCreateTask = async (input: CreateTaskInput): Promise<void> => {
    await createTask(input);
    refreshTasks();
  };

  const handleTaskStatusChange = async (
    taskId: string,
    status: TaskStatus
  ): Promise<void> => {
    await updateTask(taskId, { status });
    refreshTasks();
  };

  const handleDeleteTask = async (taskId: string): Promise<void> => {
    await deleteTask(taskId);
    refreshTasks();
  };

  const handleApplyFilters = (nextFilters: ListTasksParams) => {
    setIsLoading(true);
    setErrorMessage(null);
    setPage(1);
    setFilters(nextFilters);
  };

  const handlePageChange = (nextPage: number) => {
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

  return (
    <main className="app-shell">
      <header className="page-header">
        <p className="eyebrow">TeamFlow</p>
        <h1>Tasks</h1>
        <p className="page-description">
          Organize your work and keep track of its progress.
        </p>
      </header>

      <CreateTaskForm onCreate={handleCreateTask} disabled={isLoading} />

      <section className="task-section" aria-labelledby="task-heading">
        <h2 id="task-heading">My tasks</h2>

        <TaskFilters disabled={isLoading} onApply={handleApplyFilters} />

        {isLoading && <p role="status">Loading tasks…</p>}

        {!isLoading && errorMessage !== null && (
          <p className="error-message" role="alert">
            {errorMessage}
          </p>
        )}

        {!isLoading && errorMessage === null && tasks.length === 0 && (
          <p>
            {hasActiveFilters
              ? 'No tasks match these filters.'
              : 'No tasks yet.'}
          </p>
        )}

        {!isLoading && errorMessage === null && tasks.length > 0 && (
          <ul className="task-list">
            {tasks.map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                onStatusChange={handleTaskStatusChange}
                onDelete={handleDeleteTask}
              />
            ))}
          </ul>
        )}

        {errorMessage === null && (
          <TaskPagination
            disabled={isLoading}
            page={pageMeta.page}
            total={pageMeta.total}
            totalPages={pageMeta.totalPages}
            onPageChange={handlePageChange}
          />
        )}
      </section>
    </main>
  );
}

export default App;
