import { useEffect, useState } from 'react';

import {
  getCurrentUser,
  loginUser,
  logoutUser,
  registerUser,
} from './auth.api';
import type { AuthState, LoginInput, RegisterInput } from './auth.types';

type UseAuthSessionResult = Readonly<{
  state: AuthState;
  login(input: LoginInput): Promise<void>;
  logout(): Promise<void>;
  register(input: RegisterInput): Promise<void>;
}>;

function useAuthSession(): UseAuthSessionResult {
  const [state, setState] = useState<AuthState>({
    status: 'loading',
  });

  useEffect(() => {
    let isCurrent = true;

    async function restoreSession() {
      try {
        const user = await getCurrentUser();

        if (!isCurrent) {
          return;
        }

        if (user === null) {
          setState({
            status: 'unauthenticated',
          });
        } else {
          setState({
            status: 'authenticated',
            user,
          });
        }
      } catch (error) {
        if (!isCurrent) {
          return;
        }

        setState({
          status: 'error',
          message:
            error instanceof Error
              ? error.message
              : 'Your session could not be checked',
        });
      }
    }

    void restoreSession();

    return () => {
      isCurrent = false;
    };
  }, []);

  async function login(input: LoginInput): Promise<void> {
    if (state.status !== 'unauthenticated') {
      throw new Error('Sign in is only available when you are logged out');
    }

    const user = await loginUser(input);

    setState({
      status: 'authenticated',
      user,
    });
  }

  async function logout(): Promise<void> {
    if (state.status !== 'authenticated') {
      throw new Error('Sign out is only available when you are signed in');
    }

    await logoutUser();

    setState({
      status: 'unauthenticated',
    });
  }

  async function register(input: RegisterInput): Promise<void> {
    if (state.status !== 'unauthenticated') {
      throw new Error('Sign up is only available when you are logged out');
    }

    await registerUser(input);
  }

  return {
    state,
    login,
    logout,
    register,
  };
}

export default useAuthSession;
