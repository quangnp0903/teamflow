import {
  Prisma,
  type PrismaClient,
  type Task as PrismaTask,
} from '../../generated/prisma/client.ts';

import type { Task } from './task.model.ts';

import type {
  CreateTaskRecord,
  ListTasksQuery,
  TaskPage,
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

  async list(query: ListTasksQuery): Promise<TaskPage> {
    const where: Prisma.TaskWhereInput = {};

    if (query.status !== undefined) {
      where.status = query.status;
    }

    if (query.search !== undefined) {
      where.OR = [
        {
          title: {
            contains: query.search,
            mode: 'insensitive',
          },
        },
        {
          description: {
            contains: query.search,
            mode: 'insensitive',
          },
        },
      ];
    }

    const offset = (query.page - 1) * query.pageSize;

    const [tasks, total] = await this.client.$transaction([
      this.client.task.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: offset,
        take: query.pageSize,
      }),
      this.client.task.count({ where }),
    ]);

    return { items: tasks.map(toDomainTask), total };
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
