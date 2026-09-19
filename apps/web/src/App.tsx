import { useEffect, useState } from 'react';

import { createTask, listTasks } from './features/tasks/task.api';
import type { CreateTaskInput, Task } from './features/tasks/task.types';
import CreateTaskForm from './features/tasks/CreateTaskForm';

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
              <li className="task-card" key={task.id}>
                <div className="task-card-header">
                  <h3>{task.title}</h3>
                  <span className="task-status">
                    {task.status.replaceAll('_', ' ')}
                  </span>
                </div>

                {task.description !== null && <p>{task.description}</p>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

export default App;
