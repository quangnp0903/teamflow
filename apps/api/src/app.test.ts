import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { InMemoryTaskRepository } from './modules/tasks/in-memory-task.repository.ts';
import { createApp } from './app.ts';

function createTestApp() {
  return createApp({ taskRepository: new InMemoryTaskRepository() });
}

describe('task API', () => {
  it('creates a task and returns it from the list endpoint', async () => {
    const app = createTestApp();

    const createResponse = await request(app).post('/api/tasks').send({
      title: 'Design task module',
      description: 'Learn backend boundaries',
    });

    expect(createResponse.status).toBe(201);
    expect(createResponse.body.data).toMatchObject({
      title: 'Design task module',
      description: 'Learn backend boundaries',
      status: 'todo',
    });

    expect(createResponse.body.data.id).toEqual(expect.any(String));

    const listResponse = await request(app).get('/api/tasks');

    expect(listResponse.status).toBe(200);
    expect(listResponse.body.data).toEqual([createResponse.body.data]);
  });

  it('rejects an invalid task payload', async () => {
    const app = createTestApp();

    const response = await request(app).post('/api/tasks').send({
      title: '',
    });

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: [
          {
            path: 'title',
          },
        ],
      },
    });
  });

  it('returns a stable error for an unknown route', async () => {
    const app = createTestApp();

    const response = await request(app).get('/api/unknown');

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      error: {
        code: 'NOT_FOUND',
        message: 'Route not found',
      },
    });
  });

  it('partially updates a task and preserves omitted fields', async () => {
    const app = createTestApp();

    const createResponse = await request(app).post('/api/tasks').send({
      title: 'Original title',
      description: 'Original description',
    });

    const response = await request(app)
      .patch(`/api/tasks/${createResponse.body.data.id}`)
      .send({
        description: null,
        status: 'in_progress',
      });

    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({
      id: createResponse.body.data.id,
      title: 'Original title',
      description: null,
      status: 'in_progress',
    });
  });

  it('rejects an empty task update', async () => {
    const app = createTestApp();

    const createResponse = await request(app).post('/api/tasks').send({
      title: 'Unchanged task',
    });

    const response = await request(app)
      .patch(`/api/tasks/${createResponse.body.data.id}`)
      .send({});

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      error: {
        code: 'VALIDATION_ERROR',
      },
    });
  });

  it('rejects an invalid task status', async () => {
    const app = createTestApp();

    const createResponse = await request(app).post('/api/tasks').send({
      title: 'Status validation',
    });

    const response = await request(app)
      .patch(`/api/tasks/${createResponse.body.data.id}`)
      .send({
        status: 'finished',
      });

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      error: {
        code: 'VALIDATION_ERROR',
      },
    });
  });

  it('returns not found when updating a missing task', async () => {
    const app = createTestApp();

    const response = await request(app)
      .patch('/api/tasks/00000000-0000-4000-8000-000000000000')
      .send({
        title: 'Updated title',
      });

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      error: {
        code: 'TASK_NOT_FOUND',
        message: 'Task not found',
      },
    });
  });

  it('returns a task by ID', async () => {
    const app = createTestApp();

    const createResponse = await request(app).post('/api/tasks').send({
      title: 'Implement task lookup',
    });

    const response = await request(app).get(
      `/api/tasks/${createResponse.body.data.id}`
    );

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual(createResponse.body.data);
  });

  it('returns a typed error when a task does not exist', async () => {
    const app = createTestApp();

    const response = await request(app).get(
      '/api/tasks/00000000-0000-4000-8000-000000000000'
    );

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      error: {
        code: 'TASK_NOT_FOUND',
        message: 'Task not found',
      },
    });
  });

  it('rejects a malformed task ID', async () => {
    const app = createTestApp();

    const response = await request(app).get('/api/tasks/not-a-uuid');

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      error: {
        code: 'VALIDATION_ERROR',
        details: [
          {
            path: 'taskId',
          },
        ],
      },
    });
  });

  it('filters tasks by status', async () => {
    const app = createTestApp();

    await request(app).post('/api/tasks').send({
      title: 'Todo task',
    });

    const createResponse = await request(app).post('/api/tasks').send({
      title: 'Active task',
    });

    await request(app).patch(`/api/tasks/${createResponse.body.data.id}`).send({
      status: 'in_progress',
    });

    const response = await request(app).get('/api/tasks?status=in_progress');

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0]).toMatchObject({
      title: 'Active task',
      status: 'in_progress',
    });
  });

  it('searches task titles and descriptions', async () => {
    const app = createTestApp();

    await request(app).post('/api/tasks').send({
      title: 'Design database schema',
    });

    await request(app).post('/api/tasks').send({
      title: 'Build dashboard',
      description: 'Connect the React application',
    });

    const response = await request(app).get('/api/tasks?search=DATABASE');

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].title).toBe('Design database schema');
  });

  it('returns a paginated task collection', async () => {
    const app = createTestApp();

    for (const title of ['Task one', 'Task two', 'Task three']) {
      await request(app).post('/api/tasks').send({ title });
    }

    const firstPage = await request(app).get('/api/tasks?page=1&pageSize=2');

    expect(firstPage.status).toBe(200);
    expect(firstPage.body.data).toHaveLength(2);
    expect(firstPage.body.meta).toEqual({
      page: 1,
      pageSize: 2,
      total: 3,
      totalPages: 2,
    });

    const secondPage = await request(app).get('/api/tasks?page=2&pageSize=2');

    expect(secondPage.status).toBe(200);
    expect(secondPage.body.data).toHaveLength(1);
    expect(secondPage.body.meta).toEqual({
      page: 2,
      pageSize: 2,
      total: 3,
      totalPages: 2,
    });
  });

  it('rejects invalid pagination parameters', async () => {
    const app = createTestApp();

    const response = await request(app).get('/api/tasks?page=0');

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      error: {
        code: 'VALIDATION_ERROR',
        details: [
          {
            path: 'page',
          },
        ],
      },
    });
  });
});
