import type { RouteObject } from 'react-router';

import TasksPage from './pages/TasksPage';

export const taskRoutes = [
  {
    index: true,
    Component: TasksPage,
  },
] satisfies RouteObject[];
