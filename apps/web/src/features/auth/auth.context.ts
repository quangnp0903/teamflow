import { createContext } from 'react';

import type { AuthState } from './auth.types';

export type AuthContextValue = Readonly<{
  state: AuthState;
}>;

export const AuthContext = createContext<AuthContextValue | undefined>(
  undefined
);
