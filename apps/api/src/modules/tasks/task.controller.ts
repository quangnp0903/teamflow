import type { Request, Response } from 'express';

import {
  createTaskSchema,
  taskParamsSchema,
  updateTaskSchema,
  listTasksQuerySchema,
} from './task.schema.ts';
import type { TaskService } from './task.service.ts';

export class TaskController {
  private readonly service: TaskService;

  constructor(service: TaskService) {
    this.service = service;
  }

  list = async (request: Request, response: Response) => {
    const query = listTasksQuerySchema.parse(request.query);
    const page = await this.service.listTasks(query);

    response.status(200).json({
      data: page.items,
      meta: {
        page: query.page,
        pageSize: query.pageSize,
        total: page.total,
        totalPages: Math.ceil(page.total / query.pageSize),
      },
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

  remove = async (request: Request, response: Response) => {
    const { taskId } = taskParamsSchema.parse(request.params);

    await this.service.deleteTask(taskId);

    response.status(204).send();
  };
}
