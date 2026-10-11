import { renderHook, waitFor, act } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getCurrentUser, logoutUser } from './auth.api';
import type { AuthUser } from './auth.types';
import useAuthSession from './useAuthSession';

vi.mock('./auth.api', () => ({
  getCurrentUser: vi.fn(),
  loginUser: vi.fn(),
  logoutUser: vi.fn(),
  registerUser: vi.fn(),
}));

const getCurrentUserMock = vi.mocked(getCurrentUser);
const logoutUserMock = vi.mocked(logoutUser);

const TEST_USER = {
  id: '00000000-0000-4000-8000-000000000001',
  email: 'alice@example.com',
  displayName: 'Alice Nguyen',
  createdAt: '2026-10-01T00:00:00.000Z',
  updatedAt: '2026-10-01T00:00:00.000Z',
} satisfies AuthUser;

beforeEach(() => {
  getCurrentUserMock.mockReset();
  logoutUserMock.mockReset();
});

describe('useAuthSession', () => {
  it('starts loading and restores the authenticated user', async () => {
    getCurrentUserMock.mockResolvedValue(TEST_USER);

    const { result } = renderHook(() => useAuthSession());

    expect(result.current.state).toEqual({
      status: 'loading',
    });

    await waitFor(() => {
      expect(result.current.state).toEqual({
        status: 'authenticated',
        user: TEST_USER,
      });
    });
  });

  it('becomes unauthenticated when there is no valid session', async () => {
    getCurrentUserMock.mockResolvedValue(null);

    const { result } = renderHook(() => useAuthSession());

    await waitFor(() => {
      expect(result.current.state).toEqual({
        status: 'unauthenticated',
      });
    });
  });

  it('reports a failed session check instead of treating it as logged out', async () => {
    getCurrentUserMock.mockRejectedValue(
      new Error('Your session could not be checked')
    );

    const { result } = renderHook(() => useAuthSession());

    await waitFor(() => {
      expect(result.current.state).toEqual({
        status: 'error',
        message: 'Your session could not be checked',
      });
    });
  });

  it('becomes unauthenticated after successful logout', async () => {
    getCurrentUserMock.mockResolvedValue(TEST_USER);
    logoutUserMock.mockResolvedValue(undefined);

    const { result } = renderHook(() => useAuthSession());

    await waitFor(() => {
      expect(result.current.state).toEqual({
        status: 'authenticated',
        user: TEST_USER,
      });
    });

    await act(async () => {
      await result.current.logout();
    });

    expect(logoutUserMock).toHaveBeenCalledOnce();

    expect(result.current.state).toEqual({
      status: 'unauthenticated',
    });
  });

  it('preserves the authenticated state when logout fails', async () => {
    getCurrentUserMock.mockResolvedValue(TEST_USER);
    logoutUserMock.mockRejectedValue(new Error('Sign out failed'));

    const { result } = renderHook(() => useAuthSession());

    await waitFor(() => {
      expect(result.current.state).toEqual({
        status: 'authenticated',
        user: TEST_USER,
      });
    });

    await act(async () => {
      await expect(result.current.logout()).rejects.toThrow('Sign out failed');
    });

    expect(logoutUserMock).toHaveBeenCalledOnce();

    expect(result.current.state).toEqual({
      status: 'authenticated',
      user: TEST_USER,
    });
  });
});
