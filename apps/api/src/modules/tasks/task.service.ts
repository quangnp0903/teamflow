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

  async listTasks(ownerId: string, query: ListTasksQuery): Promise<TaskPage> {
    return this.repository.list(ownerId, query);
  }

  async createTask(ownerId: string, input: CreateTaskInput) {
    return this.repository.create({
      ownerId,
      title: input.title,
      description: input.description ?? null,
      status: 'todo',
    });
  }

  async getTaskById(ownerId: string, id: string) {
    const task = await this.repository.findById(ownerId, id);

    if (task === null) {
      throw new AppError(404, 'TASK_NOT_FOUND', 'Task not found');
    }

    return task;
  }

  async updateTask(
    ownerId: string,
    id: string,
    input: UpdateTaskInput
  ): Promise<Task> {
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

    const task = await this.repository.update(ownerId, id, changes);

    if (task === null) {
      throw new AppError(404, 'TASK_NOT_FOUND', 'Task not found');
    }

    return task;
  }

  async deleteTask(ownerId: string, id: string): Promise<void> {
    const deleted = await this.repository.delete(ownerId, id);

    if (!deleted) {
      throw new AppError(404, 'TASK_NOT_FOUND', 'Task not found');
    }
  }
}
