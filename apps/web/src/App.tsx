import { Link, Route, Routes } from 'react-router';

import AuthScreen from './features/auth/AuthScreen';
import useAuth from './features/auth/useAuth';
import TasksPage from './features/tasks/pages/TasksPage';
import AppNavigation from './components/AppNavigation';
import WorkspacesPage from './features/workspaces/pages/WorkspacesPage';

function App() {
  const { state } = useAuth();

  if (state.status === 'authenticated') {
    return (
      <>
        <AppNavigation />

        <Routes>
          <Route path="/" element={<TasksPage />} />

          <Route path="/workspaces" element={<WorkspacesPage />} />

          <Route
            path="*"
            element={
              <main className="app-shell">
                <h1>Page not found</h1>
                <p>That page doesn't exist.</p>
                <Link to="/">Back to tasks</Link>
              </main>
            }
          />
        </Routes>
      </>
    );
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

      {state.status === 'unauthenticated' && <AuthScreen />}
    </main>
  );
}

export default App;
