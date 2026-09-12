import type { Request, Response } from 'express';

import { createTaskSchema } from './task.schema.ts';
import type { TaskService } from './task.service.ts';

export class TaskController {
  private readonly service: TaskService;

  constructor(service: TaskService) {
    this.service = service;
  }

  list = async (_request: Request, response: Response) => {
    const tasks = await this.service.listTasks();

    response.status(200).json({
      data: tasks,
    });
  };

  create = async (request: Request, response: Response) => {
    const input = createTaskSchema.parse(request.body);
    const task = await this.service.createTask(input);

    response.status(201).json({ data: task });
  };
}
