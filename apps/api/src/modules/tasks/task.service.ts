import type { CreateTaskInput } from './task.schema.ts';
import type { TaskRepository } from './task.repository.ts';

export class TaskService {
  private readonly repository: TaskRepository;

  constructor(repository: TaskRepository) {
    this.repository = repository;
  }

  async listTasks() {
    return this.repository.list();
  }

  async createTask(input: CreateTaskInput) {
    return this.repository.create({
      title: input.title,
      description: input.description ?? null,
      status: 'todo',
    });
  }
}
