import type { ReactNode } from 'react';

import { AuthContext } from './auth.context';
import useAuthSession from './useAuthSession';

type AuthProviderProps = Readonly<{
  children: ReactNode;
}>;

function AuthProvider({ children }: AuthProviderProps) {
  const session = useAuthSession();

  return <AuthContext value={session}>{children}</AuthContext>;
}

export default AuthProvider;
