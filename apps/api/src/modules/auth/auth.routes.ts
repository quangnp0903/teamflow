import { Router } from 'express';

import type { AuthController } from './auth.controller.ts';

export function createAuthRouter(controller: AuthController) {
  const router = Router();

  router.get('/me', controller.me);
  router.post('/register', controller.register);
  router.post('/login', controller.login);

  return router;
}
