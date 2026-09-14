import type { CreateTaskInput, UpdateTaskInput } from './task.schema.ts';
import type {
  TaskRepository,
  UpdateTaskRecord,
  ListTasksQuery,
  TaskPage,
} from './task.repository.ts';
import { AppError } from '../../lib/errors/app-error.ts';
import type { Task } from './task.model.ts';

export class TaskService {
  private readonly repository: TaskRepository;

  constructor(repository: TaskRepository) {
    this.repository = repository;
  }

  async listTasks(query: ListTasksQuery): Promise<TaskPage> {
    return this.repository.list(query);
  }

  async createTask(input: CreateTaskInput) {
    return this.repository.create({
      title: input.title,
      description: input.description ?? null,
      status: 'todo',
    });
  }

  async getTaskById(id: string) {
    const task = await this.repository.findById(id);

    if (task === null) {
      throw new AppError(404, 'TASK_NOT_FOUND', 'Task not found');
    }

    return task;
  }

  async updateTask(id: string, input: UpdateTaskInput): Promise<Task> {
    const changes: UpdateTaskRecord = {};

    if (input.title !== undefined) {
      changes.title = input.title;
    }

    if (input.description !== undefined) {
      changes.description = input.description;
    }

    if (input.status !== undefined) {
      changes.status = input.status;
    }

    const task = await this.repository.update(id, changes);

    if (task === null) {
      throw new AppError(404, 'TASK_NOT_FOUND', 'Task not found');
    }

    return task;
  }
}
