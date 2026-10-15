import type { RouteObject } from 'react-router';

import WorkspacesPage from './pages/WorkspacesPage';

export const workspaceRoutes = [
  {
    index: true,
    Component: WorkspacesPage,
  },
] satisfies RouteObject[];
