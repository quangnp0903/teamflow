import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { errorHandler } from './error-handler.ts';
import { requireTrustedOrigin } from './require-trusted-origin.ts';

const TRUSTED_ORIGINS = [
  'http://localhost:5173', // Vite development
  'http://localhost:4173', // Vite preview
] as const;

function createTestApp() {
  const app = express();

  app.use(requireTrustedOrigin(TRUSTED_ORIGINS));

  app.all('/example', (_request, response) => {
    response.status(204).end();
  });

  app.use(errorHandler);

  return app;
}

describe('requireTrustedOrigin', () => {
  it.each(['post', 'put', 'patch', 'delete'] as const)(
    'allows a trusted %s request',
    async (method) => {
      const app = createTestApp();

      const response = await request(app)
        [method]('/example')
        .set('Origin', TRUSTED_ORIGINS[0]);

      expect(response.status).toBe(204);
    }
  );

  it.each([
    'https://untrusted.example',
    'http://localhost:5174',
    'https://localhost:5173',
    'null',
  ])('rejects the origin %s', async (origin) => {
    const app = createTestApp();

    const response = await request(app).post('/example').set('Origin', origin);

    expect(response.status).toBe(403);
    expect(response.body).toEqual({
      error: {
        code: 'UNTRUSTED_ORIGIN',
        message: 'Request origin is not allowed',
      },
    });
  });

  it('rejects a mutation without an Origin header', async () => {
    const app = createTestApp();

    const response = await request(app).post('/example');

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('UNTRUSTED_ORIGIN');
  });

  it('allows a read request without an Origin header', async () => {
    const app = createTestApp();

    const response = await request(app).get('/example');

    expect(response.status).toBe(204);
  });
});
