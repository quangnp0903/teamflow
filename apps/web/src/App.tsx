import { Outlet } from 'react-router';

import AuthScreen from './features/auth/AuthScreen';
import useAuth from './features/auth/useAuth';
import AppNavigation from './components/AppNavigation';

function App() {
  const { state } = useAuth();

  if (state.status === 'authenticated') {
    return (
      <>
        <AppNavigation />
        <Outlet />
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
