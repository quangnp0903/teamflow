import { randomUUID } from 'node:crypto';

import type { Task } from './task.model.ts';
import type {
  CreateTaskRecord,
  ListTasksQuery,
  TaskPage,
  TaskRepository,
  UpdateTaskRecord,
} from './task.repository.ts';

export class InMemoryTaskRepository implements TaskRepository {
  private readonly tasks: Task[] = [];

  async list(ownerId: string, query: ListTasksQuery): Promise<TaskPage> {
    let matchingTasks = this.tasks.filter((task) => task.ownerId === ownerId);

    if (query.status !== undefined) {
      matchingTasks = matchingTasks.filter(
        (task) => task.status === query.status
      );
    }

    if (query.search !== undefined) {
      const normalizedSearch = query.search.toLowerCase();

      matchingTasks = matchingTasks.filter((task) => {
        const titleMatches = task.title
          .toLowerCase()
          .includes(normalizedSearch);

        const descriptionMatches =
          task.description?.toLowerCase().includes(normalizedSearch) ?? false;

        return titleMatches || descriptionMatches;
      });
    }

    matchingTasks.sort((firstTask, secondTask) => {
      const dateComparison = secondTask.createdAt.localeCompare(
        firstTask.createdAt
      );

      if (dateComparison !== 0) {
        return dateComparison;
      }

      return secondTask.id.localeCompare(firstTask.id);
    });

    const total = matchingTasks.length;
    const offset = (query.page - 1) * query.pageSize;
    const items = matchingTasks.slice(offset, offset + query.pageSize);

    return { items, total };
  }

  async create(input: CreateTaskRecord): Promise<Task> {
    const now = new Date().toISOString();

    const task: Task = {
      id: randomUUID(),
      ...input,
      createdAt: now,
      updatedAt: now,
    };

    this.tasks.push(task);

    return task;
  }

  async update(
    ownerId: string,
    id: string,
    input: UpdateTaskRecord
  ): Promise<Task | null> {
    const index = this.tasks.findIndex(
      (task) => task.id === id && task.ownerId === ownerId
    );
    const currentTask = this.tasks[index];

    if (currentTask === undefined) {
      return null;
    }

    const updateTask: Task = {
      ...currentTask,
      ...input,
      updatedAt: new Date().toISOString(),
    };

    this.tasks[index] = updateTask;

    return updateTask;
  }

  async findById(ownerId: string, id: string): Promise<Task | null> {
    return (
      this.tasks.find((task) => task.id === id && task.ownerId === ownerId) ??
      null
    );
  }

  async delete(ownerId: string, id: string): Promise<boolean> {
    const index = this.tasks.findIndex(
      (task) => task.id === id && task.ownerId === ownerId
    );

    if (index === -1) {
      return false;
    }

    this.tasks.splice(index, 1);

    return true;
  }
}
