import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getCurrentUser } from './auth.api';
import type { AuthUser } from './auth.types';
import AuthProvider from './AuthProvider';
import useAuth from './useAuth';

vi.mock('./auth.api', () => ({
  getCurrentUser: vi.fn(),
  loginUser: vi.fn(),
  logoutUser: vi.fn(),
}));

const getCurrentUserMock = vi.mocked(getCurrentUser);

const TEST_USER = {
  id: '00000000-0000-4000-8000-000000000001',
  email: 'alice@example.com',
  displayName: 'Alice Nguyen',
  createdAt: '2026-10-01T00:00:00.000Z',
  updatedAt: '2026-10-01T00:00:00.000Z',
} satisfies AuthUser;

function SessionStatus() {
  const { state } = useAuth();

  if (state.status === 'authenticated') {
    return <p>{state.user.displayName}</p>;
  }

  return <p>{state.status}</p>;
}

beforeEach(() => {
  getCurrentUserMock.mockReset();
});

describe('AuthProvider', () => {
  it('shares one session check between multiple consumers', async () => {
    getCurrentUserMock.mockResolvedValue(TEST_USER);

    render(
      <AuthProvider>
        <SessionStatus />
        <SessionStatus />
      </AuthProvider>,
      { reactStrictMode: false }
    );

    expect(screen.getAllByText('loading')).toHaveLength(2);

    await waitFor(() => {
      expect(screen.getAllByText(TEST_USER.displayName)).toHaveLength(2);
    });

    expect(getCurrentUserMock).toHaveBeenCalledTimes(1);
  });

  it('throws a clear error when used outside the provider', () => {
    expect(() => render(<SessionStatus />)).toThrow(
      'useAuth must be used within AuthProvider'
    );
  });
});
