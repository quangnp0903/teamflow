import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  getCurrentUser,
  loginUser,
  logoutUser,
  registerUser,
} from './auth.api';
import type { AuthUser, LoginInput, RegisterInput } from './auth.types';

const TEST_USER = {
  id: '00000000-0000-4000-8000-000000000001',
  email: 'alice@example.com',
  displayName: 'Alice Nguyen',
  createdAt: '2026-10-01T00:00:00.000Z',
  updatedAt: '2026-10-01T00:00:00.000Z',
} satisfies AuthUser;

function stubJsonResponse(body: unknown, status = 200) {
  const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
    new Response(JSON.stringify(body), {
      status,
      headers: {
        'Content-Type': 'application/json',
      },
    })
  );

  vi.stubGlobal('fetch', fetchMock);

  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('auth API', () => {
  it('registers a user with a credentialed JSON request', async () => {
    const input = {
      email: TEST_USER.email,
      displayName: TEST_USER.displayName,
      password: 'correct horse battery staple',
    } satisfies RegisterInput;

    const fetchMock = stubJsonResponse({ data: TEST_USER }, 201);

    const result = await registerUser(input);

    expect(fetchMock).toHaveBeenCalledWith('/api/auth/register', {
      method: 'POST',
      credentials: 'include',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(input),
    });

    expect(result).toEqual(TEST_USER);
  });

  it('logs in with a credentialed JSON request', async () => {
    const input = {
      email: TEST_USER.email,
      password: 'correct horse battery staple',
    } satisfies LoginInput;

    const fetchMock = stubJsonResponse({ data: TEST_USER });

    const result = await loginUser(input);

    expect(fetchMock).toHaveBeenCalledWith('/api/auth/login', {
      method: 'POST',
      credentials: 'include',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(input),
    });

    expect(result).toEqual(TEST_USER);
  });

  it('returns null when the current session is unauthenticated', async () => {
    const fetchMock = stubJsonResponse(
      {
        error: {
          code: 'UNAUTHENTICATED',
          message: 'Authentication required',
        },
      },
      401
    );

    await expect(getCurrentUser()).resolves.toBeNull();

    expect(fetchMock).toHaveBeenCalledWith('/api/auth/me', {
      credentials: 'include',
      headers: {
        Accept: 'application/json',
      },
    });
  });

  it('does not hide a server failure as an unauthenticated session', async () => {
    stubJsonResponse(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred',
        },
      },
      500
    );

    await expect(getCurrentUser()).rejects.toMatchObject({
      name: 'ApiError',
      statusCode: 500,
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
    });
  });

  it('logs out without parsing an empty response', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(null, { status: 204 }));

    vi.stubGlobal('fetch', fetchMock);

    await expect(logoutUser()).resolves.toBeUndefined();

    expect(fetchMock).toHaveBeenCalledWith('/api/auth/logout', {
      method: 'POST',
      credentials: 'include',
      headers: {
        Accept: 'application/json',
      },
    });
  });
});
