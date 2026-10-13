import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';

import { InMemoryTaskRepository } from './modules/tasks/in-memory-task.repository.ts';
import { FakePasswordHasher } from './modules/auth/fake-password-hasher.ts';
import { InMemoryUserRepository } from './modules/users/in-memory-user.repository.ts';
import { createApp } from './app.ts';
import { FakeSessionTokenManager } from './modules/auth/fake-session-token-manager.ts';
import { InMemorySessionRepository } from './modules/sessions/in-memory-session.repository.ts';
import { InMemoryWorkspaceRepository } from './modules/workspaces/in-memory-workspace.repository.ts';
import type { WorkspaceRepository } from './modules/workspaces/workspace.repository.ts';

const TEST_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:4173',
] as const;

const TEST_ORIGIN = TEST_ORIGINS[0];

function createTestApp(
  workspaceRepository: WorkspaceRepository = new InMemoryWorkspaceRepository()
) {
  return createApp({
    taskRepository: new InMemoryTaskRepository(),
    workspaceRepository,
    userRepository: new InMemoryUserRepository(),
    sessionRepository: new InMemorySessionRepository(),
    passwordHasher: new FakePasswordHasher(),
    sessionTokenManager: new FakeSessionTokenManager(),
    secureSessionCookie: false,
    trustedOrigins: TEST_ORIGINS,
  });
}

function browserRequest(
  app: ReturnType<typeof createApp>,
  origin: string = TEST_ORIGIN
) {
  return request.agent(app).set('Origin', origin);
}

async function authenticatedBrowserRequest(
  app: ReturnType<typeof createApp>,
  origin: string = TEST_ORIGIN,
  email: string = 'task-owner@example.com'
) {
  const agent = browserRequest(app, origin);

  const registrationInput = {
    email,
    displayName: 'Task Owner',
    password: 'Strong test password 123!',
  };

  await agent.post('/api/auth/register').send(registrationInput).expect(201);

  await agent
    .post('/api/auth/login')
    .send({
      email: registrationInput.email,
      password: registrationInput.password,
    })
    .expect(200);

  return agent;
}

describe('task API authentication', () => {
  const taskPath = '/api/tasks/00000000-0000-4000-8000-000000000000';

  it.each([
    { method: 'get', path: '/api/tasks' },
    { method: 'post', path: '/api/tasks' },
    { method: 'get', path: taskPath },
    { method: 'patch', path: taskPath },
    { method: 'delete', path: taskPath },
  ] as const)('rejects anonymous $method $path', async ({ method, path }) => {
    const app = createTestApp();

    // Trusted origin, but no authenticated session.
    const response = await browserRequest(app)[method](path);

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      error: {
        code: 'UNAUTHENTICATED',
        message: 'Authentication required',
      },
    });
  });
});

describe('task API', () => {
  it('creates a task and returns it from the list endpoint', async () => {
    const app = createTestApp();
    const agent = await authenticatedBrowserRequest(app);

    const createResponse = await agent.post('/api/tasks').send({
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

    const listResponse = await agent.get('/api/tasks');

    expect(listResponse.status).toBe(200);
    expect(listResponse.body.data).toEqual([createResponse.body.data]);

    const meResponse = await agent.get('/api/auth/me').expect(200);

    expect(createResponse.body.data.ownerId).toBe(meResponse.body.data.id);
  });

  it('rejects an invalid task payload', async () => {
    const app = createTestApp();
    const agent = await authenticatedBrowserRequest(app);

    const response = await agent.post('/api/tasks').send({
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
    const agent = await authenticatedBrowserRequest(app);

    const response = await agent.get('/api/unknown');

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
    const agent = await authenticatedBrowserRequest(app);

    const createResponse = await agent.post('/api/tasks').send({
      title: 'Original title',
      description: 'Original description',
    });

    const response = await agent
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
    const agent = await authenticatedBrowserRequest(app);

    const createResponse = await agent.post('/api/tasks').send({
      title: 'Unchanged task',
    });

    const response = await agent
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
    const agent = await authenticatedBrowserRequest(app);

    const createResponse = await agent.post('/api/tasks').send({
      title: 'Status validation',
    });

    const response = await agent
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
    const agent = await authenticatedBrowserRequest(app);

    const response = await agent
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
    const agent = await authenticatedBrowserRequest(app);

    const createResponse = await agent.post('/api/tasks').send({
      title: 'Implement task lookup',
    });

    const response = await agent.get(
      `/api/tasks/${createResponse.body.data.id}`
    );

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual(createResponse.body.data);
  });

  it('returns a typed error when a task does not exist', async () => {
    const app = createTestApp();
    const agent = await authenticatedBrowserRequest(app);

    const response = await agent.get(
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
    const agent = await authenticatedBrowserRequest(app);

    const response = await agent.get('/api/tasks/not-a-uuid');

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
    const agent = await authenticatedBrowserRequest(app);

    await agent.post('/api/tasks').send({
      title: 'Todo task',
    });

    const createResponse = await agent.post('/api/tasks').send({
      title: 'Active task',
    });

    await agent.patch(`/api/tasks/${createResponse.body.data.id}`).send({
      status: 'in_progress',
    });

    const response = await agent.get('/api/tasks?status=in_progress');

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0]).toMatchObject({
      title: 'Active task',
      status: 'in_progress',
    });
  });

  it('searches task titles and descriptions', async () => {
    const app = createTestApp();
    const agent = await authenticatedBrowserRequest(app);

    await agent.post('/api/tasks').send({
      title: 'Design database schema',
    });

    await agent.post('/api/tasks').send({
      title: 'Build dashboard',
      description: 'Connect the React application',
    });

    const response = await agent.get('/api/tasks?search=DATABASE');

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].title).toBe('Design database schema');
  });

  it('returns a paginated task collection', async () => {
    const app = createTestApp();
    const agent = await authenticatedBrowserRequest(app);

    for (const title of ['Task one', 'Task two', 'Task three']) {
      await agent.post('/api/tasks').send({ title });
    }

    const firstPage = await agent.get('/api/tasks?page=1&pageSize=2');

    expect(firstPage.status).toBe(200);
    expect(firstPage.body.data).toHaveLength(2);
    expect(firstPage.body.meta).toEqual({
      page: 1,
      pageSize: 2,
      total: 3,
      totalPages: 2,
    });

    const secondPage = await agent.get('/api/tasks?page=2&pageSize=2');

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
    const agent = await authenticatedBrowserRequest(app);

    const response = await agent.get('/api/tasks?page=0');

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
    const agent = await authenticatedBrowserRequest(app);

    const createResponse = await agent.post('/api/tasks').send({
      title: 'Delete this task',
    });

    const taskId = createResponse.body.data.id;

    const deleteResponse = await agent.delete(`/api/tasks/${taskId}`);

    expect(deleteResponse.status).toBe(204);
    expect(deleteResponse.text).toBe('');

    const lookupResponse = await agent.get(`/api/tasks/${taskId}`);

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
    const agent = await authenticatedBrowserRequest(app);

    const response = await agent.delete(
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
    const agent = await authenticatedBrowserRequest(app);

    const response = await agent.delete('/api/tasks/not-a-uuid');

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

  it('lists only the authenticated user’s tasks and totals', async () => {
    const app = createTestApp();

    const alice = await authenticatedBrowserRequest(
      app,
      TEST_ORIGIN,
      'alice@example.com'
    );

    const bob = await authenticatedBrowserRequest(
      app,
      TEST_ORIGIN,
      'bob@example.com'
    );

    const aliceTask = await alice
      .post('/api/tasks')
      .send({ title: 'Shared Alice task' })
      .expect(201);

    const bobTask = await bob
      .post('/api/tasks')
      .send({ title: 'Shared Bob task' })
      .expect(201);

    const path = '/api/tasks?search=Shared&status=todo&page=1&pageSize=1';

    const aliceList = await alice.get(path).expect(200);
    const bobList = await bob.get(path).expect(200);

    expect(aliceList.body.data).toEqual([aliceTask.body.data]);
    expect(bobList.body.data).toEqual([bobTask.body.data]);

    const expectedMeta = {
      page: 1,
      pageSize: 1,
      total: 1,
      totalPages: 1,
    };

    expect(aliceList.body.meta).toEqual(expectedMeta);
    expect(bobList.body.meta).toEqual(expectedMeta);
  });

  it('returns a task only to its owner', async () => {
    const app = createTestApp();

    const alice = await authenticatedBrowserRequest(
      app,
      TEST_ORIGIN,
      'alice@example.com'
    );

    const bob = await authenticatedBrowserRequest(
      app,
      TEST_ORIGIN,
      'bob@example.com'
    );

    const created = await alice
      .post('/api/tasks')
      .send({ title: 'Alice private task' })
      .expect(201);

    const path = `/api/tasks/${created.body.data.id}`;

    const ownerResponse = await alice.get(path).expect(200);

    expect(ownerResponse.body.data).toEqual(created.body.data);

    const otherUserResponse = await bob.get(path).expect(404);

    expect(otherUserResponse.body).toEqual({
      error: {
        code: 'TASK_NOT_FOUND',
        message: 'Task not found',
      },
    });
  });

  it('allows updates only by the task owner', async () => {
    const app = createTestApp();

    const alice = await authenticatedBrowserRequest(
      app,
      TEST_ORIGIN,
      'alice@example.com'
    );

    const bob = await authenticatedBrowserRequest(
      app,
      TEST_ORIGIN,
      'bob@example.com'
    );

    const created = await alice
      .post('/api/tasks')
      .send({
        title: 'Alice private task',
        description: 'Original description',
      })
      .expect(201);

    const path = `/api/tasks/${created.body.data.id}`;

    const denied = await bob
      .patch(path)
      .send({
        title: 'Unauthorized change',
        status: 'done',
      })
      .expect(404);

    expect(denied.body).toEqual({
      error: {
        code: 'TASK_NOT_FOUND',
        message: 'Task not found',
      },
    });

    const unchanged = await alice.get(path).expect(200);

    expect(unchanged.body.data).toEqual(created.body.data);

    const updated = await alice
      .patch(path)
      .send({ status: 'in_progress' })
      .expect(200);

    expect(updated.body.data).toMatchObject({
      id: created.body.data.id,
      ownerId: created.body.data.ownerId,
      title: 'Alice private task',
      description: 'Original description',
      status: 'in_progress',
    });
  });

  it('allows deletion only by the task owner', async () => {
    const app = createTestApp();

    const alice = await authenticatedBrowserRequest(
      app,
      TEST_ORIGIN,
      'alice@example.com'
    );

    const bob = await authenticatedBrowserRequest(
      app,
      TEST_ORIGIN,
      'bob@example.com'
    );

    const created = await alice
      .post('/api/tasks')
      .send({ title: 'Alice private task' })
      .expect(201);

    const path = `/api/tasks/${created.body.data.id}`;

    const denied = await bob.delete(path).expect(404);

    expect(denied.body).toEqual({
      error: {
        code: 'TASK_NOT_FOUND',
        message: 'Task not found',
      },
    });

    const unchanged = await alice.get(path).expect(200);

    expect(unchanged.body.data).toEqual(created.body.data);

    const deleted = await alice.delete(path).expect(204);

    expect(deleted.text).toBe('');

    await alice.get(path).expect(404);
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

    const response = await browserRequest(app)
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

    const response = await browserRequest(app)
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

    const firstResponse = await browserRequest(app)
      .post('/api/auth/register')
      .send(registrationInput);

    expect(firstResponse.status).toBe(201);

    const duplicateResponse = await browserRequest(app)
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

    await browserRequest(app)
      .post('/api/auth/register')
      .send(registrationInput);

    const response = await browserRequest(app).post('/api/auth/login').send({
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

    await browserRequest(app)
      .post('/api/auth/register')
      .send(registrationInput);

    const response = await browserRequest(app).post('/api/auth/login').send({
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

  it('returns the authenticated user from the session cookie', async () => {
    const app = createTestApp();
    const agent = browserRequest(app);

    await agent.post('/api/auth/register').send(registrationInput);

    const loginResponse = await agent.post('/api/auth/login').send({
      email: registrationInput.email,
      password: registrationInput.password,
    });

    expect(loginResponse.status).toBe(200);

    const response = await agent.get('/api/auth/me');

    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({
      email: registrationInput.email,
      displayName: registrationInput.displayName,
    });
    expect(response.body.data).not.toHaveProperty('passwordHash');
  });

  it('rejects the current-user request without a valid session cookie', async () => {
    const app = createTestApp();

    const response = await browserRequest(app).get('/api/auth/me');

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      error: {
        code: 'UNAUTHENTICATED',
        message: 'Authentication required',
      },
    });
  });

  it('logs out, clears the cookie, and rejects reuse of the old session', async () => {
    const app = createTestApp();
    const agent = browserRequest(app);

    await agent.post('/api/auth/register').send(registrationInput);

    const loginResponse = await agent.post('/api/auth/login').send({
      email: registrationInput.email,
      password: registrationInput.password,
    });

    expect(loginResponse.status).toBe(200);

    // Save the original cookie to test session revocation later.
    const sessionCookie =
      loginResponse.headers['set-cookie']?.[0]?.split(';')[0];

    if (sessionCookie === undefined) {
      throw new Error('Expected login to set a session cookie');
    }

    const logoutResponse = await agent.post('/api/auth/logout');

    expect(logoutResponse.status).toBe(204);
    expect(logoutResponse.text).toBe('');

    const clearedCookie = logoutResponse.headers['set-cookie']?.[0];

    expect(clearedCookie).toContain('teamflow_session=;');
    expect(clearedCookie).toContain('Path=/');
    expect(clearedCookie).toContain('Expires=Thu, 01 Jan 1970');

    // The browser no longer has an authenticated session.
    const meResponse = await agent.get('/api/auth/me');

    expect(meResponse.status).toBe(401);

    // Even a copied cookie must fail after server-side revocation.
    const replayResponse = await agent
      .get('/api/auth/me')
      .set('Cookie', sessionCookie);

    expect(replayResponse.status).toBe(401);
    expect(replayResponse.body.error.code).toBe('UNAUTHENTICATED');
  });

  it('allows repeated logout without an active session', async () => {
    const app = createTestApp();

    const firstResponse = await browserRequest(app).post('/api/auth/logout');

    const secondResponse = await browserRequest(app).post('/api/auth/logout');

    expect(firstResponse.status).toBe(204);
    expect(secondResponse.status).toBe(204);
  });

  describe('API origin protection', () => {
    it.each([
      { caseName: 'missing origin', origin: undefined },
      {
        caseName: 'untrusted origin',
        origin: 'https://untrusted.example',
      },
    ])('blocks a mutation with $caseName', async ({ origin }) => {
      const app = createTestApp();
      const agent = await authenticatedBrowserRequest(app);

      const mutation = agent
        .post('/api/tasks')
        .unset('Origin')
        .send({ title: 'This must not be created' });

      if (origin !== undefined) {
        mutation.set('Origin', origin);
      }

      const response = await mutation;

      expect(response.status).toBe(403);
      expect(response.body.error.code).toBe('UNTRUSTED_ORIGIN');

      const listResponse = await agent.get('/api/tasks');

      expect(listResponse.status).toBe(200);
      expect(listResponse.body.data).toEqual([]);
    });

    it('accepts the second configured origin', async () => {
      const app = createTestApp();
      const agent = await authenticatedBrowserRequest(app, TEST_ORIGINS[1]);

      const response = await agent.post('/api/tasks').send({
        title: 'Task from the second frontend',
      });

      expect(response.status).toBe(201);
    });
  });
});

describe('API CORS', () => {
  it.each(TEST_ORIGINS)(
    'allows credentialed responses for %s',
    async (origin) => {
      const app = createTestApp();

      const response = await request(app)
        .get('/api/health')
        .set('Origin', origin);

      expect(response.status).toBe(200);
      expect(response.headers['access-control-allow-origin']).toBe(origin);
      expect(response.headers['access-control-allow-credentials']).toBe('true');
      expect(response.headers.vary).toContain('Origin');
    }
  );

  it('handles a JSON POST preflight from a trusted origin', async () => {
    const app = createTestApp();

    const response = await request(app)
      .options('/api/tasks')
      .set('Origin', TEST_ORIGIN)
      .set('Access-Control-Request-Method', 'POST')
      .set('Access-Control-Request-Headers', 'content-type');

    expect(response.status).toBe(204);
    expect(response.headers['access-control-allow-origin']).toBe(TEST_ORIGIN);
    expect(response.headers['access-control-allow-credentials']).toBe('true');
    expect(
      (response.headers['access-control-allow-methods'] ?? '').split(',')
    ).toContain('POST');
    expect(
      (response.headers['access-control-allow-headers'] ?? '').toLowerCase()
    ).toBe('content-type');
  });

  it('does not grant CORS access to an untrusted origin', async () => {
    const app = createTestApp();

    const response = await request(app)
      .get('/api/health')
      .set('Origin', 'https://untrusted.example');

    expect(response.status).toBe(200);
    expect(response.headers['access-control-allow-origin']).toBeUndefined();
  });
});

describe('workspace API', () => {
  it('rejects anonymous workspace creation', async () => {
    const app = createTestApp();

    const response = await browserRequest(app)
      .post('/api/workspaces')
      .send({ name: 'Product Team' });

    expect(response.status).toBe(401);
    expect(response.body).toMatchObject({
      error: {
        code: 'UNAUTHENTICATED',
      },
    });
  });

  it('creates a normalized workspace for the authenticated user', async () => {
    const repository = new InMemoryWorkspaceRepository();
    const createWithOwner = vi.spyOn(repository, 'createWithOwner');
    const app = createTestApp(repository);
    const agent = await authenticatedBrowserRequest(app);

    const meResponse = await agent.get('/api/auth/me').expect(200);

    const response = await agent
      .post('/api/workspaces')
      .send({ name: '  Product Team  ' });

    expect(response.status).toBe(201);
    expect(response.body.data).toMatchObject({
      id: expect.any(String),
      name: 'Product Team',
      createdAt: expect.any(String),
      updatedAt: expect.any(String),
    });

    expect(createWithOwner).toHaveBeenCalledTimes(1);
    expect(createWithOwner).toHaveBeenCalledWith({
      name: 'Product Team',
      ownerId: meResponse.body.data.id,
    });
  });

  it.each([
    {
      caseName: 'a blank name',
      input: { name: '   ' },
    },
    {
      caseName: 'an oversized name',
      input: { name: 'x'.repeat(121) },
    },
    {
      caseName: 'a client-supplied owner',
      input: {
        name: 'Product Team',
        ownerId: '00000000-0000-4000-8000-000000000000',
      },
    },
    {
      caseName: 'a client-supplied role',
      input: {
        name: 'Product Team',
        role: 'admin',
      },
    },
  ])('rejects $caseName without calling storage', async ({ input }) => {
    const repository = new InMemoryWorkspaceRepository();
    const createWithOwner = vi.spyOn(repository, 'createWithOwner');
    const app = createTestApp(repository);
    const agent = await authenticatedBrowserRequest(app);

    const response = await agent.post('/api/workspaces').send(input);

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      error: {
        code: 'VALIDATION_ERROR',
      },
    });

    expect(createWithOwner).not.toHaveBeenCalled();
  });
});
