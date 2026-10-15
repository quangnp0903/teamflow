import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { appRoutes } from './app.routes';
import {
  AuthContext,
  type AuthContextValue,
} from './features/auth/auth.context';
import type { AuthState } from './features/auth/auth.types';

vi.mock('./features/tasks/pages/TasksPage', () => ({
  default: () => <h1>Tasks test page</h1>,
}));

vi.mock('./features/workspaces/pages/WorkspacesPage', () => ({
  default: () => <h1>Workspaces test page</h1>,
}));

const AUTHENTICATED_STATE = {
  status: 'authenticated',
  user: {
    id: '00000000-0000-4000-8000-000000000001',
    email: 'alice@example.com',
    displayName: 'Alice',
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-10-01T00:00:00.000Z',
  },
} satisfies AuthState;

let testRouter: ReturnType<typeof createMemoryRouter> | undefined;

afterEach(() => {
  testRouter?.dispose();
  testRouter = undefined;
});

function renderApp(state: AuthState, path = '/') {
  const authContextValue = {
    state,
    login: vi.fn().mockResolvedValue(undefined),
    logout: vi.fn().mockResolvedValue(undefined),
    register: vi.fn().mockResolvedValue(undefined),
  } satisfies AuthContextValue;

  testRouter = createMemoryRouter(appRoutes, {
    initialEntries: [path],
  });

  return render(
    <AuthContext value={authContextValue}>
      <RouterProvider router={testRouter} />
    </AuthContext>
  );
}

describe('application routing', () => {
  it('opens workspaces directly and navigates between features', async () => {
    const user = userEvent.setup();

    renderApp(AUTHENTICATED_STATE, '/workspaces');

    expect(
      screen.getByRole('heading', { name: 'Workspaces test page' })
    ).toBeInTheDocument();

    await user.click(screen.getByRole('link', { name: 'Tasks' }));

    expect(
      await screen.findByRole('heading', { name: 'Tasks test page' })
    ).toBeInTheDocument();

    expect(screen.getByRole('link', { name: 'Tasks' })).toHaveAttribute(
      'aria-current',
      'page'
    );

    await user.click(screen.getByRole('link', { name: 'Workspaces' }));

    expect(
      await screen.findByRole('heading', { name: 'Workspaces test page' })
    ).toBeInTheDocument();
  });

  it('shows sign-in instead of a protected page when signed out', () => {
    renderApp({ status: 'unauthenticated' }, '/workspaces');

    expect(
      screen.getByRole('heading', { name: 'Sign in' })
    ).toBeInTheDocument();

    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();

    expect(
      screen.queryByRole('heading', { name: 'Workspaces test page' })
    ).not.toBeInTheDocument();
  });

  it('keeps the protected page hidden while checking the session', () => {
    renderApp({ status: 'loading' }, '/workspaces');

    expect(screen.getByRole('status')).toHaveTextContent(
      'Checking your session'
    );

    expect(
      screen.queryByRole('heading', { name: 'Workspaces test page' })
    ).not.toBeInTheDocument();
  });

  it('shows the not-found screen and returns to tasks', async () => {
    const user = userEvent.setup();

    renderApp(AUTHENTICATED_STATE, '/missing-page');

    expect(
      screen.getByRole('heading', { name: 'Page not found' })
    ).toBeInTheDocument();

    await user.click(screen.getByRole('link', { name: 'Back to tasks' }));

    expect(
      await screen.findByRole('heading', { name: 'Tasks test page' })
    ).toBeInTheDocument();
  });
});
