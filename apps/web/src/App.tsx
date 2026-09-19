import { useEffect, useState } from 'react';

import { createTask, listTasks, updateTask } from './features/tasks/task.api';
import type {
  CreateTaskInput,
  Task,
  TaskStatus,
} from './features/tasks/task.types';
import CreateTaskForm from './features/tasks/CreateTaskForm';
import TaskItem from './features/tasks/TaskItem';

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

  const handleCreateTask = async (input: CreateTaskInput): Promise<void> => {
    const createdTask = await createTask(input);

    setTasks((currentTasks) => [createdTask, ...currentTasks]);
  };

  const handleTaskStatusChange = async (
    taskId: string,
    status: TaskStatus
  ): Promise<void> => {
    const updatedTask = await updateTask(taskId, { status });

    setTasks((currentTasks) =>
      currentTasks.map((task) => (task.id === taskId ? updatedTask : task))
    );
  };

  useEffect(() => {
    let isCurrent = true;

    async function loadTasks() {
      try {
        const page = await listTasks();

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
  }, []);

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

        {isLoading && <p role="status">Loading tasks…</p>}

        {!isLoading && errorMessage !== null && (
          <p className="error-message" role="alert">
            {errorMessage}
          </p>
        )}

        {!isLoading && errorMessage === null && tasks.length === 0 && (
          <p>No tasks yet.</p>
        )}

        {!isLoading && errorMessage === null && tasks.length > 0 && (
          <ul className="task-list">
            {tasks.map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                onStatusChange={handleTaskStatusChange}
              />
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

export default App;
