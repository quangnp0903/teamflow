import { Router } from 'express';

import type { TaskController } from './task.controller.ts';

export function createTaskRouter(controller: TaskController) {
  const router = Router();

  router.get('/', controller.list);
  router.post('/', controller.create);

  return router;
}
