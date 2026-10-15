import { Link, type RouteObject } from 'react-router';

import App from './App';
import { taskRoutes } from './features/tasks/task.routes';
import { workspaceRoutes } from './features/workspaces/workspace.routes';

export const appRoutes = [
  {
    path: '/',
    Component: App,
    children: [
      ...taskRoutes,
      {
        path: 'workspaces',
        children: workspaceRoutes,
      },
      {
        path: '*',
        element: (
          <main className="app-shell">
            <h1>Page not found</h1>
            <p>That page doesn't exist.</p>
            <Link to="/">Back to tasks</Link>
          </main>
        ),
      },
    ],
  },
] satisfies RouteObject[];
