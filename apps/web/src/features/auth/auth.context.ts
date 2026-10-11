import { createContext } from 'react';

import type { AuthState, LoginInput, RegisterInput } from './auth.types';

export type AuthContextValue = Readonly<{
  state: AuthState;
  login(input: LoginInput): Promise<void>;
  logout(): Promise<void>;
  register(input: RegisterInput): Promise<void>;
}>;

export const AuthContext = createContext<AuthContextValue | undefined>(
  undefined
);
