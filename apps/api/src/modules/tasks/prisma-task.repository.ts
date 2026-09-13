import {
  Prisma,
  type PrismaClient,
  type Task as PrismaTask,
} from '../../generated/prisma/client.ts';

import type { Task } from './task.model.ts';

import type {
  CreateTaskRecord,
  TaskRepository,
  UpdateTaskRecord,
} from './task.repository.ts';

function toDomainTask(task: PrismaTask): Task {
  const { id, title, description, status, createdAt, updatedAt } = task;

  return {
    id,
    title,
    description,
    status,
    createdAt: createdAt.toISOString(),
    updatedAt: updatedAt.toISOString(),
  };
}

export class PrismaTaskRepository implements TaskRepository {
  private readonly client: PrismaClient;

  constructor(client: PrismaClient) {
    this.client = client;
  }

  async list(): Promise<readonly Task[]> {
    const tasks = await this.client.task.findMany({
      orderBy: {
        createdAt: 'asc',
      },
    });

    return tasks.map(toDomainTask);
  }

  async findById(id: string): Promise<Task | null> {
    const task = await this.client.task.findUnique({
      where: {
        id,
      },
    });

    return task === null ? null : toDomainTask(task);
  }

  async create(input: CreateTaskRecord): Promise<Task> {
    const task = await this.client.task.create({ data: input });

    return toDomainTask(task);
  }

  async update(id: string, input: UpdateTaskRecord): Promise<Task | null> {
    try {
      const task = await this.client.task.update({
        where: { id },
        data: input,
      });

      return toDomainTask(task);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        return null;
      }

      throw error;
    }
  }
}
