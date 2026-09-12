import express from 'express';
import helmet from 'helmet';

import { errorHandler } from './middleware/error-handler.ts';
import { InMemoryTaskRepository } from './modules/tasks/in-memory-task.repository.ts';
import { TaskController } from './modules/tasks/task.controller.ts';
import { createTaskRouter } from './modules/tasks/task.routes.ts';
import { TaskService } from './modules/tasks/task.service.ts';

export function createApp() {
  const app = express();

  app.disable('x-powered-by');

  app.use(helmet());
  app.use(express.json({ limit: '1mb' }));

  const taskRepository = new InMemoryTaskRepository();
  const taskService = new TaskService(taskRepository);
  const taskController = new TaskController(taskService);

  app.get('/api/health', (_request, response) => {
    response.status(200).json({
      data: { status: 'ok' },
    });
  });

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
