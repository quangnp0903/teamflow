import CreateTaskForm from './features/tasks/CreateTaskForm';
import TaskItem from './features/tasks/TaskItem';
import TaskFilters from './features/tasks/TaskFilters';
import TaskPagination from './features/tasks/TaskPagination';
import useTasks from './features/tasks/useTasks';

function App() {
  const {
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
  } = useTasks();

  return (
    <main className="app-shell">
      <header className="page-header">
        <p className="eyebrow">TeamFlow</p>
        <h1>Tasks</h1>
        <p className="page-description">
          Organize your work and keep track of its progress.
        </p>
      </header>

      <CreateTaskForm onCreate={createTask} disabled={isLoading} />

      <section className="task-section" aria-labelledby="task-heading">
        <h2 id="task-heading">My tasks</h2>

        <TaskFilters disabled={isLoading} onApply={applyFilters} />

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
                onUpdate={updateTask}
                onDelete={deleteTask}
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
            onPageChange={changePage}
          />
        )}
      </section>
    </main>
  );
}

export default App;
