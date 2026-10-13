import { Router } from 'express';

import type { WorkspaceController } from './workspace.controller.ts';

export function createWorkspaceRouter(controller: WorkspaceController) {
  const router = Router();

  router.post('/', controller.create);

  return router;
}
