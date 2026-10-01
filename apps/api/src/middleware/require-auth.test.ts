import express from 'express';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';

import { AppError } from '../lib/errors/app-error.ts';
import { SESSION_COOKIE_NAME } from '../modules/auth/auth.constants.ts';
import type { AuthService } from '../modules/auth/auth.service.ts';
import type { User } from '../modules/users/user.model.ts';
import { errorHandler } from './error-handler.ts';
import { requireAuth } from './require-auth.ts';

const TEST_USER = {
  id: 'user-1',
  email: 'alice@example.com',
  displayName: 'Alice Nguyen',
  createdAt: '2026-10-01T00:00:00.000Z',
  updatedAt: '2026-10-01T00:00:00.000Z',
} satisfies User;

function createTestApp(
  authenticator: Pick<AuthService, 'authenticateSession'>
) {
  const app = express();

  app.use(cookieParser());

  app.get('/protected', requireAuth(authenticator), (req, response) => {
    response.status(200).json({ data: req.user });
  });

  app.use(errorHandler);

  return app;
}

describe('requireAuth', () => {
  it('rejects a request without a session cookie', async () => {
    const authenticateSession = vi.fn<AuthService['authenticateSession']>();
    const app = createTestApp({ authenticateSession });

    const response = await request(app).get('/protected');

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      error: {
        code: 'UNAUTHENTICATED',
        message: 'Authentication required',
      },
    });
    expect(authenticateSession).not.toHaveBeenCalled();
  });

  it('forwards a rejected session to the error handler', async () => {
    const authenticateSession = vi
      .fn<AuthService['authenticateSession']>()
      .mockRejectedValue(
        new AppError(401, 'UNAUTHENTICATED', 'Authentication required')
      );

    const app = createTestApp({ authenticateSession });

    const response = await request(app)
      .get('/protected')
      .set('Cookie', `${SESSION_COOKIE_NAME}=invalid-test-token`);

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('UNAUTHENTICATED');
    expect(authenticateSession).toHaveBeenCalledWith('invalid-test-token');
  });

  it('exposes the authenticated user to the next handler', async () => {
    const authenticateSession = vi
      .fn<AuthService['authenticateSession']>()
      .mockResolvedValue(TEST_USER);

    const app = createTestApp({ authenticateSession });

    const response = await request(app)
      .get('/protected')
      .set('Cookie', `${SESSION_COOKIE_NAME}=valid-test-token`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ data: TEST_USER });
    expect(authenticateSession).toHaveBeenCalledExactlyOnceWith(
      'valid-test-token'
    );
  });
});
