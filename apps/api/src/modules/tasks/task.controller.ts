import type { Request, Response } from 'express';

import {
  createTaskSchema,
  taskParamsSchema,
  updateTaskSchema,
} from './task.schema.ts';
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

  getById = async (request: Request, response: Response) => {
    const { taskId } = taskParamsSchema.parse(request.params);
    const task = await this.service.getTaskById(taskId);

    response.status(200).json({
      data: task,
    });
  };

  update = async (request: Request, response: Response) => {
    const { taskId } = taskParamsSchema.parse(request.params);
    const input = updateTaskSchema.parse(request.body);

    const task = await this.service.updateTask(taskId, input);

    response.status(200).json({
      data: task,
    });
  };
}
