import { Router } from 'express';

import type { WorkspaceController } from './workspace.controller.ts';

export function createWorkspaceRouter(controller: WorkspaceController) {
  const router = Router();

  router.get('/', controller.list);
  router.get('/:workspaceId/members', controller.listMembers);
  router.post('/:workspaceId/members', controller.addMember);
  router.patch('/:workspaceId/members/:memberId', controller.updateMemberRole);
  router.get('/:workspaceId', controller.getById);
  router.patch('/:workspaceId', controller.rename);
  router.post('/', controller.create);
  router.delete('/:workspaceId/members/:memberId', controller.removeMember);

  return router;
}
