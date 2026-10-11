import useAuth from './features/auth/useAuth';
import TasksPage from './features/tasks/TasksPage';

function App() {
  const { state } = useAuth();

  if (state.status === 'authenticated') {
    return <TasksPage />;
  }

  return (
    <main className="app-shell">
      <header className="page-header">
        <p className="eyebrow">TeamFlow</p>
        <h1>Welcome to TeamFlow</h1>
      </header>

      {state.status === 'loading' && (
        <p role="status">Checking your session…</p>
      )}

      {state.status === 'error' && (
        <p role="alert" className="error-message">
          {state.message}
        </p>
      )}

      {state.status === 'unauthenticated' && (
        <section className="task-section" aria-labelledby="sign-in-heading">
          <h2 id="sign-in-heading">Sign in</h2>
          <p>Sign in to manage your tasks.</p>
        </section>
      )}
    </main>
  );
}

export default App;
