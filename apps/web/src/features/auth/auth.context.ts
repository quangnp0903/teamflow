import { createContext } from 'react';

import type { AuthState, LoginInput } from './auth.types';

export type AuthContextValue = Readonly<{
  state: AuthState;
  login(input: LoginInput): Promise<void>;
  logout(): Promise<void>;
}>;

export const AuthContext = createContext<AuthContextValue | undefined>(
  undefined
);
