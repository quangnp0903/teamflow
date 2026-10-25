import { Router } from 'express';

import type { WorkspaceController } from './workspace.controller.ts';

export function createWorkspaceRouter(controller: WorkspaceController) {
  const router = Router();

  router.get('/', controller.list);
  router.get('/:workspaceId/members', controller.listMembers);
  router.get('/:workspaceId', controller.getById);
  router.patch('/:workspaceId', controller.rename);
  router.post('/', controller.create);

  return router;
}
