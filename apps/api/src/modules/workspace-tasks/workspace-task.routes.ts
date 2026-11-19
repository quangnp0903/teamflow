import { Router } from 'express';

import type { WorkspaceTaskController } from './workspace-task.controller.ts';

export function createWorkspaceTaskRouter(controller: WorkspaceTaskController) {
  const router = Router();

  router.get('/:workspaceId/tasks', controller.list);
  router.post('/:workspaceId/tasks', controller.create);

  return router;
}
