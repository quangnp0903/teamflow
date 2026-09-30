import express from 'express';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';

import { errorHandler } from './middleware/error-handler.ts';
import type { TaskRepository } from './modules/tasks/task.repository.ts';
import { TaskController } from './modules/tasks/task.controller.ts';
import { createTaskRouter } from './modules/tasks/task.routes.ts';
import { TaskService } from './modules/tasks/task.service.ts';
import { AuthController } from './modules/auth/auth.controller.ts';
import type { PasswordHasher } from './modules/auth/password-hasher.ts';
import { createAuthRouter } from './modules/auth/auth.routes.ts';
import { AuthService } from './modules/auth/auth.service.ts';
import type { UserRepository } from './modules/users/user.repository.ts';
import type { SessionRepository } from './modules/sessions/session.repository.ts';
import type { SessionTokenManager } from './modules/auth/session-token-manager.ts';
import { requireTrustedOrigin } from './middleware/require-trusted-origin.ts';

type AppDependencies = {
  taskRepository: TaskRepository;
  userRepository: UserRepository;
  sessionRepository: SessionRepository;
  passwordHasher: PasswordHasher;
  sessionTokenManager: SessionTokenManager;
  secureSessionCookie: boolean;
  trustedOrigins: readonly string[];
};

export function createApp({
  taskRepository,
  userRepository,
  sessionRepository,
  passwordHasher,
  sessionTokenManager,
  secureSessionCookie,
  trustedOrigins,
}: AppDependencies) {
  const app = express();

  app.disable('x-powered-by');

  app.use(helmet());
  app.use('/api', requireTrustedOrigin(trustedOrigins));
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());

  const taskService = new TaskService(taskRepository);
  const taskController = new TaskController(taskService);

  const authService = new AuthService(
    userRepository,
    passwordHasher,
    sessionRepository,
    sessionTokenManager
  );
  const authController = new AuthController(authService, {
    secureSessionCookie,
  });

  app.get('/api/health', (_request, response) => {
    response.status(200).json({
      data: { status: 'ok' },
    });
  });

  app.use('/api/auth', createAuthRouter(authController));
  app.use('/api/tasks', createTaskRouter(taskController));

  app.use((_request, response) => {
    response.status(404).json({
      error: {
        code: 'NOT_FOUND',
        message: 'Route not found',
      },
    });
  });

  app.use(errorHandler);

  return app;
}
