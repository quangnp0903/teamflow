import type { RouteObject } from 'react-router';

import WorkspacesPage from './pages/WorkspacesPage';
import WorkspaceDetailsPage from './pages/WorkspaceDetailsPage';

export const workspaceRoutes = [
  {
    index: true,
    Component: WorkspacesPage,
  },
  {
    path: ':workspaceId',
    Component: WorkspaceDetailsPage,
  },
] satisfies RouteObject[];
