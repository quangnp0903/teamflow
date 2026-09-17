import { Router } from 'express';

import type { TaskController } from './task.controller.ts';

export function createTaskRouter(controller: TaskController) {
  const router = Router();

  router.get('/', controller.list);
  router.post('/', controller.create);
  router.get('/:taskId', controller.getById);
  router.patch('/:taskId', controller.update);
  router.delete('/:taskId', controller.remove);

  return router;
}
