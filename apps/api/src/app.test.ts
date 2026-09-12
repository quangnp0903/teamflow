import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { createApp } from './app.ts';

describe('task API', () => {
  it('creates a task and returns it from the list endpoint', async () => {
    const app = createApp();

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
    const app = createApp();

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
    const app = createApp();

    const response = await request(app).get('/api/unknown');

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      error: {
        code: 'NOT_FOUND',
        message: 'Route not found',
      },
    });
  });
});
