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
  TaskStatus,
} from './features/tasks/task.types';
import CreateTaskForm from './features/tasks/CreateTaskForm';
import TaskItem from './features/tasks/TaskItem';
import TaskFilters from './features/tasks/TaskFilters';

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return 'Tasks could not be loaded';
}

function App() {
  const [tasks, setTasks] = useState<readonly Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [filters, setFilters] = useState<ListTasksParams>({});
  const [refreshVersion, setRefreshVersion] = useState(0);

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
    setFilters(nextFilters);
  };

  useEffect(() => {
    let isCurrent = true;

    async function loadTasks() {
      try {
        const page = await listTasks(filters);

        if (isCurrent) {
          setTasks(page.data);
        }
      } catch (error) {
        if (isCurrent) {
          setErrorMessage(getErrorMessage(error));
        }
      } finally {
        if (isCurrent) {
          setIsLoading(false);
        }
      }
    }

    void loadTasks();

    return () => {
      isCurrent = false;
    };
  }, [filters, refreshVersion]);

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
      </section>
    </main>
  );
}

export default App;
