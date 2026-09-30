import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { InMemoryTaskRepository } from './modules/tasks/in-memory-task.repository.ts';
import { FakePasswordHasher } from './modules/auth/fake-password-hasher.ts';
import { InMemoryUserRepository } from './modules/users/in-memory-user.repository.ts';
import { createApp } from './app.ts';
import { FakeSessionTokenManager } from './modules/auth/fake-session-token-manager.ts';
import { InMemorySessionRepository } from './modules/sessions/in-memory-session.repository.ts';

function createTestApp() {
  return createApp({
    taskRepository: new InMemoryTaskRepository(),
    userRepository: new InMemoryUserRepository(),
    sessionRepository: new InMemorySessionRepository(),
    passwordHasher: new FakePasswordHasher(),
    sessionTokenManager: new FakeSessionTokenManager(),
    secureSessionCookie: false,
  });
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

  it('deletes an existing task', async () => {
    const app = createTestApp();

    const createResponse = await request(app).post('/api/tasks').send({
      title: 'Delete this task',
    });

    const taskId = createResponse.body.data.id;

    const deleteResponse = await request(app).delete(`/api/tasks/${taskId}`);

    expect(deleteResponse.status).toBe(204);
    expect(deleteResponse.text).toBe('');

    const lookupResponse = await request(app).get(`/api/tasks/${taskId}`);

    expect(lookupResponse.status).toBe(404);
    expect(lookupResponse.body).toEqual({
      error: {
        code: 'TASK_NOT_FOUND',
        message: 'Task not found',
      },
    });
  });

  it('returns not found when deleting a missing task', async () => {
    const app = createTestApp();

    const response = await request(app).delete(
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

  it('rejects a malformed task ID when deleting', async () => {
    const app = createTestApp();

    const response = await request(app).delete('/api/tasks/not-a-uuid');

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
});

describe('auth API', () => {
  const registrationInput = {
    email: 'alice@example.com',
    displayName: 'Alice Nguyen',
    password: 'correct horse battery staple',
  };

  it('registers a normalized public user', async () => {
    const app = createTestApp();

    const response = await request(app)
      .post('/api/auth/register')
      .send({
        ...registrationInput,
        email: '  ALICE@Example.COM  ',
        displayName: '  Alice Nguyen  ',
      });

    expect(response.status).toBe(201);
    expect(response.body.data).toMatchObject({
      email: 'alice@example.com',
      displayName: 'Alice Nguyen',
    });
    expect(response.body.data.id).toEqual(expect.any(String));
    expect(response.body.data.createdAt).toEqual(expect.any(String));
    expect(response.body.data.updatedAt).toEqual(expect.any(String));
    expect(response.body.data).not.toHaveProperty('passwordHash');
  });

  it('rejects invalid registration input', async () => {
    const app = createTestApp();

    const response = await request(app)
      .post('/api/auth/register')
      .send({
        ...registrationInput,
        password: 'too short',
      });

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: [
          {
            path: 'password',
          },
        ],
      },
    });
  });

  it('rejects a duplicate email', async () => {
    const app = createTestApp();

    const firstResponse = await request(app)
      .post('/api/auth/register')
      .send(registrationInput);

    expect(firstResponse.status).toBe(201);

    const duplicateResponse = await request(app)
      .post('/api/auth/register')
      .send({
        ...registrationInput,
        email: 'ALICE@example.com',
      });

    expect(duplicateResponse.status).toBe(409);
    expect(duplicateResponse.body).toEqual({
      error: {
        code: 'EMAIL_ALREADY_REGISTERED',
        message: 'An account with this email already exists',
      },
    });
  });

  it('logs in and sets an HTTP-only session cookie', async () => {
    const app = createTestApp();

    await request(app).post('/api/auth/register').send(registrationInput);

    const response = await request(app).post('/api/auth/login').send({
      email: '  ALICE@Example.COM  ',
      password: registrationInput.password,
    });

    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({
      email: 'alice@example.com',
      displayName: registrationInput.displayName,
    });
    expect(response.body.data).not.toHaveProperty('passwordHash');
    expect(response.body).not.toHaveProperty('session');

    const sessionCookies = response.headers['set-cookie'];

    expect(sessionCookies).toHaveLength(1);
    expect(sessionCookies?.[0]).toContain(
      'teamflow_session=test-session-token-1'
    );
    expect(sessionCookies?.[0]).toContain('HttpOnly');
    expect(sessionCookies?.[0]).toContain('SameSite=Lax');
    expect(sessionCookies?.[0]).toContain('Path=/');
    expect(sessionCookies?.[0]).toContain('Expires=');
    expect(sessionCookies?.[0]).not.toContain('Secure');
  });

  it('rejects invalid credentials without setting a cookie', async () => {
    const app = createTestApp();

    await request(app).post('/api/auth/register').send(registrationInput);

    const response = await request(app).post('/api/auth/login').send({
      email: registrationInput.email,
      password: 'incorrect password',
    });

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      error: {
        code: 'INVALID_CREDENTIALS',
        message: 'Email or password is incorrect',
      },
    });
    expect(response.headers['set-cookie']).toBeUndefined();
  });
});
