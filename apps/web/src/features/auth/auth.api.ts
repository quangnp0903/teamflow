import { ApiError, request, requestJson } from 'src/lib/http';

import type {
  AuthUser,
  AuthUserResponse,
  LoginInput,
  RegisterInput,
} from './auth.types';

export async function registerUser(input: RegisterInput): Promise<AuthUser> {
  const response = await requestJson<AuthUserResponse>('/api/auth/register', {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });

  return response.data;
}

export async function loginUser(input: LoginInput): Promise<AuthUser> {
  const response = await requestJson<AuthUserResponse>('/api/auth/login', {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });

  return response.data;
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    const response = await requestJson<AuthUserResponse>('/api/auth/me', {
      credentials: 'include',
    });

    return response.data;
  } catch (error) {
    if (error instanceof ApiError && error.statusCode === 401) {
      return null;
    }

    throw error;
  }
}

export async function logoutUser(): Promise<void> {
  await request('/api/auth/logout', {
    method: 'POST',
    credentials: 'include',
  });
}
